import assert from "node:assert/strict";
import { calculatePaidAmount, calculateRemainingAmount, canCompleteMultiPayment, canCompleteSplitPayment, resolvePaymentStatus } from "../paymentFlow";

assert.equal(calculatePaidAmount([{ amount: 30000, status: "succeeded" }, { amount: 70000 }]), 100000);
assert.equal(calculateRemainingAmount(125000, 25000), 100000);
assert.equal(resolvePaymentStatus(125000, 25000), "partial");
assert.equal(resolvePaymentStatus(125000, 125000), "paid");
assert.equal(canCompleteMultiPayment(125000, [{ method: "cash", amount: 50000 }, { method: "ewallet", amount: 75000 }]), true);
assert.equal(canCompleteMultiPayment(125000, [{ method: "cash", amount: 50000 }]), false);
assert.equal(canCompleteSplitPayment(125000, [{ amountDue: 62500, amountPaid: 62500 }, { amountDue: 62500, amountPaid: 62500 }]), true);
assert.equal(canCompleteSplitPayment(125000, [{ amountDue: 62500, amountPaid: 62500 }, { amountDue: 62500, amountPaid: 0 }]), false);
