import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { TOPOLOGY } from '../../contracts/index.js';

const DELIVERY_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];
const SEND_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];

@Injectable()
export class MetricsService implements OnModuleDestroy {
  readonly registry = new Registry();

  readonly jobsSubmitted = new Counter({
    name: 'email_jobs_submitted_total',
    help: 'Email jobs accepted and published by the api',
    registers: [this.registry],
  });

  readonly jobsDelivered = new Counter({
    name: 'email_jobs_delivered_total',
    help: 'Email jobs delivered to the provider',
    labelNames: ['provider'],
    registers: [this.registry],
  });

  readonly jobsRetried = new Counter({
    name: 'email_jobs_retried_total',
    help: 'Delivery attempts scheduled for retry',
    labelNames: ['provider'],
    registers: [this.registry],
  });

  readonly jobsDeadLettered = new Counter({
    name: 'email_jobs_dead_lettered_total',
    help: 'Email jobs moved to the dead-letter queue',
    labelNames: ['provider'],
    registers: [this.registry],
  });

  readonly duplicatesSkipped = new Counter({
    name: 'email_duplicate_redeliveries_skipped_total',
    help: 'Duplicate redeliveries prevented by the idempotency guard',
    registers: [this.registry],
  });

  readonly deliveryDuration = new Histogram({
    name: 'email_delivery_duration_seconds',
    help: 'Time from job submission to provider delivery',
    buckets: DELIVERY_BUCKETS,
    registers: [this.registry],
  });

  readonly sendDuration = new Histogram({
    name: 'email_send_duration_seconds',
    help: 'Time spent sending a single email through the provider',
    buckets: SEND_BUCKETS,
    registers: [this.registry],
  });

  readonly queueDepth = new Gauge({
    name: 'email_queue_depth',
    help: 'Messages waiting in queues',
    labelNames: ['queue'],
    registers: [this.registry],
  });

  private queueDepthTimer?: NodeJS.Timeout;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  startQueueDepthPolling(): void {
    const url = new URL(
      process.env.RABBITMQ_MANAGEMENT_URL ??
        'http://guest:guest@localhost:15672',
    );
    const authorization = `Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}`;
    const base = `${url.protocol}//${url.host}`;
    const queues = [TOPOLOGY.mainQueue, TOPOLOGY.deadLetterQueue];
    const poll = async (): Promise<void> => {
      for (const queue of queues) {
        try {
          const response = await fetch(`${base}/api/queues/%2F/${queue}`, {
            headers: { authorization },
          });
          if (response.ok) {
            const data = (await response.json()) as { messages?: number };
            this.queueDepth.set({ queue }, data.messages ?? 0);
          }
        } catch {
          // management api unreachable, gauge keeps its last value
        }
      }
    };
    void poll();
    this.queueDepthTimer = setInterval(() => void poll(), 5_000);
    this.queueDepthTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.queueDepthTimer) {
      clearInterval(this.queueDepthTimer);
    }
  }
}
