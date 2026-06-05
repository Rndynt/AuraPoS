/**
 * PaymentTransaction — standalone transaction DTO contracts.
 *
 * Represents an individual payment attempt against a PaymentIntent.
 * Scoped by `merchantId` (not AuraPoS `tenantId`).
 *
 * Phase 8A: contract-only.
 */

/**
 * Status of a standalone payment transaction.
 *
 * - `pending`         — submitted but not yet confirmed by provider
 * - `requires_action` — waiting for customer action (QR scan, redirect, VA payment)
 * - `succeeded`       — payment confirmed by provider or manual confirmation
 * - `failed`          — payment rejected by provider or timed out
 * - `cancelled`       — cancelled before settlement (void)
 */
export type StandaloneTransactionStatus =
  | 'pending'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

/**
 * StandalonePaymentTransactionDTO — the read model for a payment transaction.
 */
export interface StandalonePaymentTransactionDTO {
  id: string;
  paymentIntentId: string;
  merchantId: string;
  method: string;
  provider: string;
  status: StandaloneTransactionStatus;
  amount: number;
  receivedAmount: number | null;
  providerReference: string | null;
  providerPaymentUrl: string | null;
  providerQrString: string | null;
  failureReason: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  succeededAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
}
