import type { ProviderName } from "./email-job.js";

export interface SendEmailRequest {
	jobId: string;
	from: string;
	to: string;
	subject: string;
	text: string;
	html?: string;
}

export interface DeliveryResult {
	providerMessageId: string;
}

export interface EmailProvider {
	readonly name: ProviderName;
	send(request: SendEmailRequest): Promise<DeliveryResult>;
}
