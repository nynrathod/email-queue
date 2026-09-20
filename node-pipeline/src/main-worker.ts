import { WorkerAppModule } from './app-worker.module.js';
import { loadWorkerEnv } from './config/index.js';
import { PinoLoggerService } from './infra/index.js';
import { NestFactory } from '@nestjs/core';

async function bootstrap(): Promise<void> {
  const env = loadWorkerEnv();
  const app = await NestFactory.create(WorkerAppModule, { logger: false });
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);
  await app.listen(env.WORKER_PORT);
  logger.log(`worker listening on :${env.WORKER_PORT}`, 'Bootstrap');
}

void bootstrap();
