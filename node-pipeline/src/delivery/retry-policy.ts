import { TOPOLOGY, retryQueueName } from '../contracts/index.js';

export type FailureDecision =
  | { action: 'RETRY'; attempt: number; queue: string; delaySeconds: number }
  | { action: 'DEAD_LETTER' };

export function decideFailureAction(attempt: number): FailureDecision {
  const nextAttempt = attempt + 1;
  if (nextAttempt > TOPOLOGY.maxAttempts) {
    return { action: 'DEAD_LETTER' };
  }
  const delaySeconds = TOPOLOGY.retryDelaysSeconds[nextAttempt - 1]!;
  return {
    action: 'RETRY',
    attempt: nextAttempt,
    queue: retryQueueName(nextAttempt),
    delaySeconds,
  };
}
