import { Global, Module } from '@nestjs/common';
import { ApiPrismaService } from './api-prisma.service.js';

@Global()
@Module({
  providers: [ApiPrismaService],
  exports: [ApiPrismaService],
})
export class PrismaModule {}
