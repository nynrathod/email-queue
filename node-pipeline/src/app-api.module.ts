import { Module } from '@nestjs/common';
import { LoggerModule } from './infra/index.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [LoggerModule.forRoot({ app: 'api' }), HealthModule],
})
export class ApiAppModule {}
