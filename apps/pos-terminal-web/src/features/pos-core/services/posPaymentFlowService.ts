export type POSPaymentMethod = "cash" | "card" | "ewallet" | "other";
export type POSPaymentFlowMode = "full" | "dp" | "multi" | "split";
export type POSPaymentFlow = "full" | "dp" | "multi" | "split";
export type POSPaymentKind = "full_payment" | "down_payment" | "remaining_payment" | "multi_line" | "split_line";

export type POSPaymentLine = {
  method: POSPaymentMethod;
  amount: number;
  receivedAmount?: number;
  splitId?: string;
  referenceNote?: string;
};

export function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calculatePaidAmount(payments: Array<{ amount: number; status?: string }>): number {
  return roundCurrency(payments.filter((payment) => (payment.status ?? "succeeded") === "succeeded").reduce((sum, payment) => sum + payment.amount, 0));
}

export function calculateRemainingAmount(totalAmount: number, paidAmount: number): number {
  return Math.max(0, roundCurrency(totalAmount - paidAmount));
}

export function resolvePaymentStatus(totalAmount: number, paidAmount: number): "unpaid" | "partial" | "paid" {
  if (paidAmount <= 0) return "unpaid";
  return paidAmount + 0.001 >= totalAmount ? "paid" : "partial";
}

export function calculateCashChange(amountDue: number, receivedAmount?: number): number {
  if (receivedAmount == null) return 0;
  return Math.max(0, roundCurrency(receivedAmount - amountDue));
}

export function canCompleteFullPayment(input: { totalAmount: number; amount: number; method: POSPaymentMethod; receivedAmount?: number }): boolean {
  if (input.amount <= 0) return false;
  if (input.method === "cash") return (input.receivedAmount ?? input.amount) + 0.001 >= input.amount && input.amount + 0.001 >= input.totalAmount;
  return Math.abs(input.amount - input.totalAmount) <= 0.001;
}

export function canCompleteMultiPayment(totalAmount: number, lines: POSPaymentLine[]): boolean {
  if (lines.length < 1 || lines.length > 2) return false;
  if (lines.some((line) => line.amount <= 0)) return false;
  const paid = roundCurrency(lines.reduce((sum, line) => sum + line.amount, 0));
  return Math.abs(paid - totalAmount) <= 0.001;
}

export function canCompleteSplitPayment(totalAmount: number, splits: Array<{ amountDue: number; amountPaid: number }>): boolean {
  if (splits.length < 1 || splits.length > 4) return false;
  const due = roundCurrency(splits.reduce((sum, split) => sum + split.amountDue, 0));
  const paid = roundCurrency(splits.reduce((sum, split) => sum + split.amountPaid, 0));
  return Math.abs(due - totalAmount) <= 0.001 && paid + 0.001 >= totalAmount;
}
