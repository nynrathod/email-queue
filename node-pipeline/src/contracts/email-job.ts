import { z } from "zod";

export const emailJobStatusSchema = z.enum([
	"QUEUED",
	"PUBLISHED",
	"IN_FLIGHT",
	"DELIVERED",
	"RETRY_SCHEDULED",
	"DEAD_LETTERED",
]);
export type EmailJobStatus = z.infer<typeof emailJobStatusSchema>;

export const providerNameSchema = z.enum(["smtp", "gmail", "outlook"]);
export type ProviderName = z.infer<typeof providerNameSchema>;

export const emailAddressSchema = z.email().max(254);

export const submitEmailJobSchema = z.object({
	idempotencyKey: z.string().min(8).max(128),
	tenantId: z.string().min(1).max(64),
	from: emailAddressSchema,
	to: emailAddressSchema,
	subject: z.string().min(1).max(500),
	text: z.string().min(1).max(1_000_000),
	html: z.string().max(5_000_000).optional(),
	provider: providerNameSchema.optional(),
});
export type SubmitEmailJob = z.infer<typeof submitEmailJobSchema>;
