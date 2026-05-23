# AuraPoS Offline Architecture

## Modes
- `online`: server API + local cache both available.
- `offline`: no server access; POS writes to local DB and outbox.
- `syncing`: online, outbox draining and mapping local->server IDs.
- `degraded`: partial capability because cache/session missing or stale.
- `conflict`: at least one outbox item requires review.

## Data Sources
- PostgreSQL API is source of truth.
- IndexedDB (`AuraPoSOfflineDB`) is local working store.
- `sync_outbox` is durable mutation queue.

## Core Principles
- Every offline order has `localId`.
- Every mutation has `idempotencyKey`.
- Printing goes through local print queue.
- UI treats orders as local until status is `synced`.

## Conflict Policy
Conflicts to classify and resolve: price changed, product inactive, stock unavailable, payment duplicate, order duplicate, tenant config changed.

## Operational Limits
- Maximum offline duration: tenant policy (recommended 24h hard warning).
- Maximum pending orders: tenant policy (recommended 500).
- Product cache size: bounded by active catalog snapshot.
- Stock-sensitive offline selling: configurable by tenant risk policy.

## Recovery
- Refresh/tab crash/device shutdown: recover from IndexedDB.
- Printer failure: keep pending print job.
- Partial sync failure: preserve succeeded items and retry failed/conflict items.

## Data Flow (Simplified)
`Cart -> Local Order/Payment -> sync_outbox + print_jobs -> Sync Engine -> API with idempotency -> local mapping update`.
