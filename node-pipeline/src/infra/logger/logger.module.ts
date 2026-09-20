import { type DynamicModule, Module } from "@nestjs/common";
import {
	PinoLoggerService,
	type PinoLoggerOptions,
} from "./pino-logger.service.js";

@Module({})
export class LoggerModule {
	static forRoot(options: PinoLoggerOptions): DynamicModule {
		return {
			module: LoggerModule,
			global: true,
			providers: [
				{
					provide: PinoLoggerService,
					useValue: new PinoLoggerService(options),
				},
			],
			exports: [PinoLoggerService],
		};
	}
}
