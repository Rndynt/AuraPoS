import assert from "node:assert/strict";
import { preparePOSActiveOrderPayment } from "../usePOSActiveOrderPayment";

const openOrderListRow: any = {
  id: "order-split-1",
  orderNumber: "ORD-SPLIT-1",
  status: "served",
  paymentStatus: "partial",
  total: 150000,
  paidAmount: 58650,
  remainingAmount: 91350,
  items: [{ id: "item-1", quantity: 2, unitPrice: 75000 }],
};

const fullOrderWithPersistedSplits: any = {
  ...openOrderListRow,
  items: [{ id: "item-1", quantity: 2, unitPrice: 75000 }],
  payments: [{ id: "payment-a", amount: 58650, status: "paid" }],
  billSplits: [
    {
      id: "split-db-a",
      clientBillId: "A",
      label: "Bill A",
      splitNo: 1,
      amountDue: 58650,
      amountPaid: 58650,
      status: "PAID",
      items: [{ orderItemId: "item-1", clientBillId: "A", quantity: 1, amount: 58650 }],
    },
    {
      id: "split-db-b",
      clientBillId: "B",
      label: "Bill B",
      splitNo: 2,
      amountDue: 91350,
      amountPaid: 0,
      status: "UNPAID",
      items: [{ orderItemId: "item-1", clientBillId: "B", quantity: 1, amount: 91350 }],
    },
  ],
};

const calls: string[] = [];
const result = await preparePOSActiveOrderPayment(openOrderListRow, async (orderId) => {
  calls.push(orderId);
  return fullOrderWithPersistedSplits;
});

assert.equal(calls.length, 1, "active order payment must fetch full order detail exactly once");
assert.equal(calls[0], "order-split-1");
assert.equal(result.ok, true);
if (result.ok) {
  assert.equal(result.pendingPayment.totalAmount, 91350, "remaining amount must be resolved from hydrated full order");
  assert.equal(result.pendingPayment.order, fullOrderWithPersistedSplits, "pending payment must store the hydrated full order");
  const pendingOrder = result.pendingPayment.order as typeof fullOrderWithPersistedSplits;
  assert.equal(pendingOrder.billSplits?.[0]?.status, "PAID", "Bill A paid status must be preserved for PaymentMethodDialog");
  assert.equal(pendingOrder.billSplits?.[0]?.amountDue, 58650, "Bill A original amount must not reset to zero");
  assert.equal(pendingOrder.billSplits?.[0]?.items?.[0]?.quantity, 1, "Bill A paid quantity assignment must be preserved");
  assert.equal(pendingOrder.billSplits?.[1]?.clientBillId, "B", "next unpaid Bill B must be available to become active");
}
