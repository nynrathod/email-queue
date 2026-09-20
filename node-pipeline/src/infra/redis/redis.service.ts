import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit(): void {
    this.client = new Redis(process.env.REDIS_URL!);
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  get redis(): Redis {
    return this.client;
  }
}
