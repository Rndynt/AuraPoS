# Northflow Payment Orchestration

Standalone payment orchestration service extracted from the AuraPoS monorepo.

## Overview

A self-contained payment orchestration system providing:
- Payment intent lifecycle management (requires_payment → partially_paid → paid)
- Multi-provider architecture (FakeGateway dev/test, Xendit sandbox)
- Atomic webhook processing with idempotency
- Background workers for expiry and reconciliation
- Typed HTTP client SDK (`@northflow/payment-orchestration-client-sdk`)

## Packages

| Package | Path | Description |
|---|---|---|
| `@northflow/payment-orchestration-core` | `packages/core/` | Domain types, DTOs, repository contracts |
| `@northflow/payment-orchestration-client-sdk` | `packages/client-sdk/` | Typed HTTP client SDK |
| `@northflow/payment-orchestration-service` | `apps/service/` | Express REST service + workers |

## Quick Start

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and PAYMENT_ORCHESTRATION_SERVICE_TOKEN

# Run database migrations
pnpm db:migrate

# Start the service
pnpm dev
```

## Running Tests

```bash
# From repo root (requires DATABASE_URL env var)
pnpm test
```

Or run individual test files:

```bash
npx tsx --tsconfig tests/tsconfig.json --test tests/payment-orchestration-schema-mappers.test.ts
```

## Database Migrations

```bash
pnpm db:migrate    # apply migrations
pnpm db:generate   # generate new migration from schema changes
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

- `PAYMENT_ORCHESTRATION_DATABASE_URL` — PostgreSQL connection string
- `PAYMENT_ORCHESTRATION_SERVICE_TOKEN` — service-to-service auth token
- `PAYMENT_ORCHESTRATION_SERVICE_PORT` — HTTP port (default: 5100)
- `PAYMENT_ORCHESTRATION_FAKEGATEWAY_WEBHOOK_SECRET` — webhook HMAC secret

## API

Service runs on port 5100 by default. See `docs/payment-orchestration-api-contract.md`.

Authentication: all routes except `/v1/webhooks/:provider` require header:
```
x-payment-orchestration-service-token: <your-token>
```

## Docker

```bash
docker build -t northflow-payment-orchestration .
docker run -p 5100:5100 \
  -e PAYMENT_ORCHESTRATION_DATABASE_URL=... \
  -e PAYMENT_ORCHESTRATION_SERVICE_TOKEN=... \
  northflow-payment-orchestration
```

## Project Phase

Phase: **8L** — Standalone repo extraction
Config version: `0.3.0` (8K)
