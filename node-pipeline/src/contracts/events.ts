import { z } from 'zod';
import { providerNameSchema, submitEmailJobSchema } from './email-job.js';

export const emailJobMessageSchema = submitEmailJobSchema
  .omit({ idempotencyKey: true, provider: true })
  .extend({
    jobId: z.uuid(),
    provider: providerNameSchema,
    attempt: z.number().int().min(0),
    publishedAt: z.number().int().positive(),
  });
export type EmailJobMessage = z.infer<typeof emailJobMessageSchema>;
