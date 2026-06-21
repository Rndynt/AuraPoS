import assert from "node:assert/strict";
import { calculateCashChange, calculatePaidAmount, calculateRemainingAmount, canCompleteMultiPayment, canCompleteSplitPayment, resolvePaymentStatus } from "../posPaymentFlowService";

assert.equal(calculatePaidAmount([{ amount: 25000 }, { amount: 10000, status: "voided" }, { amount: 75000, status: "succeeded" }]), 100000);
assert.equal(calculateRemainingAmount(120000, 50000), 70000);
assert.equal(resolvePaymentStatus(100000, 0), "unpaid");
assert.equal(resolvePaymentStatus(100000, 25000), "partial");
assert.equal(resolvePaymentStatus(100000, 100000), "paid");
assert.equal(calculateCashChange(80000, 100000), 20000);
assert.equal(canCompleteMultiPayment(100000, [{ method: "cash", amount: 60000 }, { method: "ewallet", amount: 40000 }]), true);
assert.equal(canCompleteMultiPayment(100000, [{ method: "cash", amount: 60000 }]), false);
assert.equal(canCompleteMultiPayment(100000, [{ method: "cash", amount: 50000 }, { method: "ewallet", amount: 25000 }, { method: "card", amount: 25000 }]), false);
assert.equal(canCompleteSplitPayment(100000, [{ amountDue: 50000, amountPaid: 50000 }, { amountDue: 50000, amountPaid: 50000 }]), true);
assert.equal(canCompleteSplitPayment(100000, [{ amountDue: 50000, amountPaid: 50000 }, { amountDue: 50000, amountPaid: 0 }]), false);
