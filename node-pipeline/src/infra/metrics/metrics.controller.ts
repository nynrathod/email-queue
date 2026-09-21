import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get()
  async expose(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', this.metrics.registry.contentType);
    response.end(await this.metrics.registry.metrics());
  }
}
