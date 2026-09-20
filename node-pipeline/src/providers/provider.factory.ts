import { Injectable } from '@nestjs/common';
import {
  PermanentProviderError,
  type EmailProvider,
  type ProviderName,
} from '../contracts/index.js';
import { SmtpProvider } from './smtp.provider.js';

@Injectable()
export class ProviderFactory {
  private readonly providers = new Map<ProviderName, EmailProvider>();

  constructor(smtpProvider: SmtpProvider) {
    this.providers.set(smtpProvider.name, smtpProvider);
  }

  resolve(name: ProviderName): EmailProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new PermanentProviderError(
        'PROVIDER_REJECTED',
        `provider not registered: ${name}`,
      );
    }
    return provider;
  }
}
