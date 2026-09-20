export type ProviderErrorCode =
	| "PROVIDER_TIMEOUT"
	| "PROVIDER_RATE_LIMITED"
	| "PROVIDER_UNAVAILABLE"
	| "PROVIDER_AUTH_FAILED"
	| "INVALID_RECIPIENT"
	| "PROVIDER_REJECTED"
	| "UNKNOWN";

export class TransientProviderError extends Error {
	readonly code: ProviderErrorCode;

	constructor(
		code: ProviderErrorCode,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "TransientProviderError";
		this.code = code;
	}
}

export class PermanentProviderError extends Error {
	readonly code: ProviderErrorCode;

	constructor(
		code: ProviderErrorCode,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "PermanentProviderError";
		this.code = code;
	}
}
