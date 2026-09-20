import { Injectable } from '@nestjs/common';
import { TOPOLOGY, type EmailJobMessage } from '../contracts/index.js';
import { RabbitmqService } from '../infra/index.js';
import { JOB_PUBLISHER, type JobPublisher } from './ports.js';

@Injectable()
export class EmailJobsPublisher implements JobPublisher {
  constructor(private readonly rabbitmq: RabbitmqService) {}

  async publish(message: EmailJobMessage): Promise<void> {
    await this.rabbitmq.publish(
      TOPOLOGY.exchange,
      TOPOLOGY.routingKey,
      Buffer.from(JSON.stringify(message)),
      { messageId: message.jobId },
    );
  }
}

export const JOB_PUBLISHER_PROVIDER = {
  provide: JOB_PUBLISHER,
  useClass: EmailJobsPublisher,
};
