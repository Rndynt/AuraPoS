# P9 POS Payment Usability Completion Report

Date: 2026-06-21
Source prompt: `roadmap/business-flows/replit_codex_P9_pos_payment_usability_completion_prompt.md`

## 1. Summary

P9 separates cashier payment **methods** from payment **flow modes** and adds persisted payment-flow metadata for the existing transaction-safe payment paths.

Implemented in this batch:

- Payment methods are now cashier-facing manual tender methods: Tunai, Manual QRIS, and Manual Bank Transfer.
- Optional flow modes are entitlement-gated independently in retail/restaurant POS adapters: DP, multi payment, and split bill.
- Full payment stays always available and does not depend on `orders_queue`.
- Payment rows now support P9 metadata fields: tenant/outlet, flow, kind, received/change amount, status, split reference, sequence, reference note, and metadata.
- Added a minimal `order_bill_splits` table for future persistent split contexts.
- `recordPayment` and `createAndPay` now pass flow/kind/cash-change metadata into `order_payments` and keep `payment_status` derived from paid amount vs total.
- Added calculation helper tests for paid/remaining/status/change, multi payment limits, and split completion rules.

## 2. Current payment flow bugs found

- The POS dialog visually had DP/multi/split controls, but parent submit handling collapsed most confirmations into a single full-payment submission.
- Multi payment collected line entries in UI but submitted only one method to the parent handler.
- Split bill could trigger a payment action for a bill amount without a durable split context or backend split identifier.
- Retail disabled partial and split controls even when entitlements existed.
- Cashier labels still exposed `Kartu Debit / Kredit`, which does not match the required built-in manual methods for P9.

## 3. Payment method vs payment flow model

Payment methods are now treated as tender types:

| Method | Current internal value | Cashier label |
| --- | --- | --- |
| Cash | `cash` | Tunai |
| Manual QRIS | `ewallet` | Manual QRIS |
| Manual bank transfer | `card` | Transfer |

Payment flow modes are independent:

| Flow | Entitlement | Notes |
| --- | --- | --- |
| Full payment | none | Always available for checkout-capable tenants. |
| DP / partial | `payments_partial_payment` | Uses `payment_flow=dp`. |
| Multi payment | `payments_multi_payment` | P9 max two lines. |
| Split bill | `payments_split_bill` or alias `payments_split_payment` | P9 max four split lines; persistent split table added, but POS split setup is still session-shaped metadata unless a UUID split context is supplied. |

## 4. Payment persistence contract and schema/API changes

Schema additions:

- `order_payments.tenant_id`
- `order_payments.outlet_id`
- `order_payments.payment_flow`
- `order_payments.payment_kind`
- `order_payments.received_amount`
- `order_payments.change_amount`
- `order_payments.status`
- `order_payments.split_id`
- `order_payments.sequence`
- `order_payments.reference_note`
- `order_payments.metadata`
- new `order_bill_splits` table

Migration: `migrations/0016_p9_payment_flows.sql`.

API additions:

- `POST /api/orders/:id/payments` accepts flow/kind/cash/split metadata.
- `POST /api/orders/create-and-pay` accepts flow/kind/cash metadata.
- Legacy request values `full_payment` and `partial_payment_dp` are normalized to `full` and `dp`.

## 5. Full payment implementation/result

Full payment remains the default dialog mode. For full cash, the UI records received cash and change amount. For manual QRIS/transfer, the payment amount is exact and no change is calculated.

Backend result: one `order_payments` row with `payment_flow=full`, `payment_kind=full_payment`, and order `payment_status=paid` only when paid amount covers total/remaining.

## 6. DP/partial implementation/result

DP is shown when `payments_partial_payment` is active. Fresh-cart DP uses `create-and-pay` with `payment_flow=dp` and `payment_kind=down_payment`; active-order settlement uses `recordPayment` and maps full remaining settlement to `remaining_payment` when amount covers the updated total.

Guardrails added in persistence:

- DP rows are capped at two succeeded rows for P9.
- `down_payment` must be below remaining balance.
- Payment status remains partial when paid amount is below total.

## 7. Multi payment implementation/result

Multi payment is shown when `payments_multi_payment` is active. UI line collection remains capped at two payment lines by helper validation. For persisted active orders, each line is submitted as a separate `order_payments` row with `payment_flow=multi`, `payment_kind=multi_line`, and sequence.

Fresh-cart multi payment is intentionally blocked with a clear message in this batch because the current atomic create-and-pay path creates one payment row. This avoids faking a multi-payment full settlement before a multi-row create-and-pay application use case exists.

## 8. Split bill implementation/result

Split bill is shown when `payments_split_bill` or alias `payments_split_payment` is active. P9 adds the persistent `order_bill_splits` table and stores session split details in payment metadata when a persisted split UUID is not present.

Limitation: the POS split UI still creates a session split setup rather than calling a dedicated split-create API. Therefore, split payments are not claimed as fully production-complete persistent split workflows yet. The implementation avoids fabricating a final paid state from split UI alone; payment status still depends on persisted succeeded payment rows covering the order total.

## 9. Entitlement gating matrix

| Flow | Retail POS | Restaurant POS | Backend |
| --- | --- | --- | --- |
| Full | always visible | always visible | `PAY_ACTIVE_ORDER`; no `orders_queue` requirement |
| DP | `can("payments_partial_payment")` | `can("payments_partial_payment")` | `payments_partial_payment` required |
| Multi | `can("payments_multi_payment")` | `can("payments_multi_payment")` | `payments_multi_payment` required |
| Split | `can("payments_split_bill") || can("payments_split_payment")` | `can("payments_split_bill") || can("payments_split_payment")` | `payments_split_bill` required through canonical SOT |

## 10. Backend/API support audit

- Existing `RecordPayment` was transaction-safe and row-locks orders before recalculating paid/remaining status.
- Existing `CreateAndPayOrder` was atomic for creating an order and one payment row.
- Existing schema lacked P9 row-level flow/kind/cash/split metadata; minimal compatible nullable/default fields were added.
- Existing split bill persistence did not exist; `order_bill_splits` was added for the next API step.
- Payment status remains derived from persisted paid amount and total, not from UI button selection.

## 11. Payment row persistence test matrix

| Case | Current coverage/result |
| --- | --- |
| Full cash row metadata | Type-check covered; existing create-and-pay/API tests cover one payment row. |
| Full QRIS/transfer row metadata | Type-check covered; manual labels and payload mapping updated. |
| DP first row partial status | Existing partial lifecycle API tests pass; P9 metadata added. |
| DP second row paid status | Existing partial lifecycle API tests pass; P9 row cap added. |
| Multi two-line exact total | Helper tests cover line limit and total equality; active-order UI loops line persistence. |
| Multi first-line no auto-settle | Helper tests reject below-total multi completion. |
| Split all paid completion | Helper tests cover split totals/paid completion. |
| Split one bill no full completion | Helper tests reject incomplete split paid state. |

## 12. Tests added/updated

Added:

- `apps/pos-terminal-web/src/features/pos-core/services/posPaymentFlowService.ts`
- `apps/pos-terminal-web/src/features/pos-core/services/__tests__/posPaymentFlowService.test.ts`
- `packages/application/orders/paymentFlow.ts`
- `packages/application/orders/__tests__/paymentFlow.test.ts`

Updated package test scripts so these tests run in terminal-web and application test suites.

## 13. Validation output

Commands run and result:

- `pnpm --filter @pos/terminal-web type-check` — pass
- `pnpm --filter @pos/terminal-web test` — pass
- `pnpm --filter @pos/application type-check` — pass
- `pnpm --filter @pos/application test` — pass
- `pnpm --filter @pos/api type-check` — pass
- `pnpm --filter @pos/api test` — pass, 181 tests
- `pnpm type-check` — pass, 10 packages

## 14. Cleanup grep findings

Command:

```bash
rg -n "orders_queue.*full payment|orders_queue.*recordPayment|recordPayment.*orders_queue|plan.*businessProfile|restaurant_table_service.*businessType|businessType.*restaurant_table_service|GenericPOSPage|features/pos/services|features/pos/mappers" apps packages shared
```

Result: no matches.

Command:

```bash
rg -n "set.*payment_status.*paid|paymentStatus.*paid|mark.*paid|status.*paid" apps/pos-terminal-web/src/features/pos-core apps/pos-terminal-web/src/features/pos-flows packages/application/orders apps/api/src/http/controllers
```

Findings are expected lifecycle/read/validation references. No frontend DP/multi/split path was found that directly sets `payment_status=paid` from a button click.

## 15. Remaining limitations

- The database migration adds nullable/default-compatible metadata fields, but existing deployed databases must run `migrations/0016_p9_payment_flows.sql` before new metadata can persist.
- Fresh-cart multi payment is blocked until an atomic create-order-and-many-payments use case is added.
- Split setup needs a dedicated API to create `order_bill_splits` rows before payment so `split_id` can be a real UUID instead of session metadata.
- Existing method enum still uses `card` and `ewallet` internally for manual transfer and manual QRIS compatibility; a future migration can rename enum/API vocabulary more explicitly.

## 16. Next recommended phase

P9.1 should add a dedicated backend use case and endpoint for:

1. create order with multiple payment rows atomically;
2. create/list/update `order_bill_splits` for a tenant/order;
3. pay a split by persisted `split_id`;
4. API-level persistence tests asserting exact row counts and split table state.
