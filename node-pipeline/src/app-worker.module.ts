import { Module } from '@nestjs/common';
import { LoggerModule } from './infra/index.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [LoggerModule.forRoot({ app: 'worker' }), HealthModule],
})
export class WorkerAppModule {}
