# Replit/Codex Prompt P3 — Inventory SOT No-Legacy Flow Refactor

Repository: `Rndynt/AuraPoS`

## Objective

Refactor inventory so the feature is clear, usable, and has one source of truth.

This is not another patch to hide bugs. Remove confusing stock behavior and remove legacy compatibility assumptions from the inventory feature.

## Final Product Decision

Inventory stock source of truth is only:

```txt
inventory_balances.quantity
```

Scope:

```txt
tenant_id + outlet_id + product_id
```

Do not use `products.stock_qty` as stock source anymore.

Do not show `products.stock_qty` in UI.

Do not keep compatibility mirror logic for stock.

If `products.stock_qty` still exists in schema, it must be ignored by stock feature code and marked for later schema cleanup. It must not drive UI/API/business logic.

## Correct User Mental Model

### Product page

Product page is catalog only:

- name;
- price;
- category;
- SKU/barcode;
- image;
- available/not available;
- stock tracking on/off.

Product page is not the place to input stock quantity.

If stock tracking is enabled, show guidance:

```txt
Stok produk ini dikelola di Stok & Inventaris.
Atur stok awal, mutasi, opname, stok rendah, dan transfer dari halaman Stok.
```

Remove ambiguous `Stok: 50` badge from Product page unless it clearly says outlet scope or aggregate scope and is read-only.

Preferred: no operational stock number on Product page.

### Stok & Inventaris page

This page is the only operational stock control center.

It owns:

- opening stock / stok awal;
- stock list per outlet;
- basic stock adjustment;
- advanced movement / mutasi;
- low stock threshold;
- opname;
- transfer;
- report.

## Required UI Flow

### Opening stock

Add clear action:

```txt
Atur Stok Awal
```

Rules:

- Must be in Stok & Inventaris, not Product page.
- Requires active outlet.
- For single outlet tenant, use default outlet automatically.
- For multi outlet tenant, user must select a specific outlet.
- Disabled in `Semua Cabang` aggregate view.
- Writes `inventory_balances` only.
- If advanced stock is active, write movement type `INITIAL`.

### Stock adjustment

Basic quick edit in stock list updates `inventory_balances` for active outlet.

Advanced movement writes:

- balance update;
- `inventory_movements` ledger.

No direct product stock update.

### Low stock

Low stock uses the exact same source as stock list:

```txt
inventory_balances.quantity
```

Threshold update must not create fake zero stock.

If balance does not exist, create balance using explicit selected outlet and quantity 0 only when user intentionally sets opening stock or threshold for that outlet. Do not infer stock from product global field.

### Opname

Opname works per outlet.

Rules:

- Requires `inventory_advanced_stock`.
- Does not require `multi_location`.
- Single outlet tenant can use it normally.
- Multi outlet tenant must select one outlet.
- Approval writes `OPNAME_ADJUSTMENT` movements and updates `inventory_balances`.

### Transfer

Transfer is a multi-location feature only.

Rules:

- Requires `inventory_advanced_stock` and `multi_location`.
- Draft does not change stock.
- Submit decreases source outlet.
- Receive increases destination outlet.
- UI must clearly show lifecycle:

```txt
Draft = stok belum berubah
Dikirim = stok outlet asal berkurang
Diterima = stok outlet tujuan bertambah
```

After creating transfer, show the draft immediately and open detail or show row in list.

## Single Outlet Behavior

Tenant without `multi_location`:

- no confusing branch selector;
- one default outlet context;
- stock list works;
- opening stock works;
- adjustment works;
- mutasi works if advanced active;
- low stock works;
- opname works if advanced active;
- report works;
- transfer locked/hidden.

## Multi Outlet Behavior

Tenant with `multi_location`:

- stock is independent per outlet;
- setting stock in Cabang Utama must not set stock in outlet lain;
- `Semua Cabang` is aggregate read-only;
- stock-changing actions require specific outlet;
- transfer moves stock between outlet balances.

## Backend Refactor Requirements

Remove stock business dependency on `products.stock_qty` from:

```txt
apps/api/src/http/routes/inventory.ts
apps/api/src/http/routes/inventory-advanced.ts
packages/infrastructure/repositories/inventory/*
packages/application/inventory/*
```

Required application use cases:

```txt
GetStockListForOutlet
GetStockAggregate
SetOpeningStock
AdjustStockBalance
RecordStockMovement
GetLowStockForOutlet
UpdateLowStockThreshold
CreateStockOpname
ApproveStockOpname
CreateStockTransfer
SubmitStockTransfer
ReceiveStockTransfer
```

Routes must stay thin:

- entitlement check;
- active outlet/scope resolution;
- request validation;
- use case call;
- response mapping.

## API Rules

`GET /api/inventory/products`

- returns balance-based stock for active outlet;
- supports aggregate scope for `Semua Cabang` if needed;
- does not read `products.stock_qty`.

`PUT /api/inventory/products/:id/adjust`

- updates `inventory_balances` only.

`POST /api/inventory/opening-stock`

- create/set opening stock for selected outlet and product.

`GET /api/inventory/low-stock`

- reads same balance source as stock list.

`PUT /api/inventory/products/:id/threshold`

- updates threshold on balance row for selected outlet;
- does not overwrite or fake quantity.

Transfer endpoints:

- list includes transfers where active outlet is source or destination;
- admin/owner can see all tenant transfers if supported;
- create draft appears immediately;
- submit and receive update balances.

## Entitlement Rules

`inventory_basic_stock`:

- stock list;
- opening stock;
- basic adjustment.

`inventory_advanced_stock`:

- typed movements;
- history;
- reports;
- threshold/low stock management;
- opname.

`inventory_advanced_stock + multi_location`:

- transfer.

Do not require `multi_location` for normal advanced stock.

## Frontend Requirements

Do not grow `stock.tsx` further into unreadable code. Extract components/hooks if needed.

Required UX:

- Product page stock input removed or converted to guidance.
- Stock page has obvious `Atur Stok Awal` flow.
- Stock page labels current outlet clearly.
- Aggregate `Semua Cabang` view is read-only for stock-changing actions.
- Low stock quantity matches stock list quantity.
- Transfer list shows newly created draft.
- Transfer detail has explicit Draft/Dikirim/Diterima explanation.

## Tests Required

Add/update tests:

- product stock no longer uses `products.stock_qty`;
- opening stock writes one outlet only;
- stock list reads `inventory_balances`;
- low stock reads same quantity as stock list;
- threshold update preserves quantity;
- single outlet advanced works without multi location;
- multi outlet stock is independent;
- aggregate view sums balances and blocks edits;
- transfer draft appears;
- submit decreases source;
- receive increases destination;
- transfer blocked without multi location.

## Validation

Run:

```bash
pnpm type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/api test
```

Manual smoke:

1. Create product with stock tracking on.
2. Product page must not ask for operational stock quantity.
3. Go to Stok & Inventaris.
4. Set opening stock 50 for Cabang Utama.
5. Stock list shows 50.
6. Low stock does not show fake 0.
7. Switch outlet lain: stock is 0/unset, not copied 50.
8. Transfer 10 from Cabang Utama to outlet lain.
9. Draft appears and stock unchanged.
10. Submit makes source 40.
11. Receive makes destination 10.

## Report

Create:

```txt
roadmap/inventory/inventory_sot_no_legacy_flow_refactor_report.md
```

Report must include:

- final stock SOT decision;
- removed/ignored `products.stock_qty` usages;
- Product page flow before/after;
- Stock page flow before/after;
- single outlet proof;
- multi outlet proof;
- transfer lifecycle proof;
- entitlement matrix;
- validation output;
- remaining issues if any.

## Completion Checklist

- [ ] Product page no longer manages operational stock.
- [ ] Stock page owns opening stock.
- [ ] API stock list reads inventory balances.
- [ ] API low stock reads same source as stock list.
- [ ] Adjustment updates inventory balances only.
- [ ] Movement updates inventory balances + ledger.
- [ ] No stock cloning to all outlets.
- [ ] Aggregate view read-only for stock-changing actions.
- [ ] Transfer lifecycle clear and functional.
- [ ] Single outlet advanced works without multi location.
- [ ] Tests pass.
- [ ] Report created.

## Commit

Commit message:

```txt
refactor(inventory): clarify stock source of truth and flow
```
