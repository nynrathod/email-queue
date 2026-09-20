import { z } from "zod";
import { parseEnv } from "./env.js";

const apiEnvSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	API_KEY: z.string().min(16),
	DATABASE_URL: z.string().min(1),
	RABBITMQ_URL: z.string().min(1),
	REDIS_URL: z.string().min(1),
	CORS_ORIGINS: z.string().default(""),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(): ApiEnv {
	return parseEnv(apiEnvSchema, process.env);
}
