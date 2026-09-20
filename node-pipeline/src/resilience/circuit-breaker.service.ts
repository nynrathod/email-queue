import { Injectable } from '@nestjs/common';

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface Breaker {
  state: BreakerState;
  consecutiveFailures: number;
  openedAt: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly breakers = new Map<string, Breaker>();

  isOpen(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (!breaker || breaker.state !== 'OPEN') {
      return false;
    }
    const cooldownMs = Number(process.env.BREAKER_COOLDOWN_MS ?? 30_000);
    if (Date.now() - breaker.openedAt >= cooldownMs) {
      breaker.state = 'HALF_OPEN';
      return false;
    }
    return true;
  }

  recordSuccess(name: string): void {
    this.breakers.delete(name);
  }

  recordFailure(name: string): void {
    const breaker = this.breakers.get(name) ?? {
      state: 'CLOSED' as BreakerState,
      consecutiveFailures: 0,
      openedAt: 0,
    };
    breaker.consecutiveFailures++;
    const threshold = Number(process.env.BREAKER_FAILURE_THRESHOLD ?? 5);
    if (
      breaker.state === 'HALF_OPEN' ||
      breaker.consecutiveFailures >= threshold
    ) {
      breaker.state = 'OPEN';
      breaker.openedAt = Date.now();
    }
    this.breakers.set(name, breaker);
  }
}
