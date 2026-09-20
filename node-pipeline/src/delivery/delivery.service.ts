import { Injectable } from '@nestjs/common';
import {
  TOPOLOGY,
  type DeliveryStatusEvent,
  type EmailJobMessage,
  PermanentProviderError,
  type SendEmailRequest,
  TransientProviderError,
} from '../contracts/index.js';
import { PinoLoggerService, RabbitmqService } from '../infra/index.js';
import { ProviderFactory } from '../providers/provider.factory.js';
import { decideFailureAction } from './retry-policy.js';

export type DeliveryOutcome = 'ACK' | 'REQUEUE';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly providers: ProviderFactory,
    private readonly rabbitmq: RabbitmqService,
    private readonly logger: PinoLoggerService,
  ) {}

  async process(message: EmailJobMessage): Promise<DeliveryOutcome> {
    const provider = this.providers.resolve(message.provider);
    const startedAt = Date.now();

    try {
      const result = await provider.send(toSendRequest(message));
      const latencyMs = Date.now() - startedAt;
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
      return this.handleFailure(message, error);
    }
  }

  private async handleFailure(
    message: EmailJobMessage,
    error: unknown,
  ): Promise<DeliveryOutcome> {
    if (error instanceof TransientProviderError) {
      const decision = decideFailureAction(message.attempt);
      if (decision.action === 'RETRY') {
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
      );
    }

    if (error instanceof PermanentProviderError) {
      return this.deadLetter(message, error.code, error.message);
    }

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
  ): Promise<DeliveryOutcome> {
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
