# Replit/Codex Prompt P5 — POS Stock Enforcement & Outlet-Aware Product Cards

Repository: `Rndynt/AuraPoS`

## Goal

Fix POS stock behavior after inventory SOT refactor.

POS must read stock from `inventory_balances.quantity` for the active outlet and must prevent out-of-stock products from being added to cart. Product availability in POS must be outlet-aware.

## Current verified problems

1. POS uses `/api/catalog/products`, but the catalog list only filters outlet availability config and does not enrich products with outlet stock balance.
2. POS product card does not show stock/out-of-stock state from `inventory_balances`.
3. POS product card remains clickable when tracked product stock for active outlet is `0`.
4. Add-to-cart only blocks inactive products, not out-of-stock tracked products.
5. Variant add path also does not validate stock before adding to cart.
6. Payment/order submit later fails with a technical error instead of blocking earlier with a clear POS message.
7. `CheckProductAvailability` still checks `product.stock_qty`; it must check active outlet `inventory_balances`.

## Source of truth

Operational stock source is only:

```txt
inventory_balances.quantity scoped by tenant_id + outlet_id + product_id
```

`products.stock_qty` / `products.stockQty` must not decide POS availability, card badge, add-to-cart, checkout, or payment.

## Required backend changes

### 1. Catalog products endpoint must be outlet-stock aware for POS

Patch `apps/api/src/http/controllers/CatalogController.ts` and clean architecture use case/repository as needed.

`GET /api/catalog/products` must return each product with stock fields for active outlet:

```txt
stockTrackingEnabled
stockQuantity / stockQty alias mapped from inventory_balances.quantity
availableQuantity
isOutOfStock
isLowStock
lowStockThreshold
outletId
```

Rules:

- If product stock tracking is disabled, it remains addable unless inactive/unavailable.
- If stock tracking is enabled and active outlet balance is missing, create/read as 0.
- Do not clone stock from another outlet.
- Do not use `products.stock_qty` fallback.
- Respect `outletProductConfigs.isAvailable = false` as unavailable.
- Keep management mode `includeUnavailable=true` behavior for product management pages, but POS default must be outlet-aware.

### 2. Availability endpoint must use inventory balances

Patch `CheckProductAvailability` and `/api/catalog/products/:id/availability`.

Required input must include/resolve outlet context. Availability for tracked product is:

```txt
inventory_balances.quantity >= requestedQuantity
```

Return clear result:

```txt
isAvailable: false
availableQuantity: 0
reason: "Stok habis di outlet ini"
```

or:

```txt
reason: "Stok tidak cukup di outlet ini. Tersedia: X, diminta: Y"
```

No product stock column.

### 3. Order submit must still validate stock clearly

Even if UI blocks add-to-cart, backend order/create-and-pay must reject insufficient outlet balance with a clear business error, not a generic technical error.

If stock is insufficient, response should be 400/409 with clear message that frontend can show:

```txt
Stok {productName} di outlet ini tidak cukup. Tersedia: X, diminta: Y.
```

## Required frontend changes

### 4. POS ProductCard must show stock state

Patch:

```txt
apps/pos-terminal-web/src/components/pos/ProductCardV2.tsx
apps/pos-terminal-web/src/components/pos/ProductArea.tsx
apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx
```

Required UI:

- Tracked product with qty 0 shows `Stok Habis` overlay/badge.
- Tracked product with qty below threshold shows `Stok Rendah` badge and remaining qty.
- Tracked product with qty available can show remaining qty if visually clean.
- Product unavailable by outlet config still shows unavailable/disabled state.
- Out-of-stock product must be visually disabled and not clickable.

### 5. Add-to-cart guard

Patch `handleAddToCart` and variant add path.

Rules:

- If `stockTrackingEnabled` and active outlet available quantity <= 0, do not add to cart.
- If cart already contains qty N and available stock is N, do not add more.
- If variant/options flow adds qty > available remaining, block before adding.
- Show clear toast:

```txt
Stok {productName} habis di outlet ini.
```

or:

```txt
Stok {productName} tidak cukup. Tersedia: X, sudah di cart: Y.
```

No generic technical error at payment stage for avoidable stock issues.

### 6. Cart quantity changes must respect stock

If cart has plus/minus quantity controls, ensure increasing qty validates active outlet available stock.

If current `useCart` has no product stock guard, add guard in POS page wrapper or cart hook cleanly.

### 7. Query invalidation after sale/payment

After order/create-and-pay/payment success, invalidate/refetch POS products so stock badges update immediately.

Include active outlet in query key so Cabang A and Cabang B stock do not leak into each other.

## Entitlement rules

- POS sale can exist without inventory entitlements, but stock enforcement applies only to products with `stockTrackingEnabled = true`.
- Do not hardcode plan names.
- Do not depend on UI-only gating.
- Backend validation remains source of safety.

## Acceptance criteria

### Single outlet

- Product tracked with stock 10 appears in POS as available.
- Add 10 to cart works.
- Add 11th unit is blocked before checkout.
- Product tracked with stock 0 shows `Stok Habis` and cannot be clicked.
- Payment/order submit does not produce generic technical error for known stock shortage.

### Multi outlet

- Cabang A balance 10, Cabang B balance 0.
- POS active Cabang A shows product available qty 10.
- POS active Cabang B shows product out of stock.
- Product in Cabang B cannot be added to cart.
- Switching outlet refetches POS product stock from the correct outlet.
- No stock from Cabang A leaks into Cabang B.

### Backend

- `/api/catalog/products` returns outlet stock fields from `inventory_balances`.
- `/api/catalog/products/:id/availability` uses outlet balance.
- Order stock deduction uses `inventory_balances` and returns clear insufficient-stock error.

## Tests required

Add/update tests:

```txt
catalog products includes active outlet balance quantity
catalog products does not use products.stock_qty for POS stock
availability endpoint uses inventory_balances by outlet
Cabang A and Cabang B return different stock states for same product
POS add-to-cart blocks tracked product with qty 0
POS add-to-cart blocks cart qty beyond available stock
order submit returns clear insufficient stock error
```

## Validation

Run and document:

```bash
pnpm type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/api test
```

Manual smoke:

```txt
1. Set product tracked stock: Cabang A = 10, Cabang B = 0.
2. Open POS Cabang A: product shows available and can be added max 10.
3. Open POS Cabang B: product shows Stok Habis and cannot be added.
4. Try bypass via checkout: backend returns clear stock error.
5. After successful sale in Cabang A, POS stock badge updates.
```

## Report

Create/update:

```txt
roadmap/inventory/pos_stock_enforcement_report.md
```

Report must include:

- root cause summary;
- backend changes;
- frontend changes;
- single outlet proof;
- multi outlet proof;
- add-to-cart guard proof;
- backend stock validation proof;
- validation output;
- remaining issues: none unless externally blocked.

## Commit

```txt
fix(pos): enforce outlet stock availability in product cards and cart
```
