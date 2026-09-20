import { Module } from '@nestjs/common';
import { DeliveryModule } from './delivery/delivery.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggerModule, RabbitmqModule } from './infra/index.js';
import { ProvidersModule } from './providers/providers.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({ app: 'worker' }),
    RabbitmqModule,
    ProvidersModule,
    DeliveryModule,
    HealthModule,
  ],
})
export class WorkerAppModule {}
