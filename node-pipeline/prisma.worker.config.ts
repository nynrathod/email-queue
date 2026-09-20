import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/worker/schema.prisma',
  migrations: {
    path: 'prisma/worker/migrations',
  },
  datasource: {
    url: process.env.WORKER_DATABASE_URL!,
  },
});
