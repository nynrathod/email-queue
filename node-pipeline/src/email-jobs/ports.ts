import type { EmailJobMessage } from '../contracts/index.js';

export const JOB_REPOSITORY = Symbol('JOB_REPOSITORY');
export const JOB_PUBLISHER = Symbol('JOB_PUBLISHER');

export interface EmailJobRecord {
  id: string;
  idempotencyKey: string;
  status: string;
  createdAt: Date;
}

export interface CreateJobInput {
  id: string;
  idempotencyKey: string;
  tenantId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  provider: string;
}

export interface JobRepository {
  create(input: CreateJobInput): Promise<EmailJobRecord>;
  findById(id: string): Promise<EmailJobRecord | null>;
  markPublished(id: string): Promise<void>;
  markDelivered(id: string): Promise<void>;
  markRetryScheduled(id: string): Promise<void>;
  markDeadLettered(id: string, errorCode?: string): Promise<void>;
}

export interface JobPublisher {
  publish(message: EmailJobMessage): Promise<void>;
}
