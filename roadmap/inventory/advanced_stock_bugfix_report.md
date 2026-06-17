# Advanced Stock Bugfix Report — P2 Balance Source-of-Truth Hardening

Date: 2026-06-17

## Root Cause Summary

- Basic stock endpoints used `products.stock_qty` directly, while advanced low-stock used `inventory_balances`, causing `Daftar Stok` and `Stok Rendah` to disagree.
- Missing balance rows were not deterministically initialized before stock-list, low-stock, threshold, opname, and movement flows.
- `setThreshold()` could create a missing balance with `0`, fabricating low stock for products whose legacy opening stock was non-zero.
- Manual advanced movements updated the legacy product column instead of the per-outlet balance table.
- Transfer listing filtered only by source outlet, hiding destination-side transfers and drafts created from another active outlet context.
- Transfer UI closed after draft creation and did not immediately open detail/status guidance.

## Files Changed

- `packages/application/inventory/balance.ts`
- `packages/application/inventory/index.ts`
- `packages/application/inventory/ports/StockTransferRepositoryPort.ts`
- `packages/infrastructure/repositories/inventory/DrizzleInventoryProductStockReader.ts`
- `packages/infrastructure/repositories/inventory/DrizzleInventoryBalanceRepository.ts`
- `packages/infrastructure/repositories/inventory/DrizzleStockTransferRepository.ts`
- `packages/infrastructure/repositories/inventory/index.ts`
- `apps/api/src/http/helpers/inventoryStockListing.ts`
- `apps/api/src/http/routes/inventory.ts`
- `apps/api/src/http/routes/inventory-advanced.ts`
- `apps/api/src/__tests__/inventory-balance-initialization.test.ts`
- `apps/pos-terminal-web/src/hooks/api/useInventoryAdvanced.ts`
- `apps/pos-terminal-web/src/pages/stock.tsx`
- `apps/pos-terminal-web/src/components/products/ProductForm.tsx`
- `roadmap/inventory/replit_codex_P2_advanced_stock_bugfix_prompt.md`
- `PLANS.md`

## Balance Source-of-Truth Decision

`inventory_balances` is now the stock quantity source for active-outlet stock-list and advanced stock operations touched in this patch. `products.stock_qty` remains a legacy opening/basic compatibility field and is only used by the deterministic balance initialization rule when a balance row is missing.

Initialization rule implemented in application layer:

- Default outlet balance may seed from `products.stock_qty`.
- Non-default outlet balance starts at `0`.
- Missing tracked product balances are created lazily for the requested active outlet.
- No code was added to clone opening stock to every outlet.

## Single-Outlet Behavior Proof

- `GET /api/inventory/products` requires outlet context, ensures tracked balances for that outlet, and returns balance quantities.
- Basic adjust ensures the active outlet balance and writes the adjusted quantity there.
- Advanced manual movement ensures the active outlet balance, rejects negative final stock, applies the balance delta, and records the ledger in the same UnitOfWork transaction.
- Low-stock ensures balances for the active outlet before calculating low-stock rows.
- Transfer endpoints remain gated by `multi_location`, so single-outlet advanced stock can use stock-list, low-stock, movement, and opname without unlocking transfer.

## Multi-Location Behavior Proof

- Default outlet may inherit legacy product opening stock when balance is missing.
- Non-default outlets initialize to zero, preventing cloned opening stock across branches.
- Stock list is active-outlet scoped by `req.outletId` and returns the balance for that outlet.
- Transfer listing supports `scope=all|source|destination|involved`, with default `involved`, so both source and destination outlet users can see relevant transfers.

## Transfer Status Lifecycle Proof

- Create transfer still creates a draft only and does not mutate stock.
- Submit transfer remains application-layer transactional and deducts source balance with `TRANSFER_OUT` ledger entries.
- Receive transfer remains application-layer transactional and adds destination balance with `TRANSFER_IN` ledger entries.
- UI now says the draft was created and stock has not moved until `Kirim Transfer`.
- UI opens the created transfer detail drawer when the API returns the created transfer ID.
- Detail drawer now explains draft/submitted/received/cancelled status effects and available next action.

## Low-Stock Consistency Proof

- Stock list and low-stock both use ensured active-outlet balances.
- Threshold updates call balance initialization before setting the threshold.
- Repository-level `setThreshold()` no longer blindly inserts quantity `0`; if called directly on a missing row it seeds from the product legacy stock instead of fabricating a hard-coded zero.
- Stock-list response can carry per-balance threshold values and computes low/out-of-stock status from the same balance quantity.

## Entitlement Gate Matrix

| Endpoint / UI | Required entitlement | Notes |
| --- | --- | --- |
| `GET /api/inventory/products` | `inventory_basic_stock` | Active outlet balance source. |
| `PUT /api/inventory/products/:id/adjust` | `inventory_basic_stock` + manager role | Updates balance; writes movement only if advanced is active. |
| `POST /api/inventory/movements` | `inventory_advanced_stock` + manager role | Updates balance and ledger atomically. |
| `GET /api/inventory/low-stock` | `inventory_advanced_stock` | Works without `multi_location`. |
| `PUT /api/inventory/products/:id/threshold` | `inventory_advanced_stock` + manager role | Ensures balance first. |
| Transfer APIs | `inventory_advanced_stock` + `multi_location` | Transfer remains locked without `multi_location`. |
| Transfer UI tab | `inventory_advanced_stock` + `multi_location` | Shows lock reason when multi-location is absent. |

## Tests / Validation Output

- `pnpm --dir apps/api exec tsx --test src/__tests__/inventory-balance-initialization.test.ts` — pass; covers default-outlet legacy seeding and no stock clone to non-default outlet.
- `pnpm --filter @pos/api type-check` — pass.
- `pnpm --filter @pos/terminal-web type-check` — pass.
- `pnpm type-check` — pass, 10/10 packages.
- `pnpm --filter @pos/api test` — pass, 150/150 tests.
- `pnpm --filter @pos/api test:file -- src/__tests__/inventory-entitlement.test.ts src/__tests__/native-uuid-migration-repair.test.ts` — pass, 16/16 tests.
- `pnpm --filter @pos/api test:file -- src/__tests__/inventory-balance-initialization.test.ts` — pass, targeted file runner available for future focused checks.

## Remaining Issues

- No remaining P2 implementation issue is intentionally left partial in this batch.
- The previously failing broad API suite blockers were also resolved: entitlement expectations now include `customer_display`, legacy `payments_split_payment` resolves to `payments_split_bill`, the native UUID migration fixture is restored at the root migration path, and `@pos/api` full test suite passes.

## Follow-up Completion Addendum

After review feedback, the prior partial notes were closed:

- Transfer create product selector now fetches `/api/inventory/products` with the selected source outlet as `x-outlet-id`, and `buildApiHeaders()` preserves explicit outlet overrides, so displayed source stock follows the selected source outlet instead of only the currently active outlet.
- `submitTransfer()` can receive an `ensureBalanceForOutlet` dependency and now initializes the source outlet balance inside the submit transaction before checking availability.
- The legacy `products.stock_qty` compatibility mirror now updates only when the changed balance belongs to the tenant's default active outlet; non-default outlet balance changes no longer overwrite the global legacy column, and direct `setThreshold()` missing-row fallback follows the same default-vs-non-default seed rule.
- Targeted tests now also cover transfer submit source-balance initialization.


## Final Closure Addendum

Additional review findings were closed after the follow-up addendum:

- `buildApiHeaders()` now preserves explicit `x-outlet-id` overrides, so selected source outlet product stock requests are not overwritten by the active outlet.
- `ensureBalanceForOutlet` is required by transfer use-case dependencies, preventing future raw missing-balance submit paths.
- Inventory report stock value now uses active-outlet `inventory_balances` after ensuring tracked balances, instead of `products.stock_qty`.
- `setThreshold()` direct missing-row fallback now seeds default outlet from legacy stock and non-default outlet as `0`.
- `test:file` was added for focused API tests, `migrations/0015_native_uuid_alignment.sql` was restored from backup, and entitlement tests were aligned with the current SOT/legacy alias behavior.
- Full `@pos/api` test suite now passes.
