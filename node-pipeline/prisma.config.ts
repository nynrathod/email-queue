import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/api/schema.prisma',
  migrations: {
    path: 'prisma/api/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
