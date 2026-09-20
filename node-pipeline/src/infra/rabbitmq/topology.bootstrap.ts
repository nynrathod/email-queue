import type { ConfirmChannel } from 'amqplib';
import { TOPOLOGY, retryQueueName } from '../../contracts/index.js';

export async function assertTopology(channel: ConfirmChannel): Promise<void> {
  await channel.assertExchange(TOPOLOGY.exchange, 'direct', { durable: true });
  await channel.assertExchange(TOPOLOGY.retryExchange, 'direct', {
    durable: true,
  });
  await channel.assertExchange(TOPOLOGY.deadLetterExchange, 'direct', {
    durable: true,
  });

  await channel.assertQueue(TOPOLOGY.mainQueue, { durable: true });
  await channel.bindQueue(
    TOPOLOGY.mainQueue,
    TOPOLOGY.exchange,
    TOPOLOGY.routingKey,
  );

  for (const [index, delaySeconds] of TOPOLOGY.retryDelaysSeconds.entries()) {
    const queue = retryQueueName(index + 1);
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-message-ttl': delaySeconds * 1000,
        'x-dead-letter-exchange': TOPOLOGY.exchange,
        'x-dead-letter-routing-key': TOPOLOGY.routingKey,
      },
    });
    await channel.bindQueue(queue, TOPOLOGY.retryExchange, queue);
  }

  await channel.assertQueue(TOPOLOGY.deadLetterQueue, { durable: true });
  await channel.bindQueue(
    TOPOLOGY.deadLetterQueue,
    TOPOLOGY.deadLetterExchange,
    TOPOLOGY.deadLetterRoutingKey,
  );
}
