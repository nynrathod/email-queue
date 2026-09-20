import { Module } from '@nestjs/common';
import { ProviderFactory } from './provider.factory.js';
import { SmtpProvider } from './smtp.provider.js';

@Module({
  providers: [SmtpProvider, ProviderFactory],
  exports: [ProviderFactory],
})
export class ProvidersModule {}
