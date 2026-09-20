import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module.js';
import { DeliveryService } from './delivery.service.js';
import { EmailConsumer } from './email.consumer.js';

@Module({
  imports: [ProvidersModule],
  providers: [EmailConsumer, DeliveryService],
})
export class DeliveryModule {}
