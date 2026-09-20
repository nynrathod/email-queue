import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  submitEmailJobBodySchema,
  type SubmitEmailJobBody,
} from '../contracts/index.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { type EmailJobResponse } from './dto/email-job-response.dto.js';
import { EmailJobsService } from './email-jobs.service.js';

@Controller('v1/email-jobs')
export class EmailJobsController {
  constructor(private readonly emailJobsService: EmailJobsService) {}

  @Post()
  @HttpCode(201)
  submit(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(submitEmailJobBodySchema))
    body: SubmitEmailJobBody,
  ): Promise<EmailJobResponse> {
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new BadRequestException(
        'idempotency-key header must be at least 8 characters',
      );
    }
    return this.emailJobsService.submit(idempotencyKey, body);
  }

  @Get(':id')
  getStatus(@Param('id') id: string): Promise<EmailJobResponse> {
    return this.emailJobsService.getStatus(id);
  }
}
