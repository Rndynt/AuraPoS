/**
 * types — request/response shapes for payment-engine-client-sdk.
 *
 * Self-contained; does NOT import from @pos/payment-engine-core to keep
 * the SDK portable and independently versioned.
 *
 * These types mirror the service API contracts and should stay in sync
 * with packages/payment-engine-core/src/application/contracts.ts.
 */

// ── Client Configuration ──────────────────────────────────────────────────────

export interface PaymentEngineClientConfig {
  baseUrl: string;
  serviceToken?: string;
  merchantId?: string;
  sourceApp?: string;
}

// ── Create Payment Intent ─────────────────────────────────────────────────────

export interface CreatePaymentIntentRequest {
  merchantId?: string;
  externalPayableType: string;
  externalPayableId: string;
  currency: string;
  amountDue: number;
  allowPartial?: boolean;
  expiresAt?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}

export interface PaymentIntentResponse {
  id: string;
  merchantId: string;
  externalPayableType: string;
  externalPayableId: string;
  currency: string;
  amountDue: number;
  amountPaid: number;
  amountRefunded: number;
  amountRemaining: number;
  status: string;
  allowPartial: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Create Gateway Payment ────────────────────────────────────────────────────

export interface CreateGatewayPaymentRequest {
  provider: string;
  method: string;
  amount: number;
  idempotencyKey?: string | null;
  providerAccountId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProviderActionResponse {
  type: string;
  descriptor: string;
  label: string;
  value: string | null;
  url: string | null;
}

export interface GatewayPaymentResponse {
  transactionId: string;
  status: string;
  providerReference: string | null;
  providerPaymentUrl: string | null;
  providerQrString: string | null;
  providerActions: ProviderActionResponse[];
  immediateSuccess: boolean;
  idempotentReplay: boolean;
}

// ── Payment Intent Status ─────────────────────────────────────────────────────

export interface PaymentIntentStatusResponse {
  intentId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  isTerminal: boolean;
  requiresAction: boolean;
  canRetryPayment: boolean;
}

// ── Refundability ─────────────────────────────────────────────────────────────

export interface RefundabilityResponse {
  canRefund: boolean;
  refundableAmount: number;
  reason: string | null;
}
