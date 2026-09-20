import { Injectable } from '@nestjs/common';
import { ApiPrismaService } from '../infra/index.js';
import {
  type CreateJobInput,
  type EmailJobRecord,
  JOB_REPOSITORY,
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
