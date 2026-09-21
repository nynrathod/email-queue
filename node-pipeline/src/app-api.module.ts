import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard.js';
import { EmailJobsModule } from './email-jobs/email-jobs.module.js';
import { HealthModule } from './health/health.module.js';
import {
  LoggerModule,
  MetricsModule,
  PrismaModule,
  RabbitmqModule,
  RedisModule,
} from './infra/index.js';

@Module({
  imports: [
    LoggerModule.forRoot({ app: 'api' }),
    PrismaModule,
    RedisModule,
    RabbitmqModule,
    EmailJobsModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class ApiAppModule {}
