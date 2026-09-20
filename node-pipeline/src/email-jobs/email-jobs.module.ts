import { Module } from '@nestjs/common';
import { EmailJobsController } from './email-jobs.controller.js';
import {
  EmailJobsPublisher,
  JOB_PUBLISHER_PROVIDER,
} from './email-jobs.publisher.js';
import {
  EmailJobsRepository,
  JOB_REPOSITORY_PROVIDER,
} from './email-jobs.repository.js';
import { EmailJobsService } from './email-jobs.service.js';
import { StatusConsumer } from './status.consumer.js';

@Module({
  controllers: [EmailJobsController],
  providers: [
    EmailJobsService,
    EmailJobsRepository,
    EmailJobsPublisher,
    JOB_REPOSITORY_PROVIDER,
    JOB_PUBLISHER_PROVIDER,
    StatusConsumer,
  ],
})
export class EmailJobsModule {}
