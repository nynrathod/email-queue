import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  PermanentProviderError,
  TransientProviderError,
  type DeliveryResult,
  type EmailProvider,
  type ProviderName,
  type SendEmailRequest,
} from '../contracts/index.js';

const TRANSIENT_SMTP_CODES = new Set([
  'ETIMEDOUT',
  'ESOCKET',
  'ECONNECTION',
  'ECONNRESET',
  'EPIPE',
  'ESTREAM',
]);

@Injectable()
export class SmtpProvider implements EmailProvider, OnModuleDestroy {
  readonly name: ProviderName = 'smtp';

  private readonly transporter: Transporter;

  constructor() {
    const auth =
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT),
      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS ?? 4),
      auth,
    });
  }

  async send(request: SendEmailRequest): Promise<DeliveryResult> {
    try {
      const info = await this.transporter.sendMail({
        from: request.from,
        to: request.to,
        subject: request.subject,
        text: request.text,
        html: request.html,
      });
      return { providerMessageId: info.messageId ?? 'unknown' };
    } catch (error) {
      throw classifySmtpError(error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.transporter.close();
  }
}

function classifySmtpError(
  error: unknown,
): TransientProviderError | PermanentProviderError {
  const code = (error as { code?: string }).code;
  const message = error instanceof Error ? error.message : String(error);
  switch (code) {
    case 'EAUTH':
      return new PermanentProviderError('PROVIDER_AUTH_FAILED', message, {
        cause: error,
      });
    case 'EENVELOPE':
      return new PermanentProviderError('INVALID_RECIPIENT', message, {
        cause: error,
      });
    case 'EMESSAGE':
      return new PermanentProviderError('PROVIDER_REJECTED', message, {
        cause: error,
      });
    default:
      if (code && TRANSIENT_SMTP_CODES.has(code)) {
        return new TransientProviderError('PROVIDER_UNAVAILABLE', message, {
          cause: error,
        });
      }
      return new TransientProviderError('UNKNOWN', message, { cause: error });
  }
}
