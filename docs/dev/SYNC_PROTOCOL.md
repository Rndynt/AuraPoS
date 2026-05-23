# Sync Protocol (Planned Contract)

1. Offline mutation writes to `sync_outbox` with `idempotencyKey`.
2. Sync engine sends queued operations in deterministic order.
3. Server returns created/replayed/conflict/failed per item.
4. Client updates local entities and conflict records.

Status model:
- pending -> syncing -> synced|failed|conflict
