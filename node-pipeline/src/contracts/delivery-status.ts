import { z } from 'zod';

export const deliveryStatusSchema = z.enum([
  'DELIVERED',
  'RETRY_SCHEDULED',
  'DEAD_LETTERED',
]);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const deliveryStatusEventSchema = z.object({
  jobId: z.uuid(),
  tenantId: z.string(),
  status: deliveryStatusSchema,
  attempt: z.number().int().min(0),
  provider: z.string(),
  messageId: z.string().optional(),
  errorCode: z.string().optional(),
  occurredAt: z.number().int().positive(),
});
export type DeliveryStatusEvent = z.infer<typeof deliveryStatusEventSchema>;
