# AuraPoS — Production Grade Offline POS Task List

> **Last updated:** May 2026
> **Legend:** `[x]` = implemented & merged, `[~]` = partially / stub only, `[ ]` = not yet started.

---

## 0. Goal

Make AuraPoS a production-grade offline-first POS PWA that remains usable by cashiers when the internet is down, and safely synchronizes back to the server when the connection returns.

**Final target:**

- POS terminal can open without internet.
- Products, categories, order types, tables, and tenant features are available offline.
- Cashiers can create orders, payments, drafts, and print receipts while offline.
- Offline data is stored safely in IndexedDB.
- All offline transactions are added to a sync queue.
- Sync is safe from duplicate orders and duplicate payments using idempotency keys.
- There is conflict handling for price changes, stock, inactive products, and payments.
- There is a print queue for receipts and kitchen tickets.
- There is a clear sync status UI for cashiers.
- Backend is ready to receive retries from multiple terminals without creating duplicates.
- There are unit tests, integration tests, E2E tests, and recovery tests.

---

## 1. Current Codebase Baseline

### 1.1 Existing Strength

- [x] TypeScript monorepo: `apps/pos-terminal-web`, `apps/api`, `packages/domain`, `packages/application`, `packages/infrastructure`, `shared/schema.ts`.
- [x] POS terminal: product browsing, cart, mobile drawer, desktop cart panel, product option dialog, payment dialog, partial payment, save draft, continue order, order queue, kitchen status action.
- [x] Backend: order schema, order items, modifiers, payment, kitchen ticket, tables, tenant features.
- [x] `CreateAndPayOrder` uses DB transaction (create order + insert payment + update status).
- [x] `RecordPayment` uses transaction + row lock `FOR UPDATE` for concurrent safety.
- [x] Web Bluetooth receipt printer (reconnect, pairing, ESC/POS, chunk writing).
- [x] POS page uses `useCreateAndPay`, `useRecordPayment`, `useCreateKitchenTicket`, `useOrders`.

### 1.2 Gap Status (Sprint 6 complete)

- [x] PWA service worker via `vite-plugin-pwa` — configured with NetworkFirst + navigateFallback.
- [x] `dexie ^4.0.8` in `packages/offline` and `apps/pos-terminal-web`.
- [x] `nanoid ^5.1.6` in `packages/offline`.
- [x] Cart saved to IndexedDB via `cartStore.ts` (with legacy sessionStorage migration).
- [x] Frontend uses `useOfflineOrderSubmit` — local-first with outbox queue.
- [x] `sync_outbox`, `local_orders`, `local_payments`, `print_jobs` — IndexedDB schema v2.
- [x] Sync engine — `runSyncEngine()` in `packages/offline/src/syncEngine.ts`.
- [x] Offline conflict types — `conflictTypes.ts` frontend + backend mirror.
- [x] Cashier sync status — `SyncStatusWidget.tsx` wired into `MainLayout` header.
- [x] Backend sync endpoint — `POST /api/sync/offline-orders` (batch, per-item result).
- [x] Terminal registry — `POST /api/terminals/register`, heartbeat endpoint.
- [x] Print queue — `packages/offline/src/printQueue.ts` + `usePrintWorker` background worker.
- [x] Kitchen queue offline — `packages/offline/src/kitchenQueue.ts` + `LocalKitchenTicket` IndexedDB table.
- [x] Draft orders — `packages/offline/src/draftOrders.ts`.
- [x] Local orders page — `/local-orders` with filter, retry, reprint.
- [x] Sync conflicts page — `/sync-conflicts` with severity filter, resolve/ignore actions.
- [x] Sync audit tables — `sync_batches`, `sync_events`, `server_sync_conflicts` in schema.
- [x] `useOfflineProducts` — standalone offline-first hook with `isFromCache` flag and `cacheAge`.
- [x] `useOfflineTenantFeatures` — standalone offline-first hook with `hasFeature(key)` helper.
- [x] `packages/application` exports `./sync/*` path.
- [x] `CreateAndPayOrder` writes `inventory_movements` ledger for online sales (Sprint 6).

---

## Phase 1 — Define Offline Architecture ✅ COMPLETE

### 1.1 Create Offline Architecture Document

- [x] `docs/OFFLINE_ARCHITECTURE.md` created.
- [x] Application modes: `online`, `offline`, `syncing`, `degraded`, `conflict`.
- [x] Data sources: Server PostgreSQL → source of truth, IndexedDB → local working DB, Outbox → mutation queue.
- [x] Core principles: `localId`, `idempotencyKey`, print queue, sync status semantics.
- [x] Conflict policy matrix: price, product, stock, payment, order, tenant config, table.
- [x] Offline limits defined (24h catalog cache, 8 retry attempts, 50 orders per batch).
- [x] Recovery behavior defined (browser refresh, crash, printer failure, partial sync failure).
- [x] Data flow diagram: Cart → createLocalOrder → outbox → runSyncEngine → server.
- [x] Print flow diagram: enqueuePrintJob → usePrintWorker → printer.
- [x] Service worker caching strategy table.
- [x] Multi-terminal considerations.
- [x] Security considerations.

---

## Phase 2 — PWA Foundation ✅ COMPLETE

### 2.1 Install PWA Dependencies

- [x] `dexie ^4.0.8` in `packages/offline/package.json`.
- [x] `nanoid ^5.1.6` in `packages/offline/package.json`.
- [x] `vite-plugin-pwa ^0.21.2` in `apps/pos-terminal-web/package.json`.
- [x] `VitePWA` configured in `vite.config.ts`: workbox, NetworkFirst cache, navigateFallback.
- [x] `manifest.webmanifest` — standalone, landscape orientation, blue theme, `/pos` start URL.
- [x] PWA icons: `icon.svg` (any/maskable), `icon-192.png` (192×192), `icon-512.png` (512×512).

### 2.2 PWA Update and Install Prompts

- [x] `PwaUpdatePrompt.tsx` — "Versi baru tersedia. Perbarui aplikasi?" toast with reload button.
- [x] `PwaInstallPrompt.tsx` — install prompt for Android/desktop browsers.
- [x] Both prompts wired into `App.tsx`.

### 2.3 Add Offline Detection

- [x] `useNetworkStatus.ts` hook — `navigator.onLine`, `lastOnlineAt`, `lastOfflineAt`, `NetworkMode`.
- [x] `NetworkStatusBadge.tsx` — Online / Syncing (N) / Offline badge with animated spinner.
- [x] `SyncStatusWidget.tsx` — color-coded widget with pending/failed/conflict counts + manual sync button.
- [x] `OfflineCacheBanner.tsx` — shows catalog age when offline; warns if stale (>6h).
- [x] `SyncStatusWidget` wired into `MainLayout` top status strip (always visible, alongside print alert).
- [x] `OfflineCacheBanner` wired into POS page header (shows only when offline).

---

## Phase 3 — Local Database / IndexedDB ✅ COMPLETE

### 3.1 Create Offline Package

- [x] `packages/offline/package.json` — `@pos/offline` workspace package.
- [x] `packages/offline/src/db.ts` — `AuraPosOfflineDb extends Dexie`, versioned schema v1→v2.
- [x] `packages/offline/src/schema.ts` — DB name `"AuraPoSOfflineDB"` and version constants.
- [x] `packages/offline/src/types.ts` — all TypeScript types.
- [x] `packages/offline/src/index.ts` — re-exports all public API.
- [x] `packages/offline/tsconfig.json` — extends `tsconfig.base.json`, composite, declaration.

**IndexedDB Tables (v2 schema):**

| Table | Purpose |
|-------|---------|
| `local_orders` | Offline-created orders with `syncStatus` |
| `local_payments` | Payments attached to local orders |
| `local_products` | Cached product catalog |
| `local_categories` | Cached product categories |
| `local_order_types` | Cached order types |
| `local_features` | Cached tenant features/modules |
| `local_kitchen_tickets` | Offline kitchen tickets |
| `sync_outbox` | Mutation queue (pending/failed/synced) |
| `print_jobs` | Print queue (pending/printing/done/failed) |
| `draft_carts` | Draft orders (cart state) |
| `sync_meta` | Key-value store for cache timestamps |

### 3.2 Terminal Identity

- [x] `packages/offline/src/terminal.ts` — `getOrCreateTerminalIdentity(tenantId)`.
- [x] Generates `terminalId` (nanoid) + `terminalName` on first run.
- [x] Persisted in `localStorage` under `pos_terminal_{tenantId}`.
- [x] `useTerminalIdentity.ts` React hook for UI access.
- [x] `useTerminalHeartbeat.ts` — registers terminal on mount, sends PATCH heartbeat every 5 minutes.

### 3.3 Cart Store

- [x] `packages/offline/src/cartStore.ts` — `saveCart`, `loadCart`, `clearCart`.
- [x] Migrates legacy `sessionStorage` cart on first load.
- [x] Cart survives browser refresh and crash.

### 3.4 Catalog Cache

- [x] `packages/offline/src/catalogCache.ts` — products, categories, `cachedAt` timestamp.
- [x] `saveCachedProducts` / `getCachedProducts` / `saveCachedCategories` / `getCachedCategories`.
- [x] `updateCatalogCachedAt` / `getCatalogCachedAt` / `isCatalogStale`.
- [x] Wired into `useProducts()` in `hooks/api/useProducts.ts`.
- [x] Wired into main `useProducts()` in `lib/api/hooks.ts`.

### 3.5 Tenant Cache

- [x] `packages/offline/src/tenantCache.ts` — order types, features, `cachedAt` timestamp.
- [x] `saveCachedOrderTypes` / `getCachedOrderTypes` / `saveCachedFeatures` / `getCachedFeatures`.
- [x] `updateTenantCachedAt` / `getTenantCachedAt` / `isTenantCacheStale`.
- [x] Wired into `useOrderTypes()` and `useFeatures()` in `lib/api/hooks.ts`.

### 3.6 Standalone Offline Hooks (Sprint 6)

- [x] `useOfflineProducts.ts` — wraps catalog fetch + IndexedDB fallback; exposes `isFromCache`, `cacheAge`, `error`.
- [x] `useOfflineTenantFeatures.ts` — wraps order types + features fetch; exposes `isFromCache`, `hasFeature(key)`, `cacheAge`.

---

## Phase 4 — Offline Order Flow ✅ COMPLETE

### 4.1 Idempotency Key Generator

- [x] `packages/offline/src/idempotency.ts` — `generateIdempotencyKey()` using nanoid.
- [x] Key format: `{terminalId}-{timestamp}-{random}` (URL-safe, 36 chars).
- [x] Frontend sends `idempotency_key` on every create/pay mutation.
- [x] Backend deduplicates via `order_payments.idempotency_key` unique constraint.

### 4.2 Local Order Number Generator

- [x] `packages/offline/src/orderNumber.ts` — `generateLocalOrderNumber()`.
- [x] Format: `OFF-{terminalShort}-{date}-{seq}` (e.g., `OFF-ABC123-20260524-0001`).
- [x] Sequence counter persisted in IndexedDB `sync_meta`.
- [x] Guaranteed unique within a terminal session.

### 4.3 Local Order Service

- [x] `packages/offline/src/localOrderService.ts` — `createLocalOrder(input)`.
- [x] Creates `LocalOrder` + `LocalPayment` in IndexedDB atomically.
- [x] Adds entry to `sync_outbox` immediately after order creation.
- [x] Returns `localId` + `localOrderNumber` + `idempotencyKey`.

### 4.4 Outbox Queue

- [x] `packages/offline/src/outbox.ts` — CRUD helpers for `sync_outbox` table.
- [x] `enqueueSync`, `getPendingSyncItems`, `markSyncItemSuccess`, `markSyncItemFailed`.
- [x] `retryCount` incremented on failure; items skipped after 8 retries (`maxRetries`).

### 4.5 Offline Order Submit Hook

- [x] `apps/pos-terminal-web/src/hooks/useOfflineOrderSubmit.ts`.
- [x] Wraps `createLocalOrder` — creates local order + enqueues outbox entry.
- [x] Falls back to local-only when `navigator.onLine === false`.
- [x] Used in POS page as the primary order creation path.

---

## Phase 5 — Sync Engine ✅ COMPLETE

### 5.1 Sync Engine Core

- [x] `packages/offline/src/syncEngine.ts` — `runSyncEngine(tenantId)`.
- [x] Reads pending items from `sync_outbox`.
- [x] Batches up to 50 orders per request (`MAX_BATCH_SIZE`).
- [x] Sends `POST /api/sync/offline-orders` with tenant header + idempotency keys.
- [x] Per-item result handling: `success`, `duplicate` (replay), `conflict`, `error`.
- [x] Updates `syncStatus` on `local_orders` after each item resolves.
- [x] Exponential backoff: 1s → 2s → 4s → … → 128s (8 attempts max).
- [x] `getOutboxSummary()` — counts pending/failed/conflict for UI widget.

### 5.2 useSyncEngine Hook

- [x] `apps/pos-terminal-web/src/hooks/useSyncEngine.ts`.
- [x] Calls `runSyncEngine` on mount and on network reconnect.
- [x] Exposes `pendingCount`, `failedCount`, `conflictCount`, `isSyncing`, `triggerSync()`.

### 5.3 SyncStatusWidget

- [x] `apps/pos-terminal-web/src/components/offline/SyncStatusWidget.tsx`.
- [x] Shows P/F/C counts with color coding (green/yellow/red).
- [x] Manual "Sync Now" button triggers immediate sync.
- [x] Wired into `MainLayout` header (visible on every page).

---

## Phase 6 — Backend Sync Endpoint ✅ COMPLETE

### 6.1 Sync Controller

- [x] `apps/api/src/http/controllers/SyncController.ts`.
- [x] `POST /api/sync/offline-orders` — accepts batch of `SyncOrderItemInput[]`.
- [x] Returns `SyncBatchResult` with per-item `status`, `serverId`, `serverOrderNumber`.
- [x] Per-item idempotency dedup before any DB write.
- [x] Writes `sync_batches` record + `sync_events` per item for audit.
- [x] Tenant header required; 403 on mismatch.

### 6.2 SyncOfflineOrder Use Case

- [x] `packages/application/sync/SyncOfflineOrder.ts` (370 lines).
- [x] Phase 10.2: Price conflict detection (`PRICE_CHANGED`) — accepts offline price + audit note.
- [x] Phase 10.3: Stock conflict detection (`STOCK_INSUFFICIENT`) — allows negative stock (configurable).
- [x] Phase 17.1: Writes `inventory_movements` ledger after each successful offline order sync.
- [x] `packages/application/package.json` exports `./sync/*` path.

### 6.3 Terminal Registry

- [x] `apps/api/src/http/controllers/TerminalsController.ts`.
- [x] `POST /api/terminals/register` — upsert terminal by `terminal_code`.
- [x] `PATCH /api/terminals/:id/heartbeat` — update `last_seen_at`.
- [x] `GET /api/terminals` — list all terminals for tenant.
- [x] `shared/schema.ts` — `terminals` table with tenant/code unique constraint.

### 6.4 Sync Audit Tables

- [x] `shared/schema.ts` — `sync_batches`, `sync_events`, `server_sync_conflicts` tables.
- [x] `sync_batches`: `id`, `tenantId`, `terminalId`, `batchSize`, `successCount`, `failCount`, `status`.
- [x] `sync_events`: `id`, `batchId`, `tenantId`, `localEntityId`, `status`, `conflictType`, `conflictData`.
- [x] `server_sync_conflicts`: `id`, `tenantId`, `terminalId`, `conflictType`, `severity`, `status`, `conflictData`.

---

## Phase 7 — Conflict Detection & Resolution ✅ COMPLETE

### 7.1 Conflict Types

- [x] `packages/offline/src/conflictTypes.ts` — frontend enum + policy matrix.
- [x] `packages/application/sync/conflictTypes.ts` — backend mirror.
- [x] 8 conflict types with severity (`low`, `medium`, `high`, `critical`) + resolution policy.

**Conflict Policy Matrix:**

| Conflict Type | Severity | Policy |
|---------------|----------|--------|
| `PRICE_CHANGED` | low | Accept offline price, audit note |
| `PRODUCT_INACTIVE` | medium | Reject, cashier must resubmit |
| `PRODUCT_NOT_FOUND` | high | Reject, admin review |
| `STOCK_INSUFFICIENT` | medium | Accept if `allowNegativeStock`, else reject |
| `DUPLICATE_ORDER` | low | Replay idempotent result (safe) |
| `DUPLICATE_PAYMENT` | low | Replay idempotent result (safe) |
| `FEATURE_DISABLED` | high | Reject, contact owner |
| `TABLE_CONFLICT` | medium | Accept, flag for admin review |

### 7.2 Sync Conflicts UI

- [x] `/sync-conflicts` page — lists `server_sync_conflicts` with severity filter.
- [x] Resolve / Ignore actions for owner/manager.
- [x] Conflict count shown in `SyncStatusWidget` header badge.

---

## Phase 8 — Print Queue ✅ COMPLETE

### 8.1 Print Queue Core

- [x] `packages/offline/src/printQueue.ts` — `enqueuePrintJob`, `getPendingPrintJobs`, `markPrintJobDone`, `markPrintJobFailed`.
- [x] Print job types: `receipt`, `kitchen_ticket`.
- [x] `print_jobs` table in IndexedDB with `status`, `retryCount`, `payload`.

### 8.2 Print Worker Hook

- [x] `apps/pos-terminal-web/src/hooks/usePrintWorker.ts`.
- [x] Background loop processes pending `print_jobs` every 10s.
- [x] Uses `getActivePrinterProvider()` — BluetoothPrinterProvider or BrowserPrintProvider.
- [x] Auto-retries failed jobs up to 3 times.
- [x] Stops loop when tab loses focus, resumes on focus.

### 8.3 Printer Provider Abstraction

- [x] `apps/pos-terminal-web/src/lib/printerProvider.ts`.
- [x] `PrinterProvider` interface: `id`, `label`, `isAvailable()`, `print(payload)`.
- [x] `BluetoothPrinterProvider` — wraps `bluetoothReceiptPrinter`.
- [x] `BrowserPrintProvider` — generates 80mm HTML receipt + `window.print()` fallback.
- [x] `getActivePrinterProvider()` — returns best available provider.
- [x] `ALL_PRINTER_PROVIDERS` — registry for settings UI.

### 8.4 Print Queue UI

- [x] `PrintQueuePanel.tsx` — shows pending/failed print jobs with retry button.
- [x] Print alert badge in `MainLayout` header alongside `SyncStatusWidget`.

---

## Phase 9 — Kitchen Queue (Offline) ✅ COMPLETE

- [x] `packages/offline/src/kitchenQueue.ts` — `enqueueKitchenTicket`, `getPendingKitchenTickets`, `markKitchenTicketSent`.
- [x] `LocalKitchenTicket` stored in IndexedDB `local_kitchen_tickets`.
- [x] Kitchen tickets queued offline; sent to KDS when connection returns.

---

## Phase 10 — Draft Orders ✅ COMPLETE

- [x] `packages/offline/src/draftOrders.ts` — `saveDraftOrder`, `loadDraftOrder`, `clearDraftOrder`.
- [x] Draft state = cart + order metadata (table, customer, order type, notes).
- [x] Survives browser refresh, crash, and power loss.
- [x] Draft counter shown in POS header.

---

## Phase 11 — Local Orders Page ✅ COMPLETE

- [x] `/local-orders` page — filter by status (pending/synced/failed/conflict).
- [x] `LocalOrderList.tsx` component — status badges, retry button, reprint button.
- [x] Retry triggers `runSyncEngine` for that specific item.
- [x] Reprint enqueues a new `print_job` for the local order receipt.
- [x] Route protected behind auth; wired into `App.tsx`.

---

## Phase 12 — PWA Install & Update ✅ COMPLETE

- [x] `PwaInstallPrompt.tsx` — "Instal AuraPoS Terminal" banner for Android/desktop.
- [x] `PwaUpdatePrompt.tsx` — "Versi baru tersedia" toast when service worker updates.
- [x] Both use `vite-plugin-pwa` virtual module (`virtual:pwa-register/react`).
- [x] Wired into `App.tsx` at root level.

---

## Phase 13 — Offline Cache Banner ✅ COMPLETE

- [x] `OfflineCacheBanner.tsx` — shown in POS when `!isOnline`.
- [x] Displays catalog age (e.g., "Data produk terakhir diperbarui 2 jam lalu").
- [x] Warns in amber if cache age > 6 hours.
- [x] Wired into POS page header area.

---

## Phase 14 — Developer Documentation ✅ COMPLETE

- [x] `docs/dev/OFFLINE_ENGINE.md` — package structure, DB schema, API reference, all modules (553 lines).
- [x] `docs/dev/SYNC_PROTOCOL.md` — outbox lifecycle, batch request/response, retry backoff, audit (333 lines).
- [x] `docs/dev/IDEMPOTENCY.md` — key format, frontend/backend usage, DB constraint, debugging (251 lines).
- [x] `docs/dev/CONFLICT_RESOLUTION.md` — conflict types, severity matrix, detection, resolution UI (353 lines).

---

## Phase 15 — User Documentation ✅ COMPLETE

- [x] `docs/user/OFFLINE_MODE_GUIDE.md` — cashier guide: install PWA, sync status indicators, offline limits, troubleshooting.
- [x] `docs/user/PRINTER_GUIDE.md` — printer pairing, supported devices, ESC/POS format, troubleshooting table.
- [x] `docs/user/SYNC_ERROR_GUIDE.md` — sync error types, conflict types explained, manager conflict resolution steps.

---

## Phase 16 — Inventory Movements Ledger ✅ COMPLETE (Sprint 6)

### 16.1 Schema

- [x] `inventory_movements` table in `shared/schema.ts` — `tenantId`, `productId`, `orderId`, `terminalId`, `movementType`, `quantityDelta`, `quantityBefore`, `quantityAfter`, `unitCost`, `notes`, `actorId`.
- [x] Indexes on tenant, product, order for fast reporting queries.

### 16.2 Online Sales Wiring (Sprint 6)

- [x] `CreateAndPayOrder` writes a `sale` movement for every item inside the DB transaction.
- [x] Movement write is non-fatal — failure does not abort the sale transaction.
- [x] `movementType = 'sale'`, `quantityDelta = -qty` (negative = stock out).

### 16.3 Offline Sync Wiring

- [x] `SyncOfflineOrder` writes `inventory_movements` ledger after each successful offline order sync (Phase 17.1).

---

# Recommended Implementation Order (Next Steps)

## Sprint 7 — Void / Refund + Manager Approval

- [ ] `refunds` table in `shared/schema.ts` with `orderId`, `amount`, `reason`, `status`, `approvedBy`, `approvedAt`.
- [ ] `RecordRefund` use case — manager PIN gate, audit trail.
- [ ] Void flow: mark order `voided`, reverse inventory movements, notify KDS.
- [ ] Refund writes movement `refund` with positive `quantityDelta`.
- [ ] Offline refund: queue in outbox; server validates manager approval.

## Sprint 8 — RBAC + Security Hardening

- [ ] Add role-based permission checks on backend routes.
- [ ] `ALLOW_TENANT_HEADER=false` env flag to enforce JWT-based tenant extraction.
- [ ] Offline session expiry + local PIN unlock (cashier re-authentication).
- [ ] Terminal deactivation blocks sync (`terminals.is_active = false`).
- [ ] Rate limiting on sync endpoint (max 100 items per batch, max 10 batches/min per terminal).

## Sprint 9 — Testing and CI

- [ ] Unit tests for offline engine core functions (`fake-indexeddb` + `Vitest`).
- [ ] Backend integration tests: idempotency dedup, batch sync, conflict detection.
- [ ] Playwright E2E: offline create order → reload → sync → verify server order.
- [ ] Recovery tests: partial sync failure, printer failure, terminal restart.
- [ ] CI pipeline: all type-checks + PWA build verification + E2E on every PR.

## Sprint 10 — Stock Report from Movements Ledger

- [ ] `GET /api/inventory/stock-summary` — aggregate `quantityDelta` by product per tenant.
- [ ] Stock report page at `/stock` shows computed stock level per product.
- [ ] Low-stock alert badge on dashboard (threshold configurable per product).
- [ ] `quantityBefore` / `quantityAfter` snapshot on every movement write.

## Sprint 11 — Production Rollout

- [ ] Feature flag `offline_pos_v1` (tenant-level, controlled from admin).
- [ ] Monitoring dashboard: sync success rate, conflict rate, pending queue depth.
- [ ] Pilot tenant validation (1 cafe, 1 retail).
- [ ] Production runbook: how to drain stuck queues, force re-sync, clear conflicts.

---

# Definition of Done — Production Grade Offline POS

AuraPoS can only be considered production-grade offline POS when **all** of these are true:

**PWA Basics:**
- [x] App can be installed as PWA on Android/desktop.
- [x] `/pos` can be opened and refreshed while offline.
- [x] App shell loads from service worker cache without network.

**Data Availability Offline:**
- [x] Products/categories/order types/features are available offline (cached in IndexedDB).
- [x] Cart and draft do not disappear after refresh or crash.
- [x] `useOfflineProducts` and `useOfflineTenantFeatures` hooks expose `isFromCache` flag for UI warnings.

**Offline Transaction Flow:**
- [x] Offline order can be created with local order number (`OFF-...`).
- [x] Offline payment can be recorded.
- [x] Receipt added to print queue; auto-printed when printer available.
- [x] All offline transactions enter outbox.

**Sync Safety:**
- [x] Sync is safe from duplicate order/payment (idempotency key).
- [x] Idempotency key sent from frontend on every mutation.
- [x] Price/stock/product/table conflict types defined with severity + policy.
- [x] Cashier can see pending/failed/conflict sync (SyncStatusWidget).

**Inventory Ledger:**
- [x] Online sales write `inventory_movements` (`sale` type) via `CreateAndPayOrder`.
- [x] Offline synced orders write `inventory_movements` via `SyncOfflineOrder`.
- [ ] Stock reports derived from movements ledger (Sprint 10).

**Admin Observability:**
- [x] Admin can audit sync (`sync_batches`, `sync_events`, `/sync-conflicts` page).
- [x] Tenant isolation enforced on all sync endpoints.
- [x] Terminal can be registered and deactivated.

**Production Ready (pending):**
- [ ] Refund/void has audit trail (Sprint 7).
- [ ] Offline E2E tests pass (Sprint 9).
- [ ] CI pipeline with PWA build check (Sprint 9).
- [ ] Feature flag `offline_pos_v1` per tenant (Sprint 11).
