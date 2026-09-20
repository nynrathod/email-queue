import { z, type ZodType } from "zod";

export function parseEnv<T extends ZodType>(
	schema: T,
	source: NodeJS.ProcessEnv,
): z.infer<T> {
	const result = schema.safeParse(source);
	if (!result.success) {
		const issues = result.error.issues
			.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");
		throw new Error(`Invalid environment configuration:\n${issues}`);
	}
	return result.data;
}
