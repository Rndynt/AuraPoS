# Payment Flow Entitlement Separation Report

## Summary

Implemented the safe separation layer for DP/Bayar Sebagian, Multi Payment, and Split Bill without pretending that split bill item-level persistence exists yet.

This batch completed:

- Entitlement SOT wording cleanup for DP and Multi Payment.
- Canonical Split Bill entitlement key: `payments_split_bill`.
- Legacy alias compatibility: `payments_split_payment` resolves to `payments_split_bill` for active grants and frontend `can()` compatibility.
- POS payment dialog entry point now exposes separate actions for Bayar Penuh, DP/Bayar Sebagian, Multi Payment, and Split Bill based on independent entitlement checks.
- DP submission sends explicit `payment_flow: "partial_payment_dp"` metadata.
- Backend create-and-pay rejects DP-style underpayment unless `payments_partial_payment` is effective.
- Multi Payment and Split Bill are intentionally separated in the UI but not processed as fake sequential payments/DP while their final backend models are not complete.

## Product definitions applied

- DP/Bayar Sebagian: one order, one total bill, amount paid now is less than total, remaining balance is paid later through the DP entitlement `payments_partial_payment`.
- Multi Payment: one order, one total bill, multiple tender methods in one checkout session, guarded by `payments_multi_payment`; final atomic backend payment-session endpoint is still required before processing real multi-method payments.
- Split Bill: one order split into item/quantity-level sub-bills, guarded by `payments_split_bill`; final split bill tables/API are still required before processing real split-bill payments.

## Entitlement changes

- payments_partial_payment wording fixed: yes.
- payments_multi_payment independent: yes.
- payments_split_bill canonical or legacy alias: yes; `payments_split_bill` is canonical and `payments_split_payment` is a legacy alias.
- marketplace cards separated: yes; the SOT exposes only canonical `payments_split_bill`, avoiding duplicate legacy/canonical cards.

## UI changes

- payment entry point separated: yes.
- DP dialog/panel: yes; DP is selected as its own payment flow action instead of a generic partial/split toggle.
- Multi Payment dialog/panel: partially implemented; shown as a separate entitlement-gated panel, but submit is intentionally blocked until an atomic backend payment-session endpoint exists.
- Split Bill wizard: not implemented yet; shown as a separate entitlement-gated coming-soon/safety panel because item-level split persistence is not yet implemented.

## Backend changes

- DP endpoint/flow guarded: partially yes. `POST /api/orders/create-and-pay` detects/guards DP underpayment and explicit `payment_flow: "partial_payment_dp"`; `POST /api/orders/:id/payments` guards explicit DP metadata while still allowing full remaining-balance settlement.
- Multi-payment atomic endpoint: not implemented yet. Sequential frontend calls were intentionally avoided to prevent fake partial payments and inconsistent audit trails.
- Split bill item allocation model: not implemented yet. No fake split bill flow was added.

## Tests/commands run

- `pnpm --filter @pos/application type-check` — pass.
- `pnpm --filter @pos/api type-check` — pass.
- `pnpm --filter @pos/terminal-web type-check` — pass.
- `pnpm --filter @pos/terminal-web build` — pass with existing Vite/PostCSS/chunk-size warnings.
- `pnpm --filter @pos/api test -- inventory-entitlement` — pass; current script executed the API test suite successfully.
- `pnpm --filter @pos/terminal-web exec tsx --test src/__tests__/entitlement-catalog.test.ts` — pass.
- `pnpm --filter @pos/terminal-web exec node --test src/__tests__/entitlement-catalog.test.ts` — failed because the frontend TypeScript ESM test requires `tsx`; rerun with `tsx` passed.

## Remaining blockers

- Add real atomic multi-payment backend commands:
  - `POST /api/orders/create-and-pay-multi`
  - `POST /api/orders/:id/payments/multi`
  - payment session/batch idempotency.
- Add split bill schema/domain/API:
  - `order_split_bills`
  - `order_split_bill_items`
  - `order_payments.split_bill_id`
  - item quantity allocation validation.
- Add full smoke/e2e coverage after those backend models exist.
