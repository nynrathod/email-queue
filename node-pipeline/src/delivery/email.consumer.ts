import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { TOPOLOGY, emailJobMessageSchema } from '../contracts/index.js';
import {
  MetricsService,
  PinoLoggerService,
  RabbitmqService,
} from '../infra/index.js';
import { type DeliveryOutcome, DeliveryService } from './delivery.service.js';

const DRAIN_TIMEOUT_MS = 10_000;

@Injectable()
export class EmailConsumer implements OnModuleInit, OnModuleDestroy {
  private consumerTag?: string;
  private inFlight = 0;

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly delivery: DeliveryService,
    private readonly metrics: MetricsService,
    private readonly logger: PinoLoggerService,
  ) {}

  onModuleInit(): void {
    this.metrics.startQueueDepthPolling();
    this.rabbitmq.onChannelReady((channel) => this.start(channel));
  }

  async onModuleDestroy(): Promise<void> {
    const channel = this.rabbitmq.confirmChannel;
    if (this.consumerTag && channel) {
      await channel.cancel(this.consumerTag).catch(() => undefined);
    }
    const deadline = Date.now() + DRAIN_TIMEOUT_MS;
    while (this.inFlight > 0 && Date.now() < deadline) {
      await delay(100);
    }
    this.logger.log(
      `consumer stopped, in-flight drained to ${this.inFlight}`,
      'EmailConsumer',
    );
  }

  private async start(channel: ConfirmChannel): Promise<void> {
    const prefetch = Number(process.env.CONSUMER_PREFETCH ?? 10);
    await channel.prefetch(prefetch);
    const { consumerTag } = await channel.consume(TOPOLOGY.mainQueue, (raw) => {
      void this.handle(raw);
    });
    this.consumerTag = consumerTag;
    this.logger.log(
      `consuming ${TOPOLOGY.mainQueue} (prefetch ${prefetch})`,
      'EmailConsumer',
    );
  }

  private async handle(raw: ConsumeMessage | null): Promise<void> {
    if (!raw) {
      this.logger.warn('consumer cancelled by broker', 'EmailConsumer');
      return;
    }
    const channel = this.rabbitmq.confirmChannel;
    if (!channel) {
      return;
    }
    this.inFlight++;
    try {
      const outcome = await this.process(raw);
      this.settle(channel, raw, outcome === 'ACK');
    } catch (error) {
      this.logger.error(
        `processing failed: ${String(error)}`,
        undefined,
        'EmailConsumer',
      );
      this.settle(channel, raw, false);
    } finally {
      this.inFlight--;
    }
  }

  private async process(raw: ConsumeMessage): Promise<DeliveryOutcome> {
    let payload: unknown;
    try {
      payload = JSON.parse(raw.content.toString());
    } catch {
      await this.rabbitmq.publish(
        TOPOLOGY.deadLetterExchange,
        TOPOLOGY.deadLetterRoutingKey,
        raw.content,
      );
      this.logger.error(
        'malformed message dead-lettered',
        undefined,
        'EmailConsumer',
      );
      return 'ACK';
    }

    const message = emailJobMessageSchema.safeParse(payload);
    if (!message.success) {
      await this.rabbitmq.publish(
        TOPOLOGY.deadLetterExchange,
        TOPOLOGY.deadLetterRoutingKey,
        raw.content,
      );
      this.logger.error(
        'message failed schema validation, dead-lettered',
        undefined,
        'EmailConsumer',
      );
      return 'ACK';
    }

    return this.delivery.process(message.data);
  }

  private settle(
    channel: ConfirmChannel,
    raw: ConsumeMessage,
    ack: boolean,
  ): void {
    try {
      if (ack) {
        channel.ack(raw);
      } else {
        channel.nack(raw, false, true);
      }
    } catch (error) {
      this.logger.warn(`settle failed: ${String(error)}`, 'EmailConsumer');
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
