# AuraPoS Post-P8.2 — Manual Smoke POS + Inventory / Stock Prompt

Work in `Rndynt/AuraPoS`.

## Objective

Execute **Post-P8.2 — Manual Smoke POS + Inventory / Stock Validation**.

The architecture refactor P0-P8 and Post-P8.1 are complete. This task is not a refactor phase and not a feature build. This task validates runtime behavior after the architecture cleanup.

The goal is to manually smoke test POS cashier flow plus stock/inventory behavior end-to-end, then document the result in the repo.

## Why this task exists

P6 frontend POS split was validated by type-check/build, but manual interactive smoke was not run.

P8/Post-P8.1 made architecture boundaries clean, but runtime behavior still needs manual confirmation.

Inventory is critical because POS sale, order lifecycle, payment, offline sync, stock movement, outlet scope, and variants can accidentally deduct or restore stock incorrectly.

## Strict scope

Do not refactor architecture.

Do not change DB schema.

Do not generate migrations.

Do not add new features.

Do not rewrite POS UI.

Do not rewrite inventory engine.

Do not change payment/partial payment behavior unless a confirmed bug is found and the fix is minimal.

Do not change stock tracking semantics unless a confirmed bug is found and the fix is minimal.

Do not hide failed smoke cases.

If you find a bug, document it precisely. Only apply a small fix if it is clearly inside the smoke-test scope and low risk. Otherwise stop and create a follow-up prompt/report.

## Read first

```txt
roadmap/refactor/p6-s1-s4-frontend-pos-feature-split.md
roadmap/refactor/p8-s1-s3-import-boundary-enforcement.md
scripts/validate-boundaries.ts
apps/pos-terminal-web/src/features/pos/**
apps/pos-terminal-web/src/pages/pos.tsx
packages/application/orders/**
packages/application/inventory/**
packages/infrastructure/repositories/inventory/**
packages/infrastructure/repositories/orders/**
packages/infrastructure/db/schema/inventory.schema.ts
packages/infrastructure/db/schema/orders.schema.ts
apps/api/src/http/controllers/OrdersController.ts
apps/api/src/container.ts
```

Audit relevant terms before testing:

```bash
rg -n "stock|inventory|movement|adjustment|transfer|opname|count|variant|outlet|partial|payment|offline|sync|cancel|refund|void" apps packages shared
```

## Required validation commands before manual smoke

Run:

```bash
pnpm check:boundaries
pnpm --filter @pos/domain type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/terminal-web type-check
pnpm type-check
```

Expected:

```txt
all pass
boundary check: 0 violations, 0 temporary exceptions
```

If any command fails, document exact failure and stop before manual smoke unless the failure is clearly environment-only.

## Prepare smoke environment

Use an environment where the API, frontend, and database can run together.

Record:

```txt
Commit SHA tested:
Database used:
Tenant used:
Outlet(s) used:
User/role used:
Browser/device:
Feature flags enabled:
```

Use a dedicated test tenant/outlet if possible.

Do not run destructive smoke on production tenant data.

## Manual smoke checklist — POS cashier flow

### A. POS load and cart

```txt
1. Open POS page.
2. Confirm tenant/outlet context is loaded.
3. Confirm products load.
4. Add product to cart.
5. Change quantity.
6. Remove item.
7. Add product with variant/options if available.
8. Confirm totals update correctly.
```

Expected:

```txt
No blank screen.
No console runtime crash.
Cart state is stable.
Totals are correct.
Outlet context is preserved.
```

### B. Full cash payment

```txt
1. Add stock-tracked product to cart.
2. Complete full cash payment.
3. Confirm order status/payment status is correct.
4. Confirm receipt flow still works if available.
5. Confirm order appears/updates in order queue if applicable.
```

Expected:

```txt
Payment succeeds once.
Order is not duplicated.
Receipt/queue behavior is unchanged.
```

### C. Partial payment

```txt
1. Enable/use partial payment if feature exists.
2. Create order total with multiple payment steps.
3. Pay first partial amount.
4. Confirm remaining balance is correct.
5. Pay final amount.
6. Confirm order becomes fully paid only after total paid amount reaches total due.
```

Expected:

```txt
No overpayment unless intentionally supported.
No double payment records.
No incorrect paid status before balance is settled.
```

### D. Draft / continue order

```txt
1. Add cart items.
2. Save draft/order hold if available.
3. Reopen/continue the order.
4. Confirm cart/order details remain correct.
5. Complete payment.
```

Expected:

```txt
Draft does not lose items.
Continue order does not duplicate items.
Final payment still works.
```

## Manual smoke checklist — Basic stock

### E. Basic stock decrement

```txt
1. Create or select product with stock tracking ON.
2. Set initial stock to 10 for outlet A.
3. Sell quantity 2 through POS.
4. Confirm final stock is 8.
5. Confirm a stock movement is created for the sale.
```

Expected:

```txt
Stock decreases exactly once.
Movement type/delta represents sale/outflow.
Movement references order/payment if supported.
```

### F. No tracking product

```txt
1. Create or select product with stock tracking OFF.
2. Sell the product.
3. Confirm sale succeeds.
4. Confirm stock is not decremented or movement behavior follows current intended rule.
```

Expected:

```txt
Non-tracked product does not accidentally create tracked stock mutation.
```

## Manual smoke checklist — Stock tracking / movement ledger

### G. Stock movement detail

```txt
1. Open stock movement/history page/API if available.
2. Locate movement from the POS sale.
3. Confirm fields:
   - product id
   - variant id if used
   - outlet id
   - quantity delta
   - movement type
   - reference order/payment if supported
   - timestamp
4. Refresh page/API.
5. Confirm movement is not duplicated.
```

Expected:

```txt
Movement ledger is consistent and idempotent.
```

### H. Retry / refresh idempotency

```txt
1. Repeat a payment/submit action using browser refresh/back/retry if safe.
2. Confirm order/payment is not duplicated.
3. Confirm stock movement is not duplicated.
4. Confirm stock is not deducted twice.
```

Expected:

```txt
One order/payment event produces one stock deduction.
```

## Manual smoke checklist — Variant stock

### I. Variant-specific stock

```txt
1. Create/select product with variants A and B.
2. Set stock A = 5 and stock B = 7.
3. Sell variant A quantity 1.
4. Confirm stock A = 4.
5. Confirm stock B remains 7.
6. Confirm order item stores correct variant reference.
```

Expected:

```txt
Variant stock is isolated.
Wrong variant must not be decremented.
```

## Manual smoke checklist — Outlet-scoped stock

### J. Multi-outlet stock isolation

```txt
1. Use outlet A and outlet B.
2. Set product stock in outlet A = 10.
3. Set same product stock in outlet B = 3.
4. Sell quantity 2 in outlet A.
5. Confirm outlet A stock = 8.
6. Confirm outlet B stock remains 3.
7. Switch outlet and verify displayed stock follows active outlet.
```

Expected:

```txt
Stock is outlet-scoped.
Order from outlet A must not deduct outlet B.
```

## Manual smoke checklist — Advanced inventory

Run only features that exist in the current app. Mark unavailable items as `not available`, not failed.

### K. Stock adjustment

```txt
1. Perform stock adjustment IN.
2. Confirm stock increases.
3. Confirm movement is recorded.
4. Perform stock adjustment OUT.
5. Confirm stock decreases.
6. Confirm movement is recorded.
```

Expected:

```txt
Adjustment changes stock once and creates correct movement.
```

### L. Transfer stock between outlets

```txt
1. Transfer product quantity from outlet A to outlet B if feature exists.
2. Confirm outlet A decreases.
3. Confirm outlet B increases.
4. Confirm transfer movements are recorded on both sides if supported.
```

Expected:

```txt
Transfer preserves total stock and respects outlet scope.
```

### M. Stock count / opname

```txt
1. Perform stock count/opname if feature exists.
2. Set counted quantity different from system quantity.
3. Confirm adjustment/movement is created.
4. Confirm final stock equals counted quantity.
```

Expected:

```txt
Stock count reconciles quantity without duplicate movement.
```

### N. Low stock threshold

```txt
1. Set low stock threshold if feature exists.
2. Sell or adjust stock below threshold.
3. Confirm low stock indicator/report appears if implemented.
```

Expected:

```txt
Low stock visibility is correct and outlet-aware if applicable.
```

### O. Supplier / purchase / restock

```txt
1. Create restock/purchase entry if feature exists.
2. Confirm stock increases.
3. Confirm movement/source reference is recorded.
```

Expected:

```txt
Restock creates correct stock increase and movement history.
```

## Manual smoke checklist — Cancel / void / refund stock behavior

### P. Cancel unpaid order

```txt
1. Create unpaid/draft/order hold with stock-tracked product if supported.
2. Confirm whether stock is reserved/deducted according to current rule.
3. Cancel the order.
4. Confirm stock restore/release follows current intended rule.
5. Confirm no double restore.
```

Expected:

```txt
Cancel behavior is deterministic and documented.
```

### Q. Void/refund paid order

```txt
1. Complete paid sale for stock-tracked product.
2. Confirm stock deducted.
3. Void/refund if feature exists.
4. Confirm stock handling follows intended rule:
   - automatic restore, or
   - manual restock required.
5. Confirm no double restore after retry/refresh.
```

Expected:

```txt
Refund/void stock behavior is clear, safe, and non-duplicating.
```

## Manual smoke checklist — Offline stock and sync

### R. Offline sale sync

```txt
1. Enable offline mode / simulate offline if supported.
2. Create sale for stock-tracked product.
3. Confirm local queue/offline save works.
4. Reconnect/sync.
5. Confirm order syncs once.
6. Confirm stock deducts once.
7. Confirm stock movement creates once.
```

Expected:

```txt
Offline sync does not double deduct stock.
```

### S. Offline retry/idempotency

```txt
1. Trigger sync retry if possible.
2. Confirm no duplicate order.
3. Confirm no duplicate payment.
4. Confirm no duplicate stock movement.
```

Expected:

```txt
Retry is idempotent for order/payment/stock.
```

## Manual smoke checklist — KDS / receipt / CFD interaction with stock

### T. KDS

```txt
1. Sell/send kitchen item if KDS enabled.
2. Confirm KDS ticket still appears.
3. Confirm stock behavior is not affected by KDS duplicate send/reprint.
```

Expected:

```txt
KDS does not create stock movement by itself unless intentionally designed.
```

### U. Receipt

```txt
1. Print/reprint receipt if available.
2. Confirm reprint does not create new payment/order/stock movement.
```

Expected:

```txt
Receipt print is side-effect safe for stock.
```

### V. Customer display / CFD

```txt
1. Confirm CFD/customer display update during ordering/payment/completion.
2. Confirm CFD messages do not affect stock or payment state.
```

Expected:

```txt
CFD is display-only and does not mutate inventory.
```

## Documentation output

Create this report file:

```txt
roadmap/refactor/reports/post-p8-2-pos-inventory-stock-smoke-report.md
```

Include:

```md
# Post-P8.2 POS + Inventory / Stock Smoke Report

## Environment

- Commit SHA tested:
- Date:
- Database/environment:
- Tenant:
- Outlet(s):
- User/role:
- Feature flags:

## Validation commands

- `pnpm check:boundaries`: pass/fail
- `pnpm --filter @pos/domain type-check`: pass/fail
- `pnpm --filter @pos/application type-check`: pass/fail
- `pnpm --filter @pos/infrastructure type-check`: pass/fail
- `pnpm --filter @pos/api type-check`: pass/fail
- `pnpm --filter @pos/terminal-web type-check`: pass/fail
- `pnpm type-check`: pass/fail

## Manual smoke results

Use this status format:

```txt
pass / fail / blocked / not available / not run
```

### POS cashier

| Case | Status | Evidence / Notes |
|------|--------|------------------|
| POS load | | |
| Add product to cart | | |
| Variant/options | | |
| Quantity update/remove | | |
| Full cash payment | | |
| Partial payment | | |
| Draft/continue order | | |

### Inventory / stock

| Case | Status | Evidence / Notes |
|------|--------|------------------|
| Basic stock decrement | | |
| Non-tracked product sale | | |
| Stock movement detail | | |
| Retry/idempotency | | |
| Variant stock | | |
| Outlet-scoped stock | | |
| Stock adjustment | | |
| Stock transfer | | |
| Stock count/opname | | |
| Low stock threshold | | |
| Restock/purchase | | |
| Cancel unpaid order stock behavior | | |
| Void/refund paid order stock behavior | | |
| Offline sale sync | | |
| Offline retry/idempotency | | |

### KDS / receipt / CFD

| Case | Status | Evidence / Notes |
|------|--------|------------------|
| KDS ticket | | |
| Receipt print/reprint | | |
| CFD/customer display | | |

## Bugs found

For each bug:

```txt
ID:
Severity:
Area:
Steps to reproduce:
Expected:
Actual:
Files likely involved:
Fix applied in this task: yes/no
Follow-up required: yes/no
```

## Final decision

- POS cashier flow safe: yes/no/partial
- Inventory stock flow safe: yes/no/partial
- Stock tracking safe: yes/no/partial
- Advanced stock safe: yes/no/partial/not available
- Offline stock sync safe: yes/no/partial/not available
- Ready for feature development: yes/no
```

## If a bug is found

If the bug is small, obvious, and directly caused by refactor, fix it in the same branch and document the fix.

If the bug is not small or touches payment/order/inventory semantics deeply, do not guess. Document it and create a follow-up prompt under:

```txt
roadmap/refactor/prompts/post-p8-3-fix-<case>-prompt.md
```

## Commit

If only report is added:

```bash
git commit -m "test(smoke): document POS inventory stock validation"
```

If a small fix is included:

```bash
git commit -m "fix(smoke): stabilize POS inventory stock flow"
```

Then push.

## Final response required

Report:

```txt
Post-P8.2 status:
Commit SHA:
Report path:
Commands run:
Manual smoke summary:
Bugs found:
Fixes applied:
Follow-up prompts created:
Ready for feature development: yes/no
```
