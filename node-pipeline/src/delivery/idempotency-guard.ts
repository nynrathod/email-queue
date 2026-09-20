import { Injectable } from '@nestjs/common';
import type { EmailJobMessage } from '../contracts/index.js';
import { PgPoolService } from '../infra/index.js';

export interface AttemptCompletion {
  outcome: 'DELIVERED' | 'FAILED';
  messageId?: string;
  errorCode?: string;
  latencyMs?: number;
}

@Injectable()
export class IdempotencyGuard {
  constructor(private readonly pg: PgPoolService) {}

  async reserve(message: EmailJobMessage): Promise<boolean> {
    const inserted = await this.pg.query(
      `INSERT INTO delivery_attempts (id, job_id, attempt, provider, outcome)
       VALUES (gen_random_uuid(), $1, $2, $3, 'PENDING')
       ON CONFLICT (job_id, attempt) DO NOTHING
       RETURNING id`,
      [message.jobId, message.attempt, message.provider],
    );
    if (inserted.rows.length > 0) {
      return true;
    }
    const existing = await this.pg.query<{ outcome: string }>(
      `SELECT outcome FROM delivery_attempts WHERE job_id = $1 AND attempt = $2`,
      [message.jobId, message.attempt],
    );
    const outcome = existing.rows[0]?.outcome;
    return outcome === 'PENDING';
  }

  async complete(
    jobId: string,
    attempt: number,
    completion: AttemptCompletion,
  ): Promise<void> {
    await this.pg.query(
      `UPDATE delivery_attempts
       SET outcome = $3, message_id = $4, error_code = $5, latency_ms = $6
       WHERE job_id = $1 AND attempt = $2`,
      [
        jobId,
        attempt,
        completion.outcome,
        completion.messageId,
        completion.errorCode,
        completion.latencyMs,
      ],
    );
  }
}
