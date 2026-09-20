import type { EmailJobRecord } from '../ports.js';

export interface EmailJobResponse {
  id: string;
  status: string;
  createdAt: string;
  duplicate: boolean;
}

export function toEmailJobResponse(
  job: EmailJobRecord,
  duplicate: boolean,
): EmailJobResponse {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    duplicate,
  };
}
