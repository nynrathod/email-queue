import { Module } from '@nestjs/common';
import { PgPoolModule } from '../infra/index.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { ResilienceModule } from '../resilience/resilience.module.js';
import { DeliveryService } from './delivery.service.js';
import { EmailConsumer } from './email.consumer.js';
import { IdempotencyGuard } from './idempotency-guard.js';

@Module({
  imports: [ProvidersModule, ResilienceModule, PgPoolModule],
  providers: [EmailConsumer, DeliveryService, IdempotencyGuard],
})
export class DeliveryModule {}
