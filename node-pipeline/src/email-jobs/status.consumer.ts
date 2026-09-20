import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import {
  TOPOLOGY,
  deliveryStatusEventSchema,
  type DeliveryStatusEvent,
} from '../contracts/index.js';
import { PinoLoggerService, RabbitmqService } from '../infra/index.js';
import { JOB_REPOSITORY, type JobRepository } from './ports.js';

@Injectable()
export class StatusConsumer implements OnModuleInit, OnModuleDestroy {
  private consumerTag?: string;

  constructor(
    private readonly rabbitmq: RabbitmqService,
    @Inject(JOB_REPOSITORY) private readonly repository: JobRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  onModuleInit(): void {
    this.rabbitmq.onChannelReady((channel) => this.start(channel));
  }

  async onModuleDestroy(): Promise<void> {
    const channel = this.rabbitmq.confirmChannel;
    if (this.consumerTag && channel) {
      await channel.cancel(this.consumerTag).catch(() => undefined);
    }
  }

  private async start(channel: ConfirmChannel): Promise<void> {
    await channel.prefetch(100);
    const { consumerTag } = await channel.consume(
      TOPOLOGY.statusQueue,
      (raw) => {
        void this.handle(raw);
      },
    );
    this.consumerTag = consumerTag;
    this.logger.log(`consuming ${TOPOLOGY.statusQueue}`, 'StatusConsumer');
  }

  private async handle(raw: ConsumeMessage | null): Promise<void> {
    if (!raw) {
      return;
    }
    const channel = this.rabbitmq.confirmChannel;
    if (!channel) {
      return;
    }
    try {
      const event = this.parse(raw);
      if (event) {
        await this.apply(event);
      }
      channel.ack(raw);
    } catch (error) {
      this.logger.error(
        `status update failed: ${String(error)}`,
        undefined,
        'StatusConsumer',
      );
      channel.nack(raw, false, true);
    }
  }

  private parse(raw: ConsumeMessage): DeliveryStatusEvent | null {
    try {
      const parsed = deliveryStatusEventSchema.safeParse(
        JSON.parse(raw.content.toString()),
      );
      if (!parsed.success) {
        this.logger.error(
          'invalid status event dropped',
          undefined,
          'StatusConsumer',
        );
        return null;
      }
      return parsed.data;
    } catch {
      this.logger.error(
        'malformed status event dropped',
        undefined,
        'StatusConsumer',
      );
      return null;
    }
  }

  private async apply(event: DeliveryStatusEvent): Promise<void> {
    switch (event.status) {
      case 'DELIVERED':
        await this.repository.markDelivered(event.jobId);
        break;
      case 'RETRY_SCHEDULED':
        await this.repository.markRetryScheduled(event.jobId);
        break;
      case 'DEAD_LETTERED':
        await this.repository.markDeadLettered(event.jobId, event.errorCode);
        break;
    }
    this.logger.log(`job ${event.jobId} -> ${event.status}`, 'StatusConsumer');
  }
}
