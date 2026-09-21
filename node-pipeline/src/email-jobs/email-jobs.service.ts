import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  type EmailJobMessage,
  type SubmitEmailJobBody,
} from '../contracts/index.js';
import {
  MetricsService,
  PinoLoggerService,
  RedisService,
} from '../infra/index.js';
import {
  toEmailJobResponse,
  type EmailJobResponse,
} from './dto/email-job-response.dto.js';
import {
  type EmailJobRecord,
  JOB_PUBLISHER,
  JOB_REPOSITORY,
  type JobPublisher,
  type JobRepository,
} from './ports.js';

const IDEMPOTENCY_TTL_SECONDS = 86_400;

@Injectable()
export class EmailJobsService {
  constructor(
    @Inject(JOB_REPOSITORY) private readonly repository: JobRepository,
    @Inject(JOB_PUBLISHER) private readonly publisher: JobPublisher,
    private readonly redis: RedisService,
    private readonly logger: PinoLoggerService,
    private readonly metrics: MetricsService,
  ) {}

  async submit(
    idempotencyKey: string,
    body: SubmitEmailJobBody,
  ): Promise<EmailJobResponse> {
    const jobId = randomUUID();
    const key = `idem:${idempotencyKey}`;
    const acquired = await this.redis.redis.set(
      key,
      jobId,
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
      'NX',
    );

    if (!acquired) {
      const existingId = await this.redis.redis.get(key);
      const job = existingId
        ? await this.repository.findById(existingId)
        : null;
      if (job) {
        return toEmailJobResponse(job, true);
      }
      throw new ConflictException(
        'a request with this idempotency key is already in progress',
      );
    }

    const provider = body.provider ?? 'smtp';
    await this.repository.create({
      id: jobId,
      idempotencyKey,
      tenantId: body.tenantId,
      from: body.from,
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
      provider,
    });

    const message: EmailJobMessage = {
      jobId,
      tenantId: body.tenantId,
      provider,
      attempt: 0,
      publishedAt: Date.now(),
      from: body.from,
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    };

    try {
      await this.publisher.publish(message);
      await this.repository.markPublished(jobId);
      this.metrics.jobsSubmitted.inc();
    } catch (error) {
      await this.redis.redis.del(key);
      this.logger.error(
        `publish failed for job ${jobId}: ${String(error)}`,
        undefined,
        'EmailJobsService',
      );
      throw new ServiceUnavailableException(
        'submission failed, retry with the same idempotency key',
      );
    }

    const job = await this.repository.findById(jobId);
    return toEmailJobResponse(job!, false);
  }

  async getStatus(id: string): Promise<EmailJobResponse> {
    const job = await this.repository.findById(id);
    if (!job) {
      throw new NotFoundException('email job not found');
    }
    return toEmailJobResponse(job, false);
  }
}
