# Partial Payment Lifecycle Fix Report

## Summary

Fixed three interconnected issues that left partially paid orders in an ambiguous, unsafe state:
1. **Backend**: `DrizzleRecordPaymentRepository` did not promote a `draft` order to `confirmed` when the first payment was recorded. A financially active order was indistinguishable from an editable draft.
2. **POS frontend**: The partial payment flow used a 2-step `createOrder` → `recordPOSPartialPayment` sequence. Even with the backend fix, this risked orphaned drafts. Replaced with atomic `create-and-pay` call.
3. **POS frontend**: `handleCharge` with `continueOrderId` always routed to the "update items" path and returned, never opening a payment dialog for partial orders.
4. **Orders page**: The detail panel showed no paid/remaining breakdown, no payment history, and the action button always said "Proses Transaksi" regardless of payment status. List cards showed only the PARTIAL badge without amounts.

## Root cause

- `DrizzleRecordPaymentRepository.ts` UPDATE set `paid_amount`, `payment_status`, `updated_at` only — omitting `status` promotion. A draft order with `payment_status=partial` looked like an editable draft throughout the UI.
- `POSPage.tsx` partial flow: `createOrderMutation` → `recordPOSPartialPayment` — 2 separate calls with a window for orphan orders if the second call fails.
- `handleCharge` early-return for `continueOrderId` prevented payment dialog from ever appearing for partial orders.
- `orders.tsx` had no payment summary card, no payment history block, and no dynamic button label.

## Backend changes

- **RecordPayment confirms draft on first payment**: yes  
  Added `status = CASE WHEN status = 'draft' AND newPaidAmount > 0 THEN 'confirmed' ELSE status END` to the UPDATE SQL in `DrizzleRecordPaymentRepository.ts`. Backend is now robust even if an older code path uses the 2-step flow.

- **create-and-pay partial returns confirmed + partial**: yes  
  `DrizzleCreateAndPayOrderRepository` already set `status=confirmed` for new orders. With the frontend change switching the partial DP flow to use `useCreateAndPay`, partial orders now start as `confirmed` atomically.

- **GET /api/orders/:id returns paid/remaining/payment detail**: yes  
  `OrderRepository.findById` already included a `payments[]` join. No backend change required. `paid_amount` and `payment_status` were already in the response.

## Frontend changes

- **Partial order detail shows paid and remaining**: yes  
  Added "Pembayaran" card in the detail panel showing Status badge, Total, Dibayar, and Sisa (remaining). Added "Riwayat Pembayaran" section showing each payment record (method, amount, date, reference) when `payments[]` is available.

- **Partial order action uses Lunasi Sisa/Tambah Pembayaran**: yes  
  Button label is now dynamic: `"Lunasi Sisa"` when `payment_status === "partial"`, `"Proses Transaksi"` for unpaid orders, disabled for paid.

- **Partial orders no longer appear as draft**: yes  
  Backend fix promotes status to `confirmed` on first payment. Orders with `payment_status=partial` will be in the `confirmed` filter tab, not `draft`.

- **Continue draft flow still works for unpaid draft**: yes  
  `handleCharge` in `POSPage.tsx` only intercepts `continueOrderId` + `payment_status === 'partial'`. Unpaid drafts still route to `handleUpdateContinueOrder` as before.

## Additional changes

- **List card partial amount**: Added compact "Dibayar Rp x / Sisa Rp y" row on order cards when `payment_status === "partial"`.
- **Settle existing partial from POS**: `handlePaymentMethodConfirm` now has an early path — when `pendingOrderForPayment` is set (triggered by `handleCharge` detecting a partial order), it calls `recordPaymentMutation` on the existing order ID without creating a new order. Cart validation is bypassed for this path.

## Smoke test

- **Full payment order**: Existing flow unchanged. `submitOrder` → `createAndPay` with `amount=total` → `status=confirmed`, `payment_status=paid`.
- **Partial payment order**: `useCreateAndPay` with `amount=partialAmount` → `status=confirmed`, `payment_status=partial`, `remainingAmount>0`. Orders page shows PARTIAL badge + Dibayar/Sisa breakdown.
- **Settle partial order**: Click order in Orders page → click "Lunasi Sisa" → `recordPaymentMutation` posts remaining → `payment_status=paid`, `remainingAmount=0`.

## Tests/commands run

```bash
pnpm --filter @pos/api type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/terminal-web type-check
pnpm type-check
pnpm run db:check
pnpm --filter @pos/api test
```

New test file added: `apps/api/src/__tests__/partial-payment-lifecycle.test.ts`

Tests cover:
1. draft → confirmed on first partial payment
2. draft → confirmed on first full payment
3. confirmed order stays confirmed when partial payment added
4. second payment brings partial → paid; status never reverts to draft
5. cancelled order rejects payment

## Remaining blockers

None. All changes are self-contained. The backend fix is a defensive layer that ensures correctness regardless of which frontend flow is used.
