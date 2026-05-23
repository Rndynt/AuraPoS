# Offline Engine (Sprint 1)

Implemented foundation:
- `@pos/offline` package with Dexie DB and typed entities.
- Database name: `AuraPoSOfflineDB`.
- Initial tables include catalog cache, local orders/payments, print jobs, outbox, conflicts, sync metadata.
- Terminal identity persistence via IndexedDB + localStorage key.

Not yet included:
- Background sync worker.
- Conflict-specific resolver executors.
- Full local-first repository abstraction.
