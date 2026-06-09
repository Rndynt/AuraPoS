# AuraPoS Post-P8.3 — Inventory Movement Traceability + Stock Listing Production Fix Prompt

Work in `Rndynt/AuraPoS`.

## Objective

Execute **Post-P8.3 — Inventory Movement Traceability + Stock Listing Production Fix**.

This task follows P0-P8, Post-P8.1, and Post-P8.2. Architecture boundaries are already clean. This task is a focused product-stability patch for inventory/stock.

There are two required outcomes:

```txt
1. Add traceability to inventory movements so SALE/ADJUSTMENT movements can be traced back to their source transaction/order/payment where applicable.
2. Fix production bug: a product with stock tracking enabled does not appear on the stock/inventory page.
```

## Production bug to include

A real production case was reported:

```txt
User enabled stock tracking for 1 product in production, but that tracked product did not appear on the stock page.
```

Treat this as a P8.3 blocker.

Expected behavior:

```txt
Any active product with stock tracking enabled must appear on the stock/inventory page for the active tenant/outlet, even if it has no existing inventory movement yet and even if current stock is 0/null.
```

Likely root causes to investigate:

```txt
- stock page query only reads inventory records/movements and misses tracked products without inventory rows
- frontend filters on the wrong field name (`trackStock` vs `stockTrackingEnabled`)
- API response omits tracked products when current stock is null/0
- tenant/outlet scope mismatch
- product tracking flag exists on product but no corresponding inventory row is created
- stock page reads only `inventory_products` or movement-derived rows instead of catalog products with stock tracking enabled
```

Do not guess. Inspect the actual code paths.

## Read first

```txt
roadmap/refactor/reports/post-p8-2-pos-inventory-stock-smoke-report.md
roadmap/refactor/p8-s1-s3-import-boundary-enforcement.md
scripts/validate-boundaries.ts
packages/infrastructure/db/schema/inventory.schema.ts
packages/infrastructure/db/schema/catalog.schema.ts
packages/infrastructure/db/schema/orders.schema.ts
packages/application/inventory/**
packages/infrastructure/repositories/inventory/**
packages/infrastructure/repositories/catalog/**
apps/api/src/**/inventory*
apps/api/src/**/catalog*
apps/pos-terminal-web/src/**/inventory*
apps/pos-terminal-web/src/**/stock*
apps/pos-terminal-web/src/**/products*
```

Search first:

```bash
rg -n "stockTrackingEnabled|trackStock|inventory|stock|movement|adjust|currentStock|lowStock|quantityOnHand|onHand|reference|orderId|paymentId|transactionId" apps packages shared
```

## Strict scope

Do not refactor architecture again.

Do not break boundary rules.

Do not remove `shared/schema.ts` wrapper.

Do not change POS sale/payment behavior except where required to pass traceability IDs into inventory movement creation.

Do not change stock deduction timing unless a confirmed bug requires it.

Do not implement unrelated advanced inventory features like transfer, opname, purchase/restock, or refund if not already present.

Do not hide production bug by changing frontend text only.

Do not make tracked products appear globally across tenants/outlets. Tenant/outlet scoping must remain strict.

## Part A — Inventory movement traceability

The Post-P8.2 report found:

```txt
inventory_movements has SALE movements with correct deltas but no order/payment reference.
```

Implement traceability with minimal schema change.

Preferred fields on inventory movement schema:

```txt
referenceType: varchar/text nullable
referenceId: uuid/text nullable
orderId: uuid nullable
paymentId: uuid/text nullable if payment id type is not uuid
metadata: jsonb nullable
```

Use actual existing payment/order id types from the schema. Do not force UUID if the existing id type is text.

Rules:

```txt
SALE movement from POS/order payment should include orderId at minimum.
If payment/payment transaction id is available, include paymentId or referenceId.
ADJUSTMENT movement should include referenceType = 'manual_adjustment' or equivalent.
System-generated repair/backfill movement should be explicit if implemented.
```

If a full migration is required, create a proper Drizzle migration and document it.

Do not change existing movement meaning, quantity delta, or stock calculation.

## Part B — Stock page must include tracked products

Fix the production case.

Expected stock page/API behavior:

```txt
- Product with `stockTrackingEnabled = true` appears on stock page.
- Product appears even before first sale/movement.
- Product appears even when current stock is 0/null.
- Product is scoped by tenant and active outlet.
- Product respects active/inactive availability rules currently intended by the app.
- Product variants are handled according to current app support; do not fake variant stock if not implemented.
```

Implementation guidance:

```txt
1. Find the stock page frontend route/component.
2. Find the API endpoint it calls.
3. Find the repository/query behind that endpoint.
4. Ensure query starts from stock-tracked catalog products, then left joins inventory/stock/movement data.
5. Do not start from inventory movements only.
6. Add currentStock/currentQuantity default handling so 0/null is visible instead of filtered out.
7. Ensure product created/updated with stock tracking ON appears immediately after refresh.
8. Ensure field naming is consistent: use `stockTrackingEnabled` if that is the canonical schema field, not stale `trackStock`.
```

If the app currently creates inventory stock rows lazily, either:

```txt
- make the list query include tracked products without rows via left join; or
- create the missing inventory row when stock tracking is enabled.
```

Prefer the less risky approach that preserves behavior and passes tests.

## Required tests

Add or update automated tests if test structure exists.

Minimum backend tests:

```txt
1. tracked product with no movement appears in inventory/stock list
2. tracked product with zero stock appears in inventory/stock list
3. non-tracked product does not appear in stock list unless current intended behavior says otherwise
4. tenant/outlet scoping prevents cross-outlet/cross-tenant leakage
5. SALE movement includes orderId/reference metadata after payment stock deduction
6. retry/idempotency does not duplicate movement/reference
```

If frontend tests are available, add at least one regression test or document why not.

## Required manual validation

Reproduce the production case locally:

```txt
1. Create/select a product.
2. Enable stock tracking.
3. Do not create a sale yet.
4. Open stock/inventory page.
5. Confirm the tracked product appears.
6. Set stock to 0 if supported.
7. Confirm it still appears.
8. Sell the product.
9. Confirm movement appears with source order/payment reference.
```

## Required validation commands

Run:

```bash
pnpm check:boundaries
pnpm --filter @pos/domain type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/terminal-web type-check
pnpm type-check
pnpm run db:check
```

If DB-backed tests require `DATABASE_URL`, run them with the correct local/Replit database URL. Do not skip silently.

## Documentation update

Create report:

```txt
roadmap/refactor/reports/post-p8-3-inventory-traceability-stock-listing-report.md
```

Include:

```md
# Post-P8.3 Inventory Traceability + Stock Listing Report

## Environment

- Commit SHA:
- Database/environment:
- Tenant/outlet tested:

## Production bug

- Case: tracked product did not appear on stock page
- Root cause:
- Fix:
- Validation evidence:

## Inventory movement traceability

- Schema fields added/changed:
- Migration file:
- SALE reference behavior:
- ADJUSTMENT reference behavior:
- Backward compatibility:

## Tests

- Backend tests:
- Frontend tests:
- Manual smoke:

## Validation commands

- `pnpm check:boundaries`:
- `pnpm --filter @pos/domain type-check`:
- `pnpm --filter @pos/application type-check`:
- `pnpm --filter @pos/infrastructure type-check`:
- `pnpm --filter @pos/api type-check`:
- `pnpm --filter @pos/terminal-web type-check`:
- `pnpm type-check`:
- `pnpm run db:check`:

## Final decision

- Tracked product stock page visibility fixed: yes/no
- Inventory movement traceability fixed: yes/no
- DB schema changed: yes/no
- Migration generated: yes/no
- Runtime stock behavior changed: no/yes with details
- Ready for next task: yes/no
```

## Commit

If schema migration is included:

```bash
git commit -m "fix(inventory): add movement traceability and tracked stock listing"
```

If no migration is required:

```bash
git commit -m "fix(inventory): show tracked products on stock page"
```

Then push.

## Final response required

Report:

```txt
Post-P8.3 status:
Commit SHA:
Files changed:
Migration: yes/no + file
Production stock listing bug fixed: yes/no
Inventory movement traceability added: yes/no
Commands run:
Tests added/run:
Manual validation result:
DB schema changed: yes/no
Boundary check: pass/fail
Follow-up required: yes/no
```
