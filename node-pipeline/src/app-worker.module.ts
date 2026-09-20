import { Module } from '@nestjs/common';
import { DeliveryModule } from './delivery/delivery.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggerModule, RabbitmqModule, RedisModule } from './infra/index.js';
import { ProvidersModule } from './providers/providers.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({ app: 'worker' }),
    RabbitmqModule,
    RedisModule,
    ProvidersModule,
    DeliveryModule,
    HealthModule,
  ],
})
export class WorkerAppModule {}
