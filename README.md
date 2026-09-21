
# MailStream

Distributed email-flow platform. An idempotent submission API tier (nginx load-balanced) publishes jobs to RabbitMQ; independent workers deliver over pooled SMTP with bounded retries, circuit breakers, and dead-lettering. Two services, two databases, one event log - delivery status flows back as events, never shared tables.

```text
                        ┌──────────────────────────┐
POST /v1/email-jobs ───▶ nginx load balancer       │
                        │ 8 × api (NestJS)         │ owns email_api_db
                        │ zod · idempotency        │
                        │ publish · confirm        │
                        └────────────┬─────────────┘
                                     │ email.deliver (manual ack)
                                     ▼
                        ┌──────────────────────────┐
                        │ RabbitMQ                 │ durable work queue
                        │ retry tiers · DLQ        │
                        └────────────┬─────────────┘
                                     │ prefetch · N workers
                                     ▼
                        ┌──────────────────────────┐
Mailpit ◀──── SMTP ─────│ worker (NestJS)          │ owns email_worker_db
                        │ idempotency guard        │
                        │ rate limit · breaker     │
                        └────────────┬─────────────┘
                                     │ email.status
                                     ▼
                        api folds status events into its own projection;
                        a job is DELIVERED when the worker ledger confirms it
```

## Design

- **Two deployable roles from one codebase** (`main-api`, `main-worker`), each owning its own database. The boundary is enforced in code: the worker never imports the API's database client.
- **No synchronous coupling.** Cross-service knowledge flows only through RabbitMQ: job events forward, status events backward (event-carried state transfer).
- **Effectively-once delivery** from at-least-once queues: Redis idempotency keys on submission plus a worker-side delivery ledger with a unique (job, attempt) constraint - completed attempts are never re-sent; crashed attempts are taken over.
- **Failure isolation.** Provider errors are classified transient/permanent at the adapter; transient failures retry through five TTL-backed tiers (5s to 30m); permanent failures dead-letter immediately.
- **Recovery.** Killed workers' unacknowledged messages are redelivered by the broker; the idempotency guard converts redelivery into exactly one send.
- **Backpressure.** Token-bucket rate limiting defers work without burning attempts; per-provider circuit breakers fail fast while a provider is down.

## Queues

| Queue | Purpose |
|---|---|
| `email.queue` | work queue, manual ack, prefetch |
| `email.retry.tier1..5` | TTL-backed retries: 5s, 30s, 2m, 10m, 30m |
| `email.dead-letter` | permanently failed jobs |
| `email.status.queue` | delivery status events back to the api |

## Requirements

Node 22+, Docker, Yarn 4 (via corepack). Windows, macOS, and Linux are all supported - every command below is identical on all three.

## Quick start (development)

```bash
yarn install                                          # runs prisma generate
cp .env.example .env                                  # copy on windows
docker compose -f docker/docker-compose.yml up -d     # rabbitmq, postgres, redis, mailpit
yarn migrate:api
yarn migrate:worker
yarn build
node dist/main-api.js                                 # terminal 1
node dist/main-worker.js                              # terminal 2
```

Submit and watch delivery:

```bash
curl -X POST http://localhost:3000/v1/email-jobs \
  -H "x-api-key: local-dev-api-key-change-me-please" \
  -H "idempotency-key: first-email-001" \
  -H "content-type: application/json" \
  -d '{"tenantId":"demo","from":"sender@example.com","to":"recipient@example.com","subject":"Hello","text":"First email"}'

curl http://localhost:3000/v1/email-jobs/<id>         # status: DELIVERED
```

Mailpit inbox: http://localhost:8025 - RabbitMQ UI: http://localhost:15672 - Grafana: http://localhost:3100

## API

| Method | Path | Description |
|---|---|---|
| POST | `/v1/email-jobs` | submit email job; 201, idempotent via `Idempotency-Key` |
| GET | `/v1/email-jobs/:id` | status from the api-owned projection |
| GET | `/health` | liveness with dependency checks |
| GET | `/metrics` | Prometheus metrics |

## Benchmarks

Measured on the production topology: fully containerized (8 api replicas behind nginx, 8 workers, RabbitMQ, dual PostgreSQL, Redis, Mailpit on one Docker network). Zero loss is verified independently from per-service SQL ledgers: submitted = ledger rows = delivered. Reproduce with one command, any OS:

```bash
node benchmark/run.mjs --rate 450 --workers 8         # headline run
node benchmark/run.mjs --concurrency 400 --workers 8  # saturation (optional)
```

| Scenario | Sustained | p50 | p95 | p99 | Jobs | Loss |
|---|---:|---:|---:|---:|---:|---:|
| Production load, worker killed mid-load | 611 jobs/s | 28 ms | 67 ms | 126 ms | 43,365 | 0 |
| Saturation, worker killed mid-load | ~900 jobs/s | - | - | - | 71,056 | 0 |
| Submission ceiling | 1,178 req/s | | | 0 failed requests | | |

611 jobs/s sustained = 52M+ emails/day capacity on a single machine. Exactly-once rate: 99.99% across all chaos runs.

**Crash recovery:** a worker container is hard-killed at t+30s mid-load and replaced. Unacknowledged messages redeliver; the ledger confirms zero loss; the drain completes without operator action.

## Repository layout

```text
src/main-api.ts           api entry point
src/main-worker.ts        worker entry point
src/contracts/            zod schemas, topology, error classes - single source of truth
src/email-jobs/           api domain: submission, idempotency, status projection
src/delivery/             worker domain: consumer, retry policy, idempotency guard
src/providers/            smtp provider behind an EmailProvider port
src/resilience/           token-bucket rate limiter, circuit breaker
src/infra/                rabbitmq, prisma, pg, redis, logger, metrics modules
src/common/               guards, filters, pipes
prisma/                   dual schemas + migrations (one per database)
benchmark/                load generator + chaos benchmark harness
docker/                   compose files, nginx, prometheus, grafana provisioning
```