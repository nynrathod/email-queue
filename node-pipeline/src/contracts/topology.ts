export const TOPOLOGY = {
	exchange: "email.exchange",
	retryExchange: "email.retry.exchange",
	deadLetterExchange: "email.dlx",
	routingKey: "email.deliver",
	retryRoutingKey: "email.retry",
	deadLetterRoutingKey: "email.dead",
	mainQueue: "email.queue",
	deadLetterQueue: "email.dead-letter",
	retryDelaysSeconds: [5, 30, 120, 600, 1800],
	maxAttempts: 5,
} as const;

export type Topology = typeof TOPOLOGY;

export function retryQueueName(tier: number): string {
	return `email.retry.tier${tier}`;
}
