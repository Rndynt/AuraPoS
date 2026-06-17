# Advanced Stock Full Implementation Report

**Date:** 2025-06-17  
**Status:** ✅ Complete  
**Prompt:** `replit_codex_P1_advanced_stock_full_implementation_prompt.md`

---

## Summary

Full implementation of Advanced Stock features across all clean architecture layers: schema, application ports, infrastructure repositories, API routes, and frontend UI.

---

## Phase 1 — Schema

### New Database Tables
All tables created via direct `psql` execution (drizzle-kit requires TTY):

| Table | Purpose |
|---|---|
| `inventory_balances` | Per-outlet stock balance, single source of truth for advanced stock |
| `stock_opnames` | Stock opname header (draft → submitted → approved/cancelled) |
| `stock_opname_items` | Per-product counted quantities + system quantities + variance |
| `stock_transfers` | Transfer header between outlets (requires multi_location) |
| `stock_transfer_items` | Per-product transfer quantities |
| `inventory_low_stock_alerts` | Alert records for products below threshold |

### Key Design Decisions
- `inventory_balances` uses `UNIQUE(tenant_id, outlet_id, product_id)` — one row per product per outlet
- `low_stock_threshold` is nullable on `inventory_balances` — NULL means use system default (10)
- `inventory_movements` extended with 3 new movement types: `OPNAME_ADJUSTMENT`, `TRANSFER_OUT`, `TRANSFER_IN`
- Opname & Transfer use sequential number format: `OPN-YYYYMMDD-XXXX` / `TRF-YYYYMMDD-XXXX`
- `products.stock_qty` kept in sync for backward compatibility with basic stock

### Files Modified
- `migrations/0008_inventory.sql` — added all 6 tables + indexes
- `packages/infrastructure/db/schema/inventory.schema.ts` — full Drizzle schema with types

---

## Phase 2 — Application Ports

### New Port Interfaces
| File | Interface |
|---|---|
| `InventoryBalanceRepositoryPort.ts` | `getBalance`, `listBalances`, `applyDelta`, `setQuantity`, `setThreshold`, `listLowStock` |
| `StockOpnameRepositoryPort.ts` | `create`, `findById`, `list`, `upsertItem`, `updateStatus` |
| `StockTransferRepositoryPort.ts` | `create`, `findById`, `list`, `updateStatus` |

### Files Modified
- `packages/application/inventory/ports/index.ts` — exports all 3 new port interfaces
- `packages/application/inventory/ports/InventoryBalanceRepositoryPort.ts` — new
- `packages/application/inventory/ports/StockOpnameRepositoryPort.ts` — new
- `packages/application/inventory/ports/StockTransferRepositoryPort.ts` — new

---

## Phase 3 — Infrastructure Repositories

### New Drizzle Repositories

| Class | Key Behaviors |
|---|---|
| `DrizzleInventoryBalanceRepository` | `applyDelta` uses SELECT FOR UPDATE; `setQuantity` uses INSERT ... ON CONFLICT; `listLowStock` uses `COALESCE(threshold, default)` |
| `DrizzleStockOpnameRepository` | `upsertItem` uses ON CONFLICT to update counts; auto-calculates variance |
| `DrizzleStockTransferRepository` | `create` wraps header + items in single transaction |

### Files Modified
- `packages/infrastructure/repositories/inventory/DrizzleInventoryBalanceRepository.ts` — new
- `packages/infrastructure/repositories/inventory/DrizzleStockOpnameRepository.ts` — new
- `packages/infrastructure/repositories/inventory/DrizzleStockTransferRepository.ts` — new
- `packages/infrastructure/repositories/inventory/index.ts` — exports 3 new repos

---

## Phase 4 — API Routes

### New Endpoints in `apps/api/src/http/routes/inventory-advanced.ts`

#### Low Stock & Threshold
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/inventory/low-stock` | user | List products at/below threshold |
| `PUT` | `/api/inventory/products/:id/threshold` | manager | Set per-product threshold |

#### Stock Opname
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/inventory/opnames` | manager | Create opname (auto-populates items) |
| `GET` | `/api/inventory/opnames` | user | List opnames with optional status filter |
| `GET` | `/api/inventory/opnames/:id` | user | Detail opname with items |
| `PUT` | `/api/inventory/opnames/:id/items/:productId` | manager | Update counted quantity |
| `POST` | `/api/inventory/opnames/:id/submit` | manager | Submit for approval |
| `POST` | `/api/inventory/opnames/:id/approve` | manager | Approve: write OPNAME_ADJUSTMENT + update balances |
| `POST` | `/api/inventory/opnames/:id/cancel` | manager | Cancel (draft/submitted only) |

#### Stock Transfer
| Method | Path | Auth | Requires | Description |
|---|---|---|---|---|
| `POST` | `/api/inventory/transfers` | manager | advanced + multi_location | Create transfer with items |
| `GET` | `/api/inventory/transfers` | user | advanced + multi_location | List transfers |
| `GET` | `/api/inventory/transfers/:id` | user | advanced + multi_location | Detail + items |
| `POST` | `/api/inventory/transfers/:id/submit` | manager | advanced + multi_location | Deduct source balance + TRANSFER_OUT |
| `POST` | `/api/inventory/transfers/:id/receive` | manager | advanced + multi_location | Add dest balance + TRANSFER_IN |
| `POST` | `/api/inventory/transfers/:id/cancel` | manager | advanced + multi_location | Cancel (reverses if submitted) |

### Files Modified
- `apps/api/src/http/routes/inventory-advanced.ts` — new file with all advanced routes
- `apps/api/src/http/routes/index.ts` — registered `inventoryAdvancedRoutes` under `/inventory`
- `apps/api/src/http/routes/inventory.ts` — added `OPNAME_ADJUSTMENT`, `TRANSFER_OUT`, `TRANSFER_IN` to `MOVEMENT_TYPES`

---

## Phase 5 — Frontend Hooks + UI

### New Hook File: `useInventoryAdvanced.ts`
Hooks: `useLowStockItems`, `useSetLowStockThreshold`, `useOpnames`, `useOpnameDetail`, `useCreateOpname`, `useUpdateOpnameItem`, `useSubmitOpname`, `useApproveOpname`, `useCancelOpname`, `useTransfers`, `useTransferDetail`, `useCreateTransfer`, `useSubmitTransfer`, `useReceiveTransfer`, `useCancelTransfer`

### New Tab Components in `stock.tsx`

| Component | Description |
|---|---|
| `LowStockTab` | Shows products below threshold, inline threshold editing per product |
| `OpnameTab` | List + create opname; `OpnameDetailDrawer` for counting + submit + approve |
| `TransferTab` | List transfers; `TransferDetailDrawer` for submit + receive + cancel |

### Files Modified
- `apps/pos-terminal-web/src/hooks/api/useInventoryAdvanced.ts` — new
- `apps/pos-terminal-web/src/pages/stock.tsx` — added 3 new tabs + 2 drawer components + updated tab navigation

---

## Phase 6 — Tests

### Test File: `apps/api/src/__tests__/inventory-advanced.test.ts`

**14 tests** covering:
- Repository API surface (method existence)
- Variance calculation logic
- Transfer from/to outlet validation
- Status flow transitions (opname + transfer)
- Low stock threshold logic (7 cases)
- Movement type enumeration
- Number generation format (OPN-/TRF-)

---

## Entitlement Gating

| Feature | Required Entitlements |
|---|---|
| Low Stock list | `inventory_advanced_stock` |
| Threshold per-product | `inventory_advanced_stock` |
| Stock Opname (all) | `inventory_advanced_stock` |
| Stock Transfer (all) | `inventory_advanced_stock` + `multi_location` |

---

## Architecture Decisions

1. **`inventory_balances` as source of truth** — Advanced stock reads/writes here; `products.stock_qty` updated in sync for backward compat with basic stock
2. **Atomic opname approval** — DB transaction writes all OPNAME_ADJUSTMENT movements + balance updates atomically
3. **Transfer submit decrements source, receive increments dest** — Two-phase confirms the physical handover model
4. **Cancel of submitted transfer reverses the deduction** — ADJUSTMENT_IN movement written to source outlet
5. **SELECT FOR UPDATE in applyDelta** — Prevents lost updates under concurrent access
6. **Threshold nullable = use default** — Null threshold means system default (10), explicit 0 means "never alert"
7. **Auto-populate opname items** — On opname creation, all tracked products in the outlet are automatically added with their current balance as `system_quantity`

---

## Files Created/Modified

| File | Action |
|---|---|
| `migrations/0008_inventory.sql` | Modified — added 6 tables + indexes |
| `packages/infrastructure/db/schema/inventory.schema.ts` | Modified — added 6 Drizzle table definitions |
| `packages/application/inventory/ports/InventoryBalanceRepositoryPort.ts` | New |
| `packages/application/inventory/ports/StockOpnameRepositoryPort.ts` | New |
| `packages/application/inventory/ports/StockTransferRepositoryPort.ts` | New |
| `packages/application/inventory/ports/index.ts` | Modified — re-exports 3 new ports |
| `packages/infrastructure/repositories/inventory/DrizzleInventoryBalanceRepository.ts` | New |
| `packages/infrastructure/repositories/inventory/DrizzleStockOpnameRepository.ts` | New |
| `packages/infrastructure/repositories/inventory/DrizzleStockTransferRepository.ts` | New |
| `packages/infrastructure/repositories/inventory/index.ts` | Modified — exports 3 new repos |
| `apps/api/src/http/routes/inventory-advanced.ts` | New — 18 endpoints |
| `apps/api/src/http/routes/index.ts` | Modified — register inventoryAdvancedRoutes |
| `apps/api/src/http/routes/inventory.ts` | Modified — MOVEMENT_TYPES extended |
| `apps/pos-terminal-web/src/hooks/api/useInventoryAdvanced.ts` | New — 15 hooks |
| `apps/pos-terminal-web/src/pages/stock.tsx` | Modified — 3 tabs + 2 drawers + updated nav |
| `apps/api/src/__tests__/inventory-advanced.test.ts` | New — 14 tests |
| `roadmap/inventory/advanced_stock_full_implementation_report.md` | New — this file |
