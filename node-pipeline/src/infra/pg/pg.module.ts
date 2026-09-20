import { Module } from '@nestjs/common';
import { PgPoolService } from './pg-pool.service.js';

@Module({
  providers: [PgPoolService],
  exports: [PgPoolService],
})
export class PgPoolModule {}
