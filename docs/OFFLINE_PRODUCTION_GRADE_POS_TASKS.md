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

- [x] TypeScript monorepo with `apps/pos-terminal-web`, `apps/api`, `packages/domain`, `packages/application`, `packages/infrastructure`, and `shared/schema.ts`.
- [x] POS terminal: product browsing, cart, mobile drawer, desktop cart panel, product option dialog, payment dialog, partial payment, save draft, continue order, order queue, kitchen status action.
- [x] Backend: order schema, order items, modifiers, payment, kitchen ticket, tables, tenant features.
- [x] `CreateAndPayOrder` uses DB transaction (create order + insert payment + update status).
- [x] `RecordPayment` uses transaction + row lock `FOR UPDATE` for concurrent safety.
- [x] Web Bluetooth receipt printer (reconnect, pairing, ESC/POS, chunk writing).
- [x] POS page uses `useCreateAndPay`, `useRecordPayment`, `useCreateKitchenTicket`, `useOrders`.

### 1.2 Gap Status (as of Sprint 4 complete)

- [x] PWA service worker via `vite-plugin-pwa` — configured.
- [x] `dexie` and `nanoid` — in `packages/offline` and `apps/pos-terminal-web`.
- [x] Cart saved to IndexedDB via `cartStore.ts`.
- [x] Frontend uses `useOfflineOrderSubmit` — local-first with outbox queue.
- [x] `sync_outbox`, `local_orders`, `local_payments`, `print_jobs` — IndexedDB schema.
- [x] Sync engine — `runSyncEngine()` in `packages/offline/src/syncEngine.ts`.
- [x] Offline conflict types — `conflictTypes.ts` frontend + backend mirror.
- [x] Cashier sync status — `SyncStatusWidget.tsx` in main layout.

---

## Phase 1 — Define Offline Architecture ✅ COMPLETE

### 1.1 Create Offline Architecture Document

- [x] `docs/OFFLINE_ARCHITECTURE.md` created
- [x] Application modes: `online`, `offline`, `syncing`, `degraded`, `conflict`
- [x] Data sources: Server PostgreSQL → source of truth, IndexedDB → local working DB, Outbox → mutation queue
- [x] Core principles: `localId`, `idempotencyKey`, print queue, sync status semantics
- [x] Conflict policy: price, product, stock, payment, order, tenant config, table
- [x] Offline limits defined
- [x] Recovery behavior defined
- [x] Data flow diagram included

---

## Phase 2 — PWA Foundation ✅ COMPLETE

### 2.1 Install PWA Dependencies

- [x] `dexie ^4.0.8` in `packages/offline/package.json`
- [x] `nanoid ^5.1.6` in `packages/offline/package.json`
- [x] `vite-plugin-pwa ^0.21.1` in `apps/pos-terminal-web/package.json`
- [x] `VitePWA` configured in `vite.config.ts`: workbox, NetworkFirst cache, navigateFallback
- [x] `manifest.webmanifest` — standalone, landscape, blue theme, `/pos` start URL
- [x] PWA icons: `icon.svg` (any/maskable), `icon-192.png` (192×192), `icon-512.png` (512×512)
- [x] Service worker registered in `main.tsx` — clean registration, no duplicate `window.confirm`
- [x] `PwaUpdatePrompt.tsx` — "Versi baru tersedia. Perbarui aplikasi?" toast with Perbarui/Dismiss
- [x] `PwaUpdatePrompt` wired into `App.tsx` (renders outside router, always visible)
- [x] `devOptions.enabled: true` for dev testing
- [x] `<link rel="manifest" href="/manifest.webmanifest">` added to `index.html` (PWA installable)
- [ ] Dedicated offline fallback HTML page (currently `navigateFallback: "/index.html"`)

### 2.2 Add Offline Detection

- [x] `useNetworkStatus.ts` — `navigator.onLine`, `lastOnlineAt`, `lastOfflineAt`, `mode: online|offline|syncing`
- [x] `NetworkStatusBadge.tsx` — Online / Offline / Syncing badge with icon + count
- [x] `SyncStatusWidget.tsx` — pending/failed/conflict counts, last sync time, color badges, manual sync trigger
- [x] Both integrated in `MainLayout.tsx`
- [x] `OfflineCacheBanner.tsx` — stale catalog warning with timestamp

---

## Phase 3 — Local Database / IndexedDB ✅ COMPLETE

### 3.1 Create Offline Package

- [x] `packages/offline/package.json` — `@pos/offline`, dexie + nanoid deps
- [x] `packages/offline/src/db.ts` — `AuraPosOfflineDb extends Dexie`, singleton `offlineDb`
- [x] `packages/offline/src/schema.ts` — `OFFLINE_DB_NAME = "AuraPoSOfflineDB"`, `OFFLINE_DB_VERSION = 1`
- [x] `packages/offline/src/types.ts` — all entity types exported
- [x] `packages/offline/src/index.ts` — re-exports all modules
- [x] Tables with indexes: `local_tenants`, `local_features`, `local_products`, `local_categories`, `local_order_types`, `local_tables`, `local_terminal`, `local_cart_sessions`, `local_orders`, `local_order_items`, `local_order_payments`, `local_print_jobs`, `sync_outbox`, `sync_attempts`, `sync_conflicts`, `sync_meta`

### 3.2 Define Local Entity Types

- [x] `SyncStatus` union: `local_only | pending_sync | syncing | synced | failed | conflict | cancelled`
- [x] `TerminalIdentity` — `terminalId`, `tenantId`, `terminalName`, timestamps
- [x] `LocalProduct`, `LocalOrder`, `LocalOrderItem`, `LocalPayment`, `LocalPrintJob`
- [x] `SyncOutboxItem` — full shape with backoff fields
- [x] `SyncConflict` — `conflictType`, `syncStatus`, timestamps
- [x] All entities have `tenantId` ✅
- [x] All mutation entities have `idempotencyKey` ✅
- [x] All entities have `syncStatus` ✅

---

## Phase 4 — Terminal Identity ✅ COMPLETE

### 4.1 Create Terminal Registration (Frontend)

- [x] `packages/offline/src/terminal.ts` — `getOrCreateTerminalIdentity(tenantId)`
- [x] Terminal ID format: `TERM-{shortTenantId}-{nanoid(6)}`
- [x] Persisted in IndexedDB (`local_terminal`) + `localStorage` fallback
- [x] `useTerminalIdentity.ts` — React hook
- [x] `useTerminalHeartbeat.ts` — registers on backend, heartbeat every 5 min
- [ ] Terminal name UI setting (currently defaults to "Cashier 1")

### 4.2 Backend Terminal Registry

- [x] `TerminalsController.ts` — register, list, heartbeat, deactivate endpoints
- [x] `POST /api/terminals/register` (idempotent find-or-create)
- [x] `PATCH /api/terminals/:id/heartbeat`
- [x] `GET /api/terminals`
- [x] `PATCH /api/terminals/:id/deactivate`
- [ ] `terminals` DB table migration (Sprint 7)
- [ ] Admin UI to view/deactivate terminals

---

## Phase 5 — Local Catalog Cache ✅ COMPLETE

### 5.1 Cache Products Locally

- [x] `packages/offline/src/catalogCache.ts` — `saveCachedProducts`, `getCachedProducts`, `updateCatalogCachedAt`, `isCatalogStale`
- [x] `useProducts.ts` — saves to IndexedDB on fetch, reads from cache when offline
- [x] `lastSyncedAt` stored in `sync_meta`
- [x] Staleness check: default 24h, banner warning at 6h
- [x] `OfflineCacheBanner.tsx` — stale warning with last sync time
- [ ] Per-product stock tracking cache (Phase 17)
- [ ] Inactive product enforcement from local cache

### 5.2 Cache Tenant Features and Order Types

- [x] `packages/offline/src/tenantCache.ts` — `saveCachedOrderTypes`, `getCachedOrderTypes`, `saveCachedFeatures`, `getCachedFeatures`
- [x] Order types read from IndexedDB when offline
- [x] Features read from IndexedDB when offline
- [ ] Tax/service charge config cache
- [ ] Table list cache (Phase 15)

---

## Phase 6 — Replace Cart Persistence ✅ COMPLETE

### 6.1 Move Cart from sessionStorage to IndexedDB

- [x] `packages/offline/src/cartStore.ts` — `loadCartSession`, `saveCartSession`, `clearCartSession`
- [x] `migrateLegacySession()` — migrates from `sessionStorage` to IndexedDB
- [x] Cart TTL: 24 hours, tied to `tenantId`
- [ ] Cart recovery UI prompt on reload

### 6.2 Add Held Orders / Local Drafts

- [x] `packages/offline/src/draftOrders.ts` — `listLocalDraftOrders`, `saveLocalDraftOrder`, `deleteLocalDraftOrder`
- [x] Draft stored in `local_cart_sessions` with `draft:` prefix key
- [x] Draft fields: id, tenantId, customerName, tableNumber, items, total, timestamps
- [ ] `LocalDraftOrdersSheet.tsx` — browse/resume drafts in POS UI
- [ ] Draft → order conversion flow in POS page

---

## Phase 7 — Offline Order Creation ✅ COMPLETE

### 7.1 Create Local Order Service

- [x] `packages/offline/src/localOrderService.ts` — `createLocalOrder()`, `mirrorServerOrderLocally()`
- [x] `packages/offline/src/idempotency.ts` — `generateIdempotencyKey(terminalId)`
- [x] `packages/offline/src/orderNumber.ts` — `generateLocalOrderNumber(tenantId, terminalId)`
- [x] Local order number format: `OFF-{shortTerminalId}-{YYYYMMDD}-{seq:04}`
- [x] Sequence in `sync_meta`, per tenant per day, collision-free
- [x] Atomic IndexedDB transaction: order + items + payment
- [x] Outbox entry enqueued immediately after local save
- [x] Pricing: subtotal, tax_amount, service_charge_amount, total_amount

### 7.2 Modify POS Charge Flow

- [x] `useOfflineOrderSubmit.ts` — unified online/offline submit hook
- [x] Online path: POST to `/api/orders/create-and-pay` + `idempotency_key` header; mirror to local on success
- [x] Offline/error path: `createLocalOrder()` → outbox → local order number shown
- [x] Error discrimination: TypeError / 5xx → local fallback; 400/422 → rethrow (user must fix)
- [x] Double-submit guard: `inFlightRef`
- [x] Cart cleared only after durable save
- [x] `pos.tsx` uses `useOfflineOrderSubmit`

---

## Phase 8 — Sync Outbox Engine ✅ COMPLETE

### 8.1 Create Outbox Table and Service

- [x] `packages/offline/src/outbox.ts` — full outbox CRUD
- [x] `enqueueOutbox()` — nanoid ID, status: pending
- [x] `dequeuePendingOutbox(limit)` — respects `nextRetryAt`
- [x] `markOutboxSyncing/Synced/Failed/Conflict()`
- [x] `resetOutboxForManualRetry()`
- [x] Exponential backoff: `2^attempts * 1000ms`, max 5 min
- [x] Max 8 retries before permanent failure

### 8.2 Implement Sync Engine

- [x] `packages/offline/src/syncEngine.ts` — `runSyncEngine(token?)`
- [x] `useSyncEngine.ts` — React hook with `lockRef` (no parallel sync)
- [x] Triggers: app open, online event, manual click, 30s interval while online
- [x] Order creates batch-synced via `/api/sync/offline-orders` (≤25/batch)
- [x] Groups by `(tenantId, terminalId)` for batch
- [x] Maps `localOrderId → serverId/serverOrderNumber` on success
- [x] HTTP handling: 200/201 → synced, 409/422 → conflict, 5xx/network → failed/retry
- [x] Returns `{ processed, synced, failed, conflicts }`

---

## Phase 9 — Backend Idempotency and Offline APIs ✅ COMPLETE

### 9.1 Standardize Idempotency Key

- [x] `x-idempotency-key` header sent from `useOfflineOrderSubmit`
- [x] `idempotency_key` in batch sync payload
- [x] Backend unique index: `(tenant_id, idempotency_key)` on orders
- [x] `source_terminal_id`, `client_created_at`, `local_order_id` in payload
- [x] Response: `idempotent_replay`, `server_order_id`, `server_order_number`, `local_order_id`, `sync_status`
- [ ] Compound index `(tenant_id, source_terminal_id, local_order_id)` — Sprint 7

### 9.2 Create Offline Sync Endpoint ✅ COMPLETE

- [x] `SyncController.ts` — full implementation
- [x] `POST /api/sync/offline-orders` — batch (≤50), Zod-validated
- [x] Per-item processing: 1 failure does not abort batch
- [x] Returns per-item: `synced | replayed | conflict | failed`
- [x] SSE `emitOrderQueueChanged` on successful sync
- [x] `GET /api/sync/batches`, `GET /api/sync/conflicts`, `GET /api/sync/events`
- [x] `PATCH /api/sync/conflicts/:id/resolve`

### 9.3 Add Sync Audit Tables ✅ COMPLETE

- [x] `sync_batches` — batch-level audit
- [x] `sync_events` — per-item audit
- [x] `server_sync_conflicts` — conflict records with resolution fields
- [x] `SyncOfflineOrder` use case writes to all three tables
- [ ] Admin UI for audit log (Sprint 7)

---

## Phase 10 — Conflict Handling ✅ COMPLETE (Engine + Policy)

### 10.1 Define Conflict Types ✅

- [x] `packages/offline/src/conflictTypes.ts` — frontend
- [x] `packages/application/sync/conflictTypes.ts` — backend mirror
- [x] 11 types: PRODUCT_INACTIVE, PRODUCT_NOT_FOUND, PRICE_CHANGED, STOCK_INSUFFICIENT, ORDER_DUPLICATE, PAYMENT_DUPLICATE, TENANT_FEATURE_DISABLED, ORDER_TYPE_DISABLED, TABLE_UNAVAILABLE, TERMINAL_INACTIVE, SYNC_CONFLICT
- [x] `ConflictSeverity`: warning | needs_review | blocking
- [x] `ResolverPolicy`: auto_accept | audit_note | manual_review | retry | discard
- [x] `conflictLabel()` — Indonesian UI labels

### 10.2 Price Conflict Policy ✅

- [x] `SyncOfflineOrder` detects price drift vs server catalog
- [x] Default policy: `audit_note` — accept offline price, flag for review
- [x] Conflict recorded in `server_sync_conflicts`
- [ ] Per-tenant policy config (Sprint 7)

### 10.3 Stock Conflict Policy ✅

- [x] `SyncOfflineOrder` checks stock during sync
- [x] `STOCK_INSUFFICIENT` — severity: warning, policy: audit_note
- [x] Allows negative stock, records audit note
- [x] `inventory_movements` ledger written on sync
- [ ] Soft reservation per terminal (Phase 17.2)

---

## Phase 11 — Print Queue ✅ COMPLETE

### 11.1 Create Local Print Job Queue

- [x] `packages/offline/src/printQueue.ts` — full print job engine
- [x] `local_print_jobs` table in IndexedDB
- [x] `enqueuePrintJob()`, `getPendingPrintJobs()`, `getAllPrintJobs()`, `getPrintJobStats()`
- [x] Status: `pending → printing → printed | failed | cancelled`
- [x] `markPrinting/Printed/PrintFailed()`, `retryPrintJob()`, `cancelPrintJob()`
- [x] `PrintQueuePanel.tsx` — browse/reprint/cancel/delete with status badges
- [x] Auto-print worker (`usePrintWorker`) polls every 8s, stops after 3 failures per job

### 11.2 Improve Printer Support Matrix ✅ COMPLETE

- [x] `BluetoothPrinterProvider` — wraps existing `bluetoothReceiptPrinter`
- [x] `PrinterProvider` interface abstraction — `apps/pos-terminal-web/src/lib/printerProvider.ts`
- [x] `BrowserPrintProvider` — `window.print()` with styled 80mm HTML receipt popup
- [x] `getActivePrinterProvider()` — auto-selects Bluetooth if paired, else Browser
- [x] `ALL_PRINTER_PROVIDERS` registry for UI listing
- [ ] `NetworkPrinterProvider` — LAN/IP (future)

---

## Phase 12 — Offline Order Queue UI ✅ COMPLETE (Basic)

### 12.1 Add Local Orders Page

- [x] `/local-orders` page and route in `App.tsx`
- [x] `LocalOrderList.tsx` — filter by status, search by order number
- [x] Per-order retry sync button (resets failed outbox items → pending, triggers sync)
- [x] Per-order reprint button (resets print job status → pending for usePrintWorker)
- [x] Batch "Sync Semua" button with pending count
- [x] Currency and date formatting for Indonesian locale
- [ ] Detail view per order (items, payment, sync history)
- [ ] Cancel local order before sync

### 12.2 Add Sync Status Widget ✅ COMPLETE

- [x] `SyncStatusWidget.tsx` — pending/failed/conflict counts, color-coded, manual sync trigger
- [x] Mounted in `MainLayout.tsx`
- [x] `/sync-conflicts` page with resolve/ignore UI for owner/manager

---

## Phase 13 — Service Worker Caching Strategy ✅ COMPLETE (Basic)

### 13.1 App Shell Cache

- [x] Workbox `globPatterns`: `**/*.{js,css,html,png,svg,woff2}`
- [x] `navigateFallback: "/index.html"` — SPA offline fallback
- [x] NetworkFirst for navigate requests
- [ ] Explicit pre-caching for `/pos`, `/kitchen-display`

### 13.2 API Cache Strategy

- [x] GET catalog/features/order-types: fetched online, saved to IndexedDB (not SW cache)
- [x] POST/PATCH/DELETE: not cached by SW — go through outbox
- [ ] SW cache version invalidation (auto-handled by Workbox revision hashing)

---

## Phase 14 — Backend Order Lifecycle Hardening ✅ COMPLETE (Existing)

- [x] Lifecycle: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED
- [x] Payment status: unpaid → partial → paid
- [x] `CreateAndPayOrder` atomic (create + pay)
- [x] Kitchen mode does not close financial order
- [ ] `pending_sync` order status for server-side (currently in sync tables, not order.status)
- [ ] Lifecycle transition unit tests

---

## Phase 15 — Table Management Offline [ ] NOT STARTED

- [ ] Save table list to `local_tables` in IndexedDB
- [ ] Local table status: available, occupied_local, reserved, dirty, unknown
- [ ] Offline dine-in can select table from local cache
- [ ] Backend detects TABLE_UNAVAILABLE conflict during sync
- [ ] Admin resolution UI: keep/move/clear table

---

## Phase 16 — Auth, Tenant, and RBAC Hardening [ ] NOT STARTED

- [ ] `ALLOW_TENANT_HEADER=false` env flag for production
- [ ] Tenant from subdomain or authenticated session only in production
- [ ] RBAC roles: owner, manager, cashier, kitchen, viewer
- [ ] Per-endpoint permission enforcement
- [ ] Offline session token with expiry
- [ ] Local cashier PIN unlock
- [ ] Device deactivation from backend

---

## Phase 17 — Inventory Production Grade [~] PARTIAL

- [x] `inventory_movements` table in schema
- [x] Movement written by `SyncOfflineOrder` on successful sync (type: `offline_sale`)
- [ ] Movement by `CreateAndPayOrder` for online sales
- [ ] Movement by refund/void
- [ ] `inventory_items` dedicated table (not relying on `products.stockQty`)
- [ ] `inventory_stock_snapshots` table
- [ ] Soft stock reservation per terminal

---

## Phase 18 — Refund, Void, and Correction [ ] NOT STARTED

- [ ] Void unsynced local order
- [ ] Void synced order (manager permission + audit trail)
- [ ] `refunds` table: full/partial/item-level
- [ ] Reverse payment + stock movement on refund
- [ ] Manager approval flow

---

## Phase 19 — Customer Display Offline ✅ COMPLETE (Existing)

- [x] BroadcastChannel / localStorage event — no server dependency
- [x] POS broadcasts cart/payment/completed state to customer display
- [ ] Payment QR / static info cache for offline display

---

## Phase 20 — Kitchen Display Offline ✅ COMPLETE

### 20.1 Local Kitchen Ticket Queue

- [x] `packages/offline/src/kitchenQueue.ts` — full local ticket engine
- [x] `local_kitchen_tickets` table in IndexedDB (DB version 2 migration)
- [x] `LocalKitchenTicket`, `LocalKitchenItem`, `KitchenTicketStatus` types in `types.ts`
- [x] `enqueueLocalKitchenTicket()` — creates ticket with status `confirmed`
- [x] `getLocalKitchenTickets()` — filter by active statuses
- [x] `updateLocalKitchenTicketStatus()` — confirmed → preparing → ready → served
- [x] `markKitchenTicketSynced()` — called by sync engine after server ticket created
- [x] `purgeServedKitchenTickets()` — auto-purges served tickets older than 2h

### 20.2 BroadcastChannel KDS Channel

- [x] `apps/pos-terminal-web/src/hooks/useKitchenChannel.ts`
- [x] `KDS_CHANNEL = 'aurapos-kds-v1'` — isolated from CFD channel
- [x] `useKitchenChannelSender()` — sends `ticket_added` / `status_updated` / `ticket_removed`
- [x] `useKitchenChannelReceiver()` — KDS page listens for instant same-device updates
- [x] localStorage snapshot so KDS cold-starts with last 50 tickets

### 20.3 POS Integration

- [x] `handlePaymentMethodConfirm`: if `isLocal && hasKitchenTicket` → `enqueueLocalKitchenTicket` + `sendToKDS`
- [x] `handleSendToKitchen`: offline branch → `enqueueLocalKitchenTicket` + `sendToKDS` (no server call)
- [x] Online branch unchanged — server API call as before

### 20.4 KDS Merged View

- [x] `kitchen-display.tsx` rewritten with merged server + local tickets
- [x] Server orders (when online): loaded via `useOrders`, realtime via EventSource
- [x] Local tickets: polled from IndexedDB every 5s via `useQuery`
- [x] Merge logic: local ticket hidden if its `serverOrderId` already in server orders (dedup)
- [x] `localTicketToOrder()` — adapts `LocalKitchenTicket` to `Order` shape for `KitchenTicket` component
- [x] "LOKAL" orange badge on each local ticket card
- [x] Offline banner: "Mode offline — menampilkan N tiket lokal"
- [x] Header subtitle shows `(N lokal)` count
- [x] `handleUpdateStatus` routes local vs server based on ticket ID set
- [x] `purgeServedKitchenTickets` runs on mount + every 5 min (auto-cleanup)
- [ ] Cross-device offline KDS (requires LAN WebSocket — future scope)

---

## Phase 21 — Observability and Audit [~] PARTIAL

- [x] `sync_batches` — batch-level backend audit
- [x] `sync_events` — per-item backend audit
- [x] `server_sync_conflicts` — conflict records
- [ ] Frontend local logs (network changes, sync events, print failures)
- [ ] JSON log export / Support bundle
- [ ] General `audit_logs` table for all POS actions

---

## Phase 22 — Testing [ ] NOT STARTED

### 22.1 Unit Tests

- [ ] Idempotency key generator
- [ ] Local order number generator (sequence, collision)
- [ ] Cart persistence (load/save/expire)
- [ ] Outbox enqueue/dequeue/backoff
- [ ] Sync retry and backoff logic
- [ ] Price conflict resolver
- [ ] Stock conflict resolver
- [ ] Print queue state machine

### 22.2 Backend Integration Tests

- [ ] `createAndPay` idempotency (same key → same result)
- [ ] Duplicate idempotency key returns replay
- [ ] Batch offline sync (50 orders)
- [ ] Tenant isolation (cross-tenant blocked)
- [ ] Inactive terminal rejected
- [ ] Stock conflict detection
- [ ] Payment double submit (row lock)
- [ ] Concurrent payment race

### 22.3 E2E Offline Tests (Playwright)

- [ ] Load online → go offline → open /pos → works
- [ ] Create order offline
- [ ] Create payment offline
- [ ] Print receipt offline
- [ ] Reload → order still in local orders
- [ ] Go online → sync succeeds
- [ ] Network dies mid-payment → fallback local, no loss
- [ ] Duplicate sync retry → no duplicate order
- [ ] Price changed conflict
- [ ] Stock conflict
- [ ] Printer failed → reprint later

---

## Phase 23 — Production Deployment [ ] NOT STARTED

- [ ] CI: type-check, lint, unit, integration, build PWA, Playwright E2E
- [ ] Fail build if SW not generated or migration not synced
- [ ] DB migrations: terminals, sync_batches, sync_events, sync_conflicts, inventory_movements, refunds, audit_logs
- [ ] Feature flag: `offline_pos_v1` — enable per tenant
- [ ] Monitor: pending/failed/conflict rates, duplicate replays, print failures

---

## Phase 24 — UI/UX Production Details [~] PARTIAL

- [x] `NetworkStatusBadge` — Online/Offline/Syncing with icon
- [x] `SyncStatusWidget` — pending/failed/conflict counts, color-coded
- [x] `OfflineCacheBanner` — stale catalog warning
- [x] `PwaUpdatePrompt` — "Versi baru tersedia" toast with Perbarui/Dismiss
- [x] `inFlightRef` prevents double-submit in payment
- [x] Loading state via `isSubmitting` in POS payment button
- [x] Local order number shown immediately on offline success
- [ ] Full-width offline banner in POS header
- [ ] Draft orders browse/resume sheet
- [ ] Print queue panel

---

## Phase 25 — Documentation ✅ COMPLETE

- [x] `docs/OFFLINE_ARCHITECTURE.md` — modes, data sources, principles, conflict policy, data flow
- [x] `docs/dev/OFFLINE_ENGINE.md` — package structure, data flow, DB schema
- [x] `docs/dev/SYNC_PROTOCOL.md` — outbox lifecycle, HTTP protocol, retry/backoff
- [x] `docs/dev/IDEMPOTENCY.md` — key format, rules, backend enforcement
- [x] `docs/dev/CONFLICT_RESOLUTION.md` — types, severity, resolver policy, backend flow
- [x] `docs/user/OFFLINE_MODE_GUIDE.md` — how to use POS offline (Indonesian)
- [x] `docs/user/PRINTER_GUIDE.md` — printer pairing and troubleshooting (Indonesian)
- [x] `docs/user/SYNC_ERROR_GUIDE.md` — sync errors and conflict resolution (Indonesian)

---

## Recommended Implementation Order

### Sprint 1 — Offline Foundation ✅ COMPLETE

- [x] PWA plugin + manifest + service worker + update prompt
- [x] Network status badge + sync status widget
- [x] `@pos/offline` package with Dexie schema
- [x] Terminal identity + heartbeat
- [x] Documentation files (arch + dev + user)

### Sprint 2 — Local Catalog and Cart ✅ COMPLETE

- [x] Cache products/categories/features/order types
- [x] Replace cart sessionStorage with IndexedDB
- [x] Local drafts/held orders (engine complete)

### Sprint 3 — Offline Order and Payment ✅ COMPLETE

- [x] Local order service (createLocalOrder, pricing, idempotency)
- [x] Local payment record
- [x] POS uses useOfflineOrderSubmit
- [x] Local order number (OFF-...)
- [x] Idempotency key from frontend

### Sprint 4 — Sync Engine ✅ COMPLETE

- [x] Outbox (enqueue, dequeue, backoff, retry)
- [x] Sync engine (batch order sync, individual item sync)
- [x] Manual retry + sync status UI
- [x] Backend `/api/sync/offline-orders`
- [x] `/sync-conflicts` page with resolve UI

### Sprint 5 — Conflict and Inventory ✅ COMPLETE (Engine)

- [x] Conflict types (frontend + backend)
- [x] Price conflict detection + audit_note policy
- [x] Stock conflict detection
- [x] Inventory movement ledger on sync
- [ ] Per-tenant conflict policy config

### Sprint 6 — Printer and Kitchen ✅ COMPLETE

- [x] `PrinterProvider` abstraction interface — `apps/pos-terminal-web/src/lib/printerProvider.ts`
- [x] `BluetoothPrinterProvider` — wraps existing Bluetooth manager
- [x] `BrowserPrintProvider` — `window.print()` 80mm HTML popup fallback
- [x] `getActivePrinterProvider()` — auto-selects best provider
- [x] `PrintQueuePanel.tsx` — browse/reprint/cancel/delete all print jobs
- [x] `usePrintWorker` hook — background polling every 8s, max 3 auto-retries per job
- [x] `usePrintWorker` wired into `MainLayout.tsx` — runs on all pages
- [x] Print count badge in MainLayout header — taps to open `/printers`
- [x] `/printers` sidebar link added to `Sidebar` and `SidebarContent`
- [x] `/printers` page redesigned: provider cards with status, test print, pair/disconnect/forget
- [x] `local_kitchen_tickets` IndexedDB table (DB v2 migration)
- [x] `kitchenQueue.ts` — enqueue, read, update status, purge
- [x] `useKitchenChannel.ts` — BroadcastChannel sender + receiver
- [x] KDS merged view: server tickets + local tickets with LOKAL badge
- [x] Offline fallbacks in `pos.tsx`: auto-enqueue kitchen ticket on local pay + handleSendToKitchen

### Sprint 7 — Security and Production [ ] PENDING

- [ ] Terminal registry DB migration
- [ ] RBAC / tenant header hardening
- [ ] General audit logs
- [ ] CI/E2E offline tests (Playwright)
- [ ] Feature flag `offline_pos_v1`
- [ ] Pilot rollout

---

## Definition of Done — Production Grade Offline POS

| Requirement | Status |
|---|---|
| App installable as PWA | ✅ |
| `/pos` openable and refreshable offline | ✅ |
| Products/categories/features available offline | ✅ |
| Cart survives refresh/crash | ✅ |
| Offline order creation | ✅ |
| Offline payment recording | ✅ |
| Receipt added to print queue | ✅ (engine) |
| All offline transactions in outbox | ✅ |
| Sync safe from duplicate order/payment | ✅ |
| Idempotency key from frontend | ✅ |
| Price/stock/product conflicts handled | ✅ (engine) |
| Cashier sees pending/failed/conflict | ✅ |
| Admin can audit sync | ✅ (backend API) |
| Tenant isolation safe | ✅ |
| Terminal registration/deactivation | ✅ (backend) |
| Inventory movement ledger | ✅ (on sync) |
| Refund/void audit trail | ❌ Sprint 7 |
| Offline E2E tests pass | ❌ Sprint 7 |
| Feature flag rollout | ❌ Sprint 7 |
| User documentation | ✅ |
| Developer documentation | ✅ |
