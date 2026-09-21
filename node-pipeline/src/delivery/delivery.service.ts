import { Injectable } from '@nestjs/common';
import {
  TOPOLOGY,
  type DeliveryStatusEvent,
  type EmailJobMessage,
  PermanentProviderError,
  type SendEmailRequest,
  TransientProviderError,
  retryQueueName,
} from '../contracts/index.js';
import {
  MetricsService,
  PinoLoggerService,
  RabbitmqService,
} from '../infra/index.js';
import { ProviderFactory } from '../providers/provider.factory.js';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service.js';
import { RateLimiterService } from '../resilience/rate-limiter.service.js';
import { IdempotencyGuard } from './idempotency-guard.js';
import { decideFailureAction } from './retry-policy.js';

export type DeliveryOutcome = 'ACK' | 'REQUEUE';

const RATE_LIMIT_DEFER_TIER = 1;
const BREAKER_DEFER_TIER = 2;

@Injectable()
export class DeliveryService {
  constructor(
    private readonly providers: ProviderFactory,
    private readonly rabbitmq: RabbitmqService,
    private readonly idempotency: IdempotencyGuard,
    private readonly rateLimiter: RateLimiterService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly metrics: MetricsService,
    private readonly logger: PinoLoggerService,
  ) {}

  async process(message: EmailJobMessage): Promise<DeliveryOutcome> {
    if (!(await this.rateLimiter.acquire(`rl:${message.provider}`))) {
      return this.defer(message, RATE_LIMIT_DEFER_TIER);
    }
    if (this.circuitBreaker.isOpen(message.provider)) {
      return this.defer(message, BREAKER_DEFER_TIER);
    }

    const reserved = await this.idempotency.reserve(message);
    if (!reserved) {
      this.metrics.duplicatesSkipped.inc();
      this.logger.warn(
        `job ${message.jobId} attempt ${message.attempt} already completed, duplicate redelivery skipped`,
        'DeliveryService',
      );
      return 'ACK';
    }

    const startedAt = Date.now();
    try {
      const provider = this.providers.resolve(message.provider);
      const result = await provider.send(toSendRequest(message));
      const latencyMs = Date.now() - startedAt;
      this.circuitBreaker.recordSuccess(message.provider);
      await this.idempotency.complete(message.jobId, message.attempt, {
        outcome: 'DELIVERED',
        messageId: result.providerMessageId,
        latencyMs,
      });
      this.metrics.jobsDelivered.inc({ provider: message.provider });
      this.metrics.sendDuration.observe(latencyMs / 1000);
      this.metrics.deliveryDuration.observe(
        (Date.now() - message.publishedAt) / 1000,
      );
      await this.publishStatus({
        jobId: message.jobId,
        tenantId: message.tenantId,
        status: 'DELIVERED',
        attempt: message.attempt,
        provider: message.provider,
        messageId: result.providerMessageId,
        occurredAt: Date.now(),
      });
      this.logger.log(
        `job ${message.jobId} delivered via ${message.provider} attempt ${message.attempt} in ${latencyMs}ms`,
        'DeliveryService',
      );
      return 'ACK';
    } catch (error) {
      return this.handleFailure(message, error, Date.now() - startedAt);
    }
  }

  private async handleFailure(
    message: EmailJobMessage,
    error: unknown,
    latencyMs: number,
  ): Promise<DeliveryOutcome> {
    if (error instanceof TransientProviderError) {
      this.circuitBreaker.recordFailure(message.provider);
      const decision = decideFailureAction(message.attempt);
      if (decision.action === 'RETRY') {
        this.metrics.jobsRetried.inc({ provider: message.provider });
        await this.idempotency.complete(message.jobId, message.attempt, {
          outcome: 'FAILED',
          errorCode: error.code,
          latencyMs,
        });
        await this.rabbitmq.publish(
          TOPOLOGY.retryExchange,
          decision.queue,
          Buffer.from(
            JSON.stringify({ ...message, attempt: decision.attempt }),
          ),
          { messageId: message.jobId },
        );
        await this.publishStatus({
          jobId: message.jobId,
          tenantId: message.tenantId,
          status: 'RETRY_SCHEDULED',
          attempt: decision.attempt,
          provider: message.provider,
          errorCode: error.code,
          occurredAt: Date.now(),
        });
        this.logger.warn(
          `job ${message.jobId} failed transiently (${error.code}), retry ${decision.attempt}/${TOPOLOGY.maxAttempts} in ${decision.delaySeconds}s`,
          'DeliveryService',
        );
        return 'ACK';
      }
      return this.deadLetter(
        message,
        error.code,
        `transient failures exhausted after ${TOPOLOGY.maxAttempts} attempts`,
        latencyMs,
      );
    }

    if (error instanceof PermanentProviderError) {
      return this.deadLetter(message, error.code, error.message, latencyMs);
    }

    this.circuitBreaker.recordFailure(message.provider);
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `job ${message.jobId} unexpected error: ${detail}`,
      undefined,
      'DeliveryService',
    );
    return 'REQUEUE';
  }

  private async deadLetter(
    message: EmailJobMessage,
    errorCode: string,
    detail: string,
    latencyMs: number,
  ): Promise<DeliveryOutcome> {
    this.metrics.jobsDeadLettered.inc({ provider: message.provider });
    await this.idempotency.complete(message.jobId, message.attempt, {
      outcome: 'FAILED',
      errorCode,
      latencyMs,
    });
    await this.rabbitmq.publish(
      TOPOLOGY.deadLetterExchange,
      TOPOLOGY.deadLetterRoutingKey,
      Buffer.from(JSON.stringify(message)),
      { messageId: message.jobId },
    );
    await this.publishStatus({
      jobId: message.jobId,
      tenantId: message.tenantId,
      status: 'DEAD_LETTERED',
      attempt: message.attempt,
      provider: message.provider,
      errorCode,
      occurredAt: Date.now(),
    });
    this.logger.error(
      `job ${message.jobId} dead-lettered (${errorCode}): ${detail}`,
      undefined,
      'DeliveryService',
    );
    return 'ACK';
  }

  private async defer(
    message: EmailJobMessage,
    tier: number,
  ): Promise<DeliveryOutcome> {
    await this.rabbitmq.publish(
      TOPOLOGY.retryExchange,
      retryQueueName(tier),
      Buffer.from(JSON.stringify(message)),
      { messageId: message.jobId },
    );
    this.logger.log(
      `job ${message.jobId} deferred to ${retryQueueName(tier)}`,
      'DeliveryService',
    );
    return 'ACK';
  }

  private async publishStatus(event: DeliveryStatusEvent): Promise<void> {
    await this.rabbitmq.publish(
      TOPOLOGY.statusExchange,
      TOPOLOGY.statusRoutingKey,
      Buffer.from(JSON.stringify(event)),
      { messageId: event.jobId },
    );
  }
}

function toSendRequest(message: EmailJobMessage): SendEmailRequest {
  return {
    jobId: message.jobId,
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
}
