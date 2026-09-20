import { loadApiEnv } from './config/index.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { PinoLoggerService } from './infra/index.js';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ApiAppModule } from './app-api.module.js';

async function bootstrap(): Promise<void> {
  const env = loadApiEnv();
  const app = await NestFactory.create(ApiAppModule, { logger: false });
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });
  await app.listen(env.PORT);
  logger.log(`api listening on :${env.PORT}`, 'Bootstrap');
}

void bootstrap();
