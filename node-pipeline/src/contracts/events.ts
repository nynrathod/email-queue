import { z } from "zod";
import { providerNameSchema } from "./email-job.js";

export const emailJobMessageSchema = z.object({
	jobId: z.uuid(),
	tenantId: z.string(),
	provider: providerNameSchema,
	attempt: z.number().int().min(0),
	publishedAt: z.number().int().positive(),
});
export type EmailJobMessage = z.infer<typeof emailJobMessageSchema>;
