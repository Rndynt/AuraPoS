# Replit/Codex Prompt P9.13 — Split Bill Active Order Full Hydration Final Fix

Repository: `Rndynt/AuraPoS`

## Goal

Fix the remaining Split Bill resume bug after P9.12.

Manual result:

```txt
- Cart pricing is fixed.
- Split Bill resume is still not fixed.
- User already paid Bill A.
- Remaining order amount is Rp 91.350.
- When the order is opened again and Split is selected, UI still shows Bill A Rp 0, Bill B Rp 0, Bill A active, and all item quantities available.
- Backend already knows Bill A was paid because repeat payment is refused.
```

Expected result:

```txt
- Reopening a partially paid split order must hydrate full persisted split state before opening PaymentMethodDialog.
- Bill A shows its original amount and Lunas/PAID.
- Bill A is disabled/read-only.
- Active bill defaults to Bill B or the next unpaid bill.
- Paid Bill A item quantities are locked and not assignable again.
- Remaining unpaid item quantities are visible for Bill B.
```

## Suspected root cause to prove

Do not guess. Inspect and prove the data path.

Likely current bad path:

```txt
CombinedDraftSheet -> useOpenOrders() -> GET /api/orders/open -> ListOpenOrders -> OrderRepository.findByTenant
```

`findByTenant` returns list rows and items, but not full `billSplits` / split item assignments.

Then:

```txt
CombinedDraftSheet passes the list row to onPayActiveOrder(order)
usePOSActiveOrderPayment stores that incomplete order in pendingOrderForPayment
RetailStandardPOSFlow passes pendingOrderForPayment.order.billSplits to PaymentMethodDialog
billSplits is empty because the order object came from /api/orders/open
PaymentMethodDialog falls back to default A/B local state with Rp 0
```

This is why P9.12 changed PaymentMethodDialog internals but the UI still does not change: the dialog is not receiving the persisted split data.

## Files to inspect

```txt
apps/pos-terminal-web/src/components/pos/CombinedDraftSheet.tsx
apps/pos-terminal-web/src/features/pos-core/hooks/usePOSActiveOrderPayment.ts
apps/pos-terminal-web/src/features/pos-core/services/posOrderApiService.ts
apps/pos-terminal-web/src/features/pos-flows/retail/RetailStandardPOSFlow.tsx
apps/pos-terminal-web/src/features/pos-flows/restaurant/RestaurantTableServicePOSFlow.tsx
apps/pos-terminal-web/src/lib/api/tableHooks.ts
packages/application/orders/ListOpenOrders.ts
packages/infrastructure/repositories/orders/OrderRepository.ts
apps/api/src/http/handlers/orders/history.ts
apps/api/src/http/handlers/orders/listOrders.ts
apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Run:

```bash
rg -n "useOpenOrders|/api/orders/open|ListOpenOrders|findByTenant|findById\(|billSplits|orderBillSplits|orderBillSplitItems|pendingOrderForPayment|payActiveOrder|existingSplitBills|PaymentMethodDialog" apps packages
```

## Required fix

The active-order payment entry path must fetch full order detail before opening the payment dialog.

Correct flow:

```txt
open-orders list row -> click Bayar -> fetch GET /api/orders/:id -> get full order with billSplits/items/payments -> set pendingOrderForPayment with the full order -> open PaymentMethodDialog
```

Recommended implementation:

```txt
- Make usePOSActiveOrderPayment.payActiveOrder async.
- Import and call fetchOrderForPOS(order.id).
- Use the fetched full order to resolve remaining amount.
- Store the fetched full order in pendingOrderForPayment.order.
- Open PaymentMethodDialog only after full order data is available.
```

Pseudo-code:

```ts
const payActiveOrder = async (order: POSLifecycleOrder) => {
  const fullOrder = await fetchOrderForPOS(order.id);
  const hydratedOrder = fullOrder ?? order;
  const result = resolvePOSActiveOrderPaymentAmount(hydratedOrder);
  if (!result.ok) {
    toast({ title: "Pembayaran diblokir", description: result.reason, variant: "destructive" });
    return;
  }
  input.setPendingOrderForPayment({
    orderId: hydratedOrder.id,
    totalAmount: result.amount,
    orderNumber: result.orderNumber,
    order: hydratedOrder,
  });
  input.openPaymentDialog();
};
```

If needed, add loading state for the clicked row in CombinedDraftSheet so cashier cannot double click while full order is loading.

## Full read model requirement

`GET /api/orders/:id` must return enough data for split resume:

```txt
items[] with stable DB order item id
billSplits[] with id, clientBillId, label, splitNo, amountDue, amountPaid, status, items[]
billSplits.items[] with orderItemId, clientBillId, quantity, amount
payments[] if available
```

If OrderRepository.findById already returns this, verify the controller/handler returns it unchanged.

Do not use `/api/orders/open` list row as the source of truth for split resume unless it also returns full split state.

## PaymentMethodDialog props requirement

For retail and restaurant flow:

```tsx
existingSplitBills={
  pendingOrderForPayment?.order?.billSplits
  ?? pendingOrderForPayment?.order?.splits
  ?? []
}
```

This only works if `pendingOrderForPayment.order` is the full fetched order.

When paying an active order, prefer hydrated full order items over local cart items if local cart is stale or empty.

## Refetch after payment

After submitPOSPayment returns PARTIAL or PAID:

```txt
- invalidate /api/orders/open query
- invalidate order list/detail query if available
- clear pending payment session
- close dialog
```

This prevents reopening the sheet with stale list data.

## UX acceptance

For the screenshot case:

```txt
Bill A:
- shows original paid amount, not Rp 0
- shows Lunas/PAID
- disabled/read-only

Bill B:
- active by default
- can receive remaining quantities

Items:
- quantities already paid in Bill A are not assignable again
- remaining quantities are visible
```

The UI must not invite the cashier to pay Bill A again.

## Tests

Add/update tests if possible:

```txt
1. payActiveOrder receives an open-orders list row with no billSplits.
2. payActiveOrder fetches GET /api/orders/:id.
3. pendingOrderForPayment.order becomes the full order with billSplits.
4. PaymentMethodDialog receives Bill A PAID data.
5. Bill A renders amount + Lunas and is disabled.
6. Active bill becomes Bill B.
7. Remaining item quantities are visible.
```

Manual test:

```txt
1. Create split bill.
2. Pay Bill A.
3. Close dialog.
4. Open Draft/Pesanan Aktif sheet.
5. Click Bayar on the same partial order.
6. Open Split.
7. Verify Bill A paid/locked and Bill B active.
8. Verify remaining items visible.
9. Pay Bill B.
10. Verify order becomes Lunas.
```

## Report update

Update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Add section:

```txt
## P9.13 Split Bill Active Order Full Hydration Final Fix
```

Include:

```txt
- screenshot problem after P9.12
- proven root cause
- old vs new active order payment data flow
- full order fetch behavior
- PaymentMethodDialog prop behavior
- query invalidation behavior
- files changed
- tests/manual verification
```

## Acceptance checklist

```txt
- [ ] Paying active order fetches full order detail before opening PaymentMethodDialog.
- [ ] pendingOrderForPayment.order contains billSplits for split orders.
- [ ] PaymentMethodDialog receives existingSplitBills for partially paid split order.
- [ ] Bill A no longer resets to Rp 0 after reopen.
- [ ] Bill A shows original paid amount.
- [ ] Bill A shows Lunas/PAID.
- [ ] Bill A is disabled/read-only.
- [ ] Active bill defaults to Bill B / next unpaid bill.
- [ ] Paid quantities are not assignable again.
- [ ] Remaining unpaid quantities are visible for Bill B.
- [ ] Open-orders query is invalidated/refetched after partial split payment.
- [ ] No random migrations added.
- [ ] No provider/card/e-wallet/NorthFlow logic added.
- [ ] Report updated.
```

## Commit message

```txt
fix(pos): hydrate split bill state before active order payment
```
