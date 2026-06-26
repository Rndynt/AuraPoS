import type { POSPaymentFlow, POSPaymentKind, POSPaymentMethod, POSPaymentSession } from "@pos/domain/payments";
import { roundCurrency, isPOSPaymentFlow, isPOSPaymentMethod, isSelectedBillPayable } from "@pos/domain/payments";

export type POSPaymentSubmissionMode = "FRESH_CART" | "SAVED_ORDER" | "ACTIVE_ORDER";

export type POSPaymentLineInput = {
  method: POSPaymentMethod;
  amount: number;
  receivedAmount?: number;
  clientBillId?: string;
  splitId?: string;
  orderBillSplitId?: string;
  referenceNote?: string;
};

export type POSPaymentSubmissionInput = {
  mode: POSPaymentSubmissionMode;
  clientPaymentSessionId: string;
  orderId?: string;
  orderNumber?: string;
  totalAmount: number;
  cartPayload?: Record<string, unknown>;
  paymentMethod: POSPaymentMethod;
  cashReceived?: number;
  partialAmount?: number;
  paymentSession?: POSPaymentSession;
  paymentDetails?: {
    flow: POSPaymentFlow;
    paymentKind?: POSPaymentKind;
    targetBillId?: string;
    lines?: POSPaymentLineInput[];
    splits?: Array<{
      id?: string;
      clientBillId?: string;
      label?: string;
      splitNo?: number;
      amountDue: number;
      amountPaid?: number;
      orderBillSplitId?: string;
      status?: "UNPAID" | "PARTIAL" | "PAID";
      items?: Array<{ orderItemId?: string; clientItemId?: string; quantity: number; amount: number }>;
    }>;
  };
};

export type POSPaymentSubmissionDependencies = {
  submitPayment: (payload: SubmitPOSPaymentRequest) => Promise<SubmitPOSPaymentApiResult>;
};

export type POSPaymentSubmissionResult = {
  orderId: string;
  orderNumber: string;
  paymentFlow: POSPaymentFlow;
  paidAmount: number;
  remainingAmount: number;
  status: "PAID" | "PARTIAL" | "SAVED_NEEDS_PAYMENT";
  shouldClearCart: boolean;
  shouldPrintReceipt: boolean;
  messageTitle: string;
  messageDescription: string;
};

export type SubmitPOSPaymentRequest = {
  source: POSPaymentSubmissionMode;
  clientPaymentSessionId: string;
  orderId?: string;
  orderNumber?: string;
  order?: Record<string, unknown>;
  payment: {
    flow: POSPaymentFlow;
    paymentKind?: POSPaymentKind;
    targetBillId?: string;
    lines: Array<{
      method: POSPaymentMethod;
      amount: number;
      receivedAmount?: number;
      referenceNote?: string;
      clientBillId?: string;
      orderBillSplitId?: string;
    }>;
    splits?: Array<{
      clientBillId: string;
      label: string;
      splitNo: number;
      amountDue: number;
      amountPaid?: number;
      status?: "UNPAID" | "PARTIAL" | "PAID";
      items?: Array<{ orderItemId?: string; clientItemId?: string; quantity: number; amount: number }>;
    }>;
  };
};

export type SubmitPOSPaymentApiResult = POSPaymentSubmissionResult & {
  order?: unknown;
  payments?: unknown[];
  splits?: unknown[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function normalizeBillId(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  if (/^[A-Z]$/i.test(raw)) return raw.toUpperCase();
  return raw;
}

function splitNoFromBillId(clientBillId: string | undefined, fallback: number): number {
  if (clientBillId && /^[A-Z]$/i.test(clientBillId)) return clientBillId.toUpperCase().charCodeAt(0) - 64;
  return fallback;
}

export function toUserSafePaymentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const technicalValidationPattern = new RegExp(["invalid_enum_value", "Invalid enum", "Expected.*FULL.*DOWN_PAYMENT", "\\[\\{.*code.*path"].join("|"), "i");
  if (technicalValidationPattern.test(message)) return "Pembayaran gagal dicatat. Silakan coba lagi.";
  return message || "Pembayaran gagal dicatat. Silakan coba lagi.";
}

function defaultKind(flow: POSPaymentFlow): POSPaymentKind {
  if (flow === "DOWN_PAYMENT") return "DOWN_PAYMENT";
  if (flow === "MULTI_PAYMENT") return "MULTI_PAYMENT_LINE";
  if (flow === "SPLIT_BILL") return "SPLIT_BILL_LINE";
  return "FULL_PAYMENT";
}

function buildDefaultLine(input: POSPaymentSubmissionInput): POSPaymentLineInput {
  const amount = roundCurrency(input.partialAmount ?? input.totalAmount);
  return { method: input.paymentMethod, amount, receivedAmount: input.cashReceived, splitId: input.paymentDetails?.targetBillId };
}

export function buildCanonicalPaymentCommand(input: POSPaymentSubmissionInput): { flow: POSPaymentFlow; paymentKind: POSPaymentKind; targetBillId?: string; lines: POSPaymentLineInput[]; lineTotal: number } {
  const flow = input.paymentDetails?.flow ?? (input.partialAmount != null && input.partialAmount > 0 ? "DOWN_PAYMENT" : "FULL");
  if (!isPOSPaymentFlow(flow)) throw new Error("Tipe pembayaran tidak valid.");
  const sourceLines = flow === "MULTI_PAYMENT" || flow === "SPLIT_BILL" ? (input.paymentDetails?.lines ?? []) : [buildDefaultLine(input)];
  const max = flow === "MULTI_PAYMENT" ? 2 : flow === "SPLIT_BILL" ? 4 : 1;
  if (sourceLines.length > max) throw new Error(flow === "MULTI_PAYMENT" ? "Multi payment maksimal 2 baris." : "Split bill maksimal 4 bill.");
  const lines = sourceLines.map((line) => ({ ...line, amount: roundCurrency(Number(line.amount || 0)), clientBillId: normalizeBillId(line.clientBillId ?? line.splitId), splitId: normalizeBillId(line.splitId) })).filter((line) => line.amount > 0);
  if (lines.some((line) => !isPOSPaymentMethod(line.method))) throw new Error("Metode pembayaran tidak valid.");
  const lineTotal = roundCurrency(lines.reduce((sum, line) => sum + line.amount, 0));
  if (flow === "MULTI_PAYMENT" && Math.abs(lineTotal - input.totalAmount) > 0.001) throw new Error("Total multi payment harus sama dengan total tagihan.");
  if (flow === "SPLIT_BILL") {
    const targetBillId = normalizeBillId(input.paymentDetails?.targetBillId ?? lines[0]?.clientBillId ?? lines[0]?.splitId);
    const bill = input.paymentSession?.bills.find((b) => b.clientBillId === targetBillId || b.orderBillSplitId === targetBillId);
    if (bill && !isSelectedBillPayable({ billAmountDue: bill.amountDue, billAmountPaid: bill.amountPaid, lineTotal })) throw new Error("Bill yang dipilih sudah lunas atau jumlah pembayaran tidak sesuai.");
    return { flow, paymentKind: input.paymentDetails?.paymentKind ?? defaultKind(flow), targetBillId, lines, lineTotal };
  }
  return { flow, paymentKind: input.paymentDetails?.paymentKind ?? defaultKind(flow), targetBillId: input.paymentDetails?.targetBillId, lines, lineTotal };
}

function buildBackendOrderPayload(cartPayload?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!cartPayload) return undefined;
  return {
    items: cartPayload.items,
    order_type_id: cartPayload.order_type_id,
    customer_name: cartPayload.customer_name,
    table_number: cartPayload.table_number,
    notes: cartPayload.notes,
    tax_rate: cartPayload.tax_rate,
    service_charge_rate: cartPayload.service_charge_rate,
    fulfillment_mode: cartPayload.fulfillment_mode,
  };
}

function sanitizeSplitItems(items?: Array<{ orderItemId?: string; clientItemId?: string; quantity: number; amount: number }>) {
  return items?.map((item) => {
    const rawOrderItemId = item.orderItemId;
    return {
      orderItemId: isUuid(rawOrderItemId) ? rawOrderItemId : undefined,
      clientItemId: item.clientItemId ?? rawOrderItemId,
      quantity: item.quantity,
      amount: roundCurrency(Number(item.amount || 0)),
    };
  });
}

function buildSplitPayload(input: POSPaymentSubmissionInput, canonical: { flow: POSPaymentFlow; targetBillId?: string; lineTotal: number }): SubmitPOSPaymentRequest["payment"]["splits"] | undefined {
  if (canonical.flow !== "SPLIT_BILL") return undefined;
  const targetBillId = normalizeBillId(canonical.targetBillId ?? input.paymentDetails?.targetBillId ?? input.paymentDetails?.lines?.[0]?.clientBillId ?? input.paymentDetails?.lines?.[0]?.splitId) ?? "A";
  const sourceSplits = input.paymentDetails?.splits ?? [];
  const mapped = sourceSplits
    .map((split, index) => {
      const clientBillId = normalizeBillId(split.clientBillId ?? split.id) ?? (index === 0 ? targetBillId : `bill-${index + 1}`);
      return {
        clientBillId,
        label: split.label ?? `Bill ${clientBillId}`,
        splitNo: split.splitNo ?? splitNoFromBillId(clientBillId, index + 1),
        amountDue: roundCurrency(split.amountDue),
        amountPaid: roundCurrency(split.amountPaid ?? 0),
        status: split.status ?? ((split.amountPaid ?? 0) >= split.amountDue - 0.001 ? "PAID" : (split.amountPaid ?? 0) > 0 ? "PARTIAL" : "UNPAID"),
        items: sanitizeSplitItems(split.items),
      };
    })
    .filter((split) => split.amountDue > 0 || split.clientBillId === targetBillId);

  const hasTarget = mapped.some((split) => split.clientBillId === targetBillId);
  if (!hasTarget && canonical.lineTotal > 0) {
    mapped.unshift({
      clientBillId: targetBillId,
      label: `Bill ${targetBillId}`,
      splitNo: splitNoFromBillId(targetBillId, 1),
      amountDue: roundCurrency(canonical.lineTotal),
      amountPaid: 0,
      status: "UNPAID",
      items: sanitizeSplitItems(sourceSplits[0]?.items),
    });
  }
  return mapped.length ? mapped : undefined;
}

export function buildSubmitPOSPaymentRequest(input: POSPaymentSubmissionInput): SubmitPOSPaymentRequest {
  const canonical = buildCanonicalPaymentCommand(input);
  const { flow, paymentKind, lines } = canonical;
  const targetBillId = normalizeBillId(canonical.targetBillId ?? lines[0]?.clientBillId ?? lines[0]?.splitId);
  return {
    source: input.mode,
    clientPaymentSessionId: input.clientPaymentSessionId,
    orderId: input.paymentSession?.orderId ?? input.orderId,
    orderNumber: input.paymentSession?.orderNumber ?? input.orderNumber,
    order: input.mode === "FRESH_CART" ? buildBackendOrderPayload(input.cartPayload) : undefined,
    payment: {
      flow,
      paymentKind,
      targetBillId,
      lines: lines.map((line) => ({
        method: line.method,
        amount: line.amount,
        receivedAmount: line.receivedAmount,
        referenceNote: line.referenceNote,
        clientBillId: normalizeBillId(line.clientBillId ?? line.splitId ?? targetBillId),
        orderBillSplitId: isUuid(line.orderBillSplitId) ? line.orderBillSplitId : undefined,
      })),
      splits: buildSplitPayload(input, { flow, targetBillId, lineTotal: canonical.lineTotal }),
    },
  };
}

export async function submitPOSPayment(input: POSPaymentSubmissionInput, deps: POSPaymentSubmissionDependencies): Promise<POSPaymentSubmissionResult> {
  const result = await deps.submitPayment(buildSubmitPOSPaymentRequest(input));
  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    paymentFlow: result.paymentFlow,
    paidAmount: result.paidAmount,
    remainingAmount: result.remainingAmount,
    status: result.status,
    shouldClearCart: result.shouldClearCart === true,
    shouldPrintReceipt: result.shouldPrintReceipt === true,
    messageTitle: result.messageTitle,
    messageDescription: result.messageDescription,
  };
}
