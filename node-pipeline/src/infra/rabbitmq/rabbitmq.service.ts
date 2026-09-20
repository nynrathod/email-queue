import {
  Injectable,
  ServiceUnavailableException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';
import { PinoLoggerService } from '../logger/pino-logger.service.js';
import { assertTopology } from './topology.bootstrap.js';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private reconnecting = false;

  constructor(private readonly logger: PinoLoggerService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch {
      this.scheduleReconnect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options?: { messageId?: string },
  ): Promise<void> {
    if (!this.channel) {
      throw new ServiceUnavailableException('rabbitmq is not available');
    }
    const channel = this.channel;
    return new Promise<void>((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        content,
        { persistent: true, contentType: 'application/json', ...options },
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  get confirmChannel(): ConfirmChannel | undefined {
    return this.channel;
  }

  private async connect(): Promise<void> {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    const channel = await connection.createConfirmChannel();
    await assertTopology(channel);
    this.connection = connection;
    this.channel = channel;
    connection.on('error', () => this.scheduleReconnect());
    connection.on('close', () => this.scheduleReconnect());
    this.logger.log(
      'rabbitmq connected and topology asserted',
      'RabbitmqService',
    );
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    this.channel = undefined;
    this.connection = undefined;
    this.logger.warn(
      'rabbitmq connection lost, reconnecting in 5s',
      'RabbitmqService',
    );
    setTimeout(() => {
      this.reconnecting = false;
      this.connect().catch(() => this.scheduleReconnect());
    }, 5000);
  }
}
