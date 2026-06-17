# Replit/Codex Prompt P4 — Inventory SOT Closure

Repository: `Rndynt/AuraPoS`

## Goal

Finish the inventory stock source-of-truth refactor after PR #92.

The final operational stock source is `inventory_balances.quantity` scoped by `tenant_id + outlet_id + product_id`.

Product page is catalog only. Stock & Inventaris is the only stock operation center.

`products.stock_qty` / `products.stockQty` must not be used by stock UI, stock API, sale deduction, return reversal, low stock, set stock, transfer, opname, or report.

## Flow Decision

Do not create a separate user-facing `opening stock` flow.

Correct flow:

1. User creates product in Product page.
2. User turns on `Lacak Stok`.
3. Product appears in Stock & Inventaris.
4. User sets/edits the quantity directly from the product row/card in Stock & Inventaris.

Use simple UI labels:

- `Set Stok`
- `Ubah Stok`

Do not show `Opening Stock` / `Stok Awal` as a separate main feature. First stock input and later correction are the same user action: set the stock quantity for the selected outlet.

If `inventory_advanced_stock` is active, setting stock writes a movement by delta:

- `ADJUSTMENT_IN` if new quantity is greater than old quantity.
- `ADJUSTMENT_OUT` if new quantity is lower than old quantity.
- no movement if unchanged.

## Required Fixes

1. Patch `packages/infrastructure/repositories/inventory/DrizzleStockMovementRepository.ts`.
   - Sale deduction must use `inventory_balances`.
   - Return reversal must use `inventory_balances`.
   - Require outlet context for stock-tracked sale/return.
   - Missing outlet/product balance starts at 0.
   - Preserve negative stock protection.
   - Write movement rows with correct balance before/after.
   - Do not read or write product stock columns.

2. Add direct Stock page set-stock UI.
   - Use the existing set endpoint/hook or rename/wrap it to `set stock` semantics.
   - Product with `stockTrackingEnabled = true` appears in Stock page.
   - Each product row/card has `Set Stok` / `Ubah Stok`.
   - Product page remains catalog-only.
   - Single outlet uses active/default outlet.
   - Multi outlet requires a concrete outlet.
   - Aggregate/all-outlet view is read-only for stock-changing actions.
   - Invalidate stock list, low stock, movements, and report after success.

3. Clean Stock page interaction UI.
   - Mobile uses drawer/sheet pattern.
   - Tablet/desktop uses centered dialog/modal pattern.
   - Apply to set stock and touched stock forms.
   - Keep styling consistent with current AuraPoS components.
   - Extract components/hooks instead of growing `stock.tsx`.

4. Update `roadmap/inventory/inventory_sot_no_legacy_flow_refactor_report.md`.
   - Include sale/return conversion proof.
   - Include Set/Ubah Stok UI proof.
   - Include product catalog-only proof.
   - Include entitlement matrix.
   - Include validation command output.
   - Remaining issues must be `none` unless externally blocked.

## Entitlement Rules

- `inventory_basic_stock`: stock list, direct Set/Ubah Stok, basic adjustment if kept.
- `inventory_advanced_stock`: typed movement, history, report, threshold/low stock, opname.
- `inventory_advanced_stock + multi_location`: transfer.

No hardcoded plan names. No UI-only gating. Backend still returns 403 when blocked.

## Validation

Run:

- `pnpm type-check`
- `pnpm --filter @pos/api type-check`
- `pnpm --filter @pos/terminal-web type-check`
- `pnpm --filter @pos/api test`

Manual smoke:

1. Product page: tracking toggle only, no operational stock input.
2. Stock page: tracked product appears automatically.
3. Stock page: Set/Ubah Stok sets active outlet stock directly.
4. Low stock matches stock list source.
5. Sale reduces active outlet inventory balance.
6. Return restores active outlet inventory balance.
7. Multi outlet stock is independent.
8. Transfer still requires `inventory_advanced_stock + multi_location`.

## Commit

`fix(inventory): close stock SOT flow without leftovers`
