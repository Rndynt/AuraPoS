# Partial Payment Lifecycle Fix — Replit Agent Prompt

## Problem

Partial payment order flow is currently ambiguous and unsafe.

Observed behavior:

```txt
1. Full paid order works correctly.
   - Report transaction detail is correct.
   - Orders page detail status is safe.

2. Partial paid order is recorded in report as partial.
   - But Orders page detail/bottom sheet does not show paid amount, remaining amount, or payment history.
   - Order lifecycle status remains draft.
   - User can continue the order from draft.
   - In POS, clicking pay again does not clearly settle the remaining amount.
   - Order remains partial and still draft.
```

This is dangerous because a financially active order is being treated as an editable draft.

## Root cause from codebase

Current partial flow in POS creates an order first using `createOrder`, then records payment using `recordPOSPartialPayment`.

Relevant files:

```txt
apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx
apps/pos-terminal-web/src/features/pos/services/posOrderService.ts
packages/application/orders/CreateOrder.ts
packages/application/orders/mappers.ts
packages/infrastructure/repositories/orders/DrizzleRecordPaymentRepository.ts
packages/infrastructure/repositories/orders/DrizzleCreateAndPayOrderRepository.ts
apps/pos-terminal-web/src/pages/orders.tsx
```

Current behavior details:

```txt
1. CreateOrder uses toInsertOrderDb().
2. toInsertOrderDb() creates orders with status = draft, paidAmount = 0, paymentStatus = unpaid.
3. Partial payment flow then calls /api/orders/:id/payments.
4. DrizzleRecordPaymentRepository updates paid_amount and payment_status only.
5. DrizzleRecordPaymentRepository does not update order.status from draft to confirmed.
6. Orders page detail only shows item summary and total, not paid/remaining/payment history.
7. POS continueOrderId flow updates order then returns immediately; it does not continue to payment dialog for existing partial order.
```

## Required business rule

Order lifecycle status and payment status are different dimensions.

```txt
orders.status = operational lifecycle
orders.payment_status = financial lifecycle
```

A partially paid order is not a draft.

Correct rule:

```txt
Draft = unpaid, editable, not financially active.
Confirmed = order accepted / financially active / can be prepared / has payment activity.
Partial = payment_status only, not order status.
```

Required status behavior:

```txt
Unpaid saved cart / draft order:
  status = draft
  payment_status = unpaid
  paid_amount = 0

Partial paid order:
  status = confirmed
  payment_status = partial
  paid_amount > 0
  remaining_amount > 0

Fully paid quick order:
  status = confirmed by default, or completed only when explicit instant fulfillment is requested
  payment_status = paid
  paid_amount = total

Cancelled order:
  status = cancelled
  payment cannot be recorded
```

## Non-negotiable rules

Do not treat partial payment as draft.

Do not allow a financially active order (`payment_status=partial` or `paid_amount>0`) to be edited through normal draft continuation without explicit supported flow.

Do not make `partial` an order status. It belongs to `payment_status` only.

Do not close/complete an order automatically just because it is partially paid.

Do not remove existing full-payment behavior.

Do not break report transaction detail that already shows partial.

Do not reintroduce old payment orchestration/NorthFlow code.

Keep standard POS tender/cash behavior working.

## Backend fix requirements

### 1. Make record payment move draft to confirmed when money is recorded

Update:

```txt
packages/infrastructure/repositories/orders/DrizzleRecordPaymentRepository.ts
```

Current update only sets:

```txt
paid_amount
payment_status
updated_at
```

Change it so when `orderRow.status = draft` and `newPaidAmount > 0`, it also sets:

```txt
status = confirmed
```

Pseudo logic:

```ts
const shouldConfirmOrder = orderRow.status === 'draft' && newPaidAmount > 0;

UPDATE orders
SET
  paid_amount = ...,
  payment_status = ...,
  status = CASE WHEN shouldConfirmOrder THEN 'confirmed' ELSE status END,
  updated_at = NOW()
WHERE id = ... AND tenant_id = ...
RETURNING *;
```

This makes backend robust even if some flow still creates draft first and then records partial payment.

### 2. Prefer atomic create-and-pay for new partial paid orders

Update POS partial flow in:

```txt
apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx
```

Current partial branch does:

```txt
createOrderMutation.mutateAsync(buildOrderPayload())
recordPOSPartialPayment(orderId, partialAmount, paymentMethod)
```

Replace this for new orders with one atomic create-and-pay call if the existing hook/service supports it:

```txt
useCreateAndPay
POST /api/orders/create-and-pay
amount = partialAmount
payment_method = selected payment method
```

Expected result:

```txt
order.status = confirmed
order.payment_status = partial
paid_amount = partialAmount
remainingAmount = total - partialAmount
```

If `useCreateAndPay` cannot be reused cleanly, keep createOrder + recordPayment but backend rule above must still confirm draft on first payment. Prefer atomic create-and-pay because it avoids orphan/draft-after-payment risks.

### 3. Existing partial order repayment endpoint

For an existing partial order, the correct action is to record an additional payment against the existing order:

```txt
POST /api/orders/:id/payments
```

If payment completes the balance:

```txt
payment_status = paid
status remains confirmed/preparing/ready/served, unless cashier explicitly completes it
remainingAmount = 0
```

If still not complete:

```txt
payment_status = partial
remainingAmount > 0
```

Do not force status back to draft.

## POS frontend fix requirements

### 1. Separate draft edit from partial settlement

Update:

```txt
apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx
apps/pos-terminal-web/src/features/pos/services/posOrderService.ts
apps/pos-terminal-web/src/pages/orders.tsx
```

`continueOrderId` should be for unpaid draft editing only.

If an order has:

```txt
payment_status = partial
paid_amount > 0
```

then POS must not treat it as a normal draft continuation.

### 2. Fix continueOrderId payment behavior

Current `handleCharge` does:

```ts
if (continueOrderId) {
  await handleUpdateContinueOrder();
  return;
}
```

This means clicking pay while continuing an order only updates the order, then stops. It never opens a payment dialog or records remaining payment.

Correct behavior:

```txt
If continuing an unpaid draft order:
  update order, then open payment dialog OR save draft depending user's button intent.

If settling a partial order:
  do not run normal update-only draft path.
  open payment dialog with default amount = remainingAmount.
  call record payment on that existing order.
```

At minimum:

```txt
- Do not show “continue order” as the main action for partial paid orders.
- Show “Lunasi Sisa” / “Tambah Pembayaran” action instead.
```

### 3. Add remaining-payment flow from Orders page

In:

```txt
apps/pos-terminal-web/src/pages/orders.tsx
```

For selected order with `payment_status === 'partial'`, show:

```txt
Total
Dibayar
Sisa
Payment status badge: PARTIAL
Button: Lunasi Sisa
```

Button behavior:

```txt
Click Lunasi Sisa
→ POST /api/orders/:id/payments with amount = remainingAmount
→ invalidate /api/orders and /api/orders/:id
→ refresh bottom sheet
→ if remaining is zero, payment_status becomes paid
```

Existing `handleProcessTransaction` already computes `remainingAmount` and records payment. Improve UX/labels so it is clearly a settlement flow:

```txt
Button text for partial: Lunasi Sisa
Button text for unpaid draft/confirmed: Proses Transaksi
Disabled when paid
```

### 4. Add payment summary to order detail bottom sheet

In:

```txt
apps/pos-terminal-web/src/pages/orders.tsx
```

Add a dedicated payment summary card in the detail panel after the order total summary:

```txt
Pembayaran
- Status: PAID / PARTIAL / UNPAID
- Total: Rp xxx
- Dibayar: Rp xxx
- Sisa: Rp xxx
```

If `payments` array is available:

```txt
Riwayat Pembayaran
- method
- amount
- date
- reference
```

If `payments` is not available from backend detail response, update backend repository/API mapping so `GET /api/orders/:id` returns payments for detail. At minimum return paid_amount/payment_status so the UI can show total/paid/remaining.

### 5. List card should show partial payment amount

On order cards, if payment_status is partial, show a compact line:

```txt
Dibayar Rp x / Sisa Rp y
```

Do not only show total and PARTIAL badge.

## Backend/API detail response requirement

Ensure:

```txt
GET /api/orders/:id
```

returns enough payment data for UI:

```txt
paid_amount
payment_status
total_amount
payments[] if available
```

If repository `findById` does not include `payments[]`, either add it or add a dedicated method for order detail with payments.

Do not break existing list response.

## Report/list filtering behavior

Partial paid orders should be visible in Orders page as active orders, but under operational status `confirmed`, not `draft`.

Expected:

```txt
Orders page status filter:
- Draft: unpaid drafts only
- Confirmed/Active: partial paid order appears here
- Payment badge: PARTIAL
```

Reports should continue showing transaction detail as partial.

## Tests required

Add/update tests for backend and frontend where possible.

### Backend tests

1. Create draft order then record partial payment:

```txt
Before payment:
status=draft, payment_status=unpaid, paid_amount=0
After payment:
status=confirmed, payment_status=partial, paid_amount=partial amount
```

2. Create draft order then record full payment:

```txt
status=confirmed, payment_status=paid, paid_amount=total
```

3. Create-and-pay with partial amount:

```txt
status=confirmed
payment_status=partial
remainingAmount > 0
```

4. Add second payment to partial order:

```txt
payment_status becomes paid when fully paid
status does not become draft
remainingAmount = 0
```

5. Payment to cancelled order remains rejected.

### Frontend tests or smoke checks

1. Partial order detail shows:

```txt
Dibayar
Sisa
PARTIAL
```

2. Partial order action button says:

```txt
Lunasi Sisa
```

3. Continuing an order with payment_status partial does not route into ambiguous draft edit flow.

4. Draft order still can be edited.

## Manual smoke test

After patch, run this scenario:

### Full payment order

```txt
1. Create order.
2. Pay full.
3. Check Orders page.
4. Check Reports.
```

Expected:

```txt
status confirmed or completed depending fulfillment mode
payment_status paid
paid_amount = total
remaining = 0
report detail correct
```

### Partial payment order

```txt
1. Create order.
2. Pay partial.
3. Open Orders page.
4. Open bottom sheet.
```

Expected:

```txt
status = confirmed
payment_status = partial
Dibayar visible
Sisa visible
Button = Lunasi Sisa / Tambah Pembayaran
Not listed as draft
Not treated as editable draft
```

### Settle partial order

```txt
1. Click Lunasi Sisa.
2. Confirm payment.
3. Refresh Orders page/detail.
```

Expected:

```txt
payment_status = paid
paid_amount = total
remaining = 0
status remains confirmed/preparing/ready/served unless explicitly completed
```

## Validation commands

Run:

```bash
pnpm --filter @pos/api type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/terminal-web type-check
pnpm type-check
pnpm run db:check
pnpm --filter @pos/api test
```

Run any focused frontend tests available for orders/POS partial payment.

## Required report

Create:

```txt
roadmap/orders/partial_payment_lifecycle_fix_report.md
```

Report must include:

```md
# Partial Payment Lifecycle Fix Report

## Summary

## Root cause

## Backend changes
- RecordPayment confirms draft on first payment: yes/no
- create-and-pay partial returns confirmed + partial: yes/no
- GET /api/orders/:id returns paid/remaining/payment detail: yes/no

## Frontend changes
- Partial order detail shows paid and remaining: yes/no
- Partial order action uses Lunasi Sisa/Tambah Pembayaran: yes/no
- Partial orders no longer appear as draft: yes/no
- Continue draft flow still works for unpaid draft: yes/no

## Smoke test
- Full payment order:
- Partial payment order:
- Settle partial order:

## Tests/commands run

## Remaining blockers
```

## Commit

Use commit message:

```bash
git commit -m "fix(orders): clarify partial payment lifecycle"
```

Then push.

## Final response required

Return:

```txt
Partial payment lifecycle fix status:
Commit SHA:
Files changed:
Backend draft-to-confirmed on payment: yes/no
Partial create-and-pay status confirmed: yes/no
Orders detail paid/remaining visible: yes/no
Partial order settle action works: yes/no
Draft continuation remains only for unpaid drafts: yes/no
Tests/commands run:
Remaining blockers:
```
