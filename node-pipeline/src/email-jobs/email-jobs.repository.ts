import { Injectable } from '@nestjs/common';
import { ApiPrismaService } from '../infra/index.js';
import {
  JOB_REPOSITORY,
  type CreateJobInput,
  type EmailJobRecord,
  type JobRepository,
} from './ports.js';

@Injectable()
export class EmailJobsRepository implements JobRepository {
  constructor(private readonly prisma: ApiPrismaService) {}

  async create(input: CreateJobInput): Promise<EmailJobRecord> {
    const job = await this.prisma.emailJob.create({ data: input });
    return toRecord(job);
  }

  async findById(id: string): Promise<EmailJobRecord | null> {
    const job = await this.prisma.emailJob.findUnique({ where: { id } });
    return job ? toRecord(job) : null;
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.emailJob.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async markDelivered(id: string): Promise<void> {
    await this.prisma.emailJob.updateMany({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        lastErrorCode: null,
      },
    });
  }

  async markRetryScheduled(id: string): Promise<void> {
    await this.prisma.emailJob.updateMany({
      where: { id },
      data: { status: 'RETRY_SCHEDULED' },
    });
  }

  async markDeadLettered(id: string, errorCode?: string): Promise<void> {
    await this.prisma.emailJob.updateMany({
      where: { id },
      data: { status: 'DEAD_LETTERED', lastErrorCode: errorCode },
    });
  }
}

function toRecord(job: {
  id: string;
  idempotencyKey: string;
  status: string;
  createdAt: Date;
}): EmailJobRecord {
  return {
    id: job.id,
    idempotencyKey: job.idempotencyKey,
    status: job.status,
    createdAt: job.createdAt,
  };
}

export const JOB_REPOSITORY_PROVIDER = {
  provide: JOB_REPOSITORY,
  useClass: EmailJobsRepository,
};
