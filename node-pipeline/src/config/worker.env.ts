import { z } from 'zod';
import { providerNameSchema } from '../contracts/index.js';
import { parseEnv } from './env.js';

const workerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  WORKER_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  EMAIL_PROVIDER: providerNameSchema.default('smtp'),
  CONSUMER_PREFETCH: z.coerce.number().int().min(1).max(1000).default(10),
  SMTP_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(64).default(4),
  WORKER_DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().length(64),
  METRICS_PORT: z.coerce.number().int().min(1).max(65535).default(9464),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function loadWorkerEnv(): WorkerEnv {
  return parseEnv(workerEnvSchema, process.env);
}
