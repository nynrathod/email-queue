import { loadWorkerEnv } from './config/index.js';
import { PinoLoggerService } from './infra/index.js';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './app-worker.module.js';

async function bootstrap(): Promise<void> {
  const env = loadWorkerEnv();
  const app = await NestFactory.create(WorkerAppModule, { logger: false });
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);
  app.enableShutdownHooks();
  await app.listen(env.WORKER_PORT);
  logger.log(`worker listening on :${env.WORKER_PORT}`, 'Bootstrap');
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
