import { Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import { RateLimiterService } from './rate-limiter.service.js';

@Module({
  providers: [RateLimiterService, CircuitBreakerService],
  exports: [RateLimiterService, CircuitBreakerService],
})
export class ResilienceModule {}
