import { Injectable, type LoggerService } from "@nestjs/common";
import pino, { type Logger } from "pino";

export interface PinoLoggerOptions {
	app: string;
	level?: string;
}

@Injectable()
export class PinoLoggerService implements LoggerService {
	private readonly logger: Logger;

	constructor(options: PinoLoggerOptions) {
		const isDevelopment = process.env.NODE_ENV !== "production";
		this.logger = pino({
			level: options.level ?? (isDevelopment ? "debug" : "info"),
			base: { app: options.app },
			transport: isDevelopment
				? {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "SYS:HH:MM:ss.l",
						},
					}
				: undefined,
		});
	}

	log(message: unknown, context?: string): void {
		this.logger.info({ context }, stringify(message));
	}

	error(message: unknown, trace?: string, context?: string): void {
		this.logger.error({ context, trace }, stringify(message));
	}

	warn(message: unknown, context?: string): void {
		this.logger.warn({ context }, stringify(message));
	}

	debug(message: unknown, context?: string): void {
		this.logger.debug({ context }, stringify(message));
	}

	verbose(message: unknown, context?: string): void {
		this.logger.trace({ context }, stringify(message));
	}

	child(bindings: Record<string, unknown>): Logger {
		return this.logger.child(bindings);
	}
}

function stringify(message: unknown): string {
	return typeof message === "string" ? message : JSON.stringify(message);
}
