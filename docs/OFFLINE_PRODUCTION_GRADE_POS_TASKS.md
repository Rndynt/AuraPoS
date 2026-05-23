# Offline Production Grade POS Tasks

This file tracks the implementation checklist for the offline-first production rollout.

## Sprint 1 — Offline Foundation (Current Batch)
- [x] Add PWA plugin + manifest + service worker registration in POS terminal.
- [x] Add network status hook and badge in terminal layout.
- [x] Create `@pos/offline` package.
- [x] Add Dexie IndexedDB schema (`AuraPoSOfflineDB`) and typed tables.
- [x] Add terminal identity service + React hook.
- [x] Add offline architecture and developer protocol documentation.
- [ ] Add robust offline fallback page served by service worker (next batch hardening).
- [ ] Add sync engine and outbox execution loop.
- [x] Add cart persistence bridge to IndexedDB (with legacy sessionStorage migration + TTL expiry).

- [x] Add offline network fallback for draft save to local device draft storage.

- [x] Add local draft sheet UI for resume/delete local device drafts.

## Next Sprints
Remaining phases from the master roadmap are pending and will be implemented incrementally in future batches.

- [x] Sync status widget baseline (pending/failed/conflict/last sync) in layout.

- [x] Outbox primitives added (enqueue/dequeue/mark sync states/backoff/manual retry).

- [x] Sync engine baseline added (app open/online/interval/manual trigger with outbox processing).

- [x] Local orders page baseline added (/local-orders) with filter and search by sync status.
