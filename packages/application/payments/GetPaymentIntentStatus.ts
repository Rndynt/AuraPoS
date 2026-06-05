import type { IPaymentIntentRepository } from '@pos/infrastructure/repositories/payments';
import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments';
import { intentRowToDomain } from './CreatePaymentIntent';
import { txRowToDomain } from './ListPaymentTransactions';

export interface GetPaymentIntentStatusInput {
  tenantId: string;
  paymentIntentId: string;
}

export interface GetPaymentIntentStatusOutput {
  intent: {
    id: string;
    status: string;
    amountDue: number;
    amountPaid: number;
    amountRefunded: number;
    amountRemaining: number;
    currency: string;
    updatedAt: Date;
  };
  latestTransaction: {
    id: string;
    status: string;
    provider: string | null;
    method: string;
    providerReference: string | null;
    providerPaymentUrl: string | null;
    providerQrString: string | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  /**
   * Provider actions are NOT currently persisted in the DB.
   * They are returned live from CreateGatewayPayment / ConfirmFakeGatewayPayment
   * at transaction creation time. This field is reserved for a future phase that
   * persists providerActions alongside the transaction row.
   * Always returns [] from this endpoint.
   */
  providerActions: unknown[];
  /** True when intent status is in a terminal state (paid/refunded/cancelled/expired). */
  isTerminal: boolean;
  /** True when the latest transaction is in requires_action state. */
  requiresAction: boolean;
  /** True when the intent still has amount remaining and is not in a terminal state. */
  canRetryPayment: boolean;
}

const TERMINAL_INTENT_STATUSES = new Set([
  'paid',
  'refunded',
  'cancelled',
  'expired',
]);

/**
 * GetPaymentIntentStatus
 *
 * Phase 6.6 — Stable frontend polling endpoint for POS UI / payment screen.
 *
 * Reads Payment Engine state only. Does NOT poll external providers.
 * Provides enough information for a frontend to determine:
 *   - Whether to show a "waiting for payment" spinner
 *   - Whether to show an error / retry prompt
 *   - Whether the payment is complete
 *   - Whether the transaction requires a customer action (QR, redirect, VA)
 */
export class GetPaymentIntentStatus {
  constructor(
    private readonly intentRepo: IPaymentIntentRepository,
    private readonly txRepo: IPaymentTransactionRepository,
  ) {}

  async execute(input: GetPaymentIntentStatusInput): Promise<GetPaymentIntentStatusOutput> {
    const { tenantId, paymentIntentId } = input;

    const intentRow = await this.intentRepo.findById(paymentIntentId, tenantId);
    if (!intentRow) {
      throw new Error('Payment intent not found or access denied');
    }
    const intent = intentRowToDomain(intentRow);

    const txRows = await this.txRepo.findByIntentId(paymentIntentId, tenantId);
    const txs = txRows.map(txRowToDomain);

    // Latest transaction = most recently created (fallback: updatedAt)
    const sorted = [...txs].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const latestTxDomain = sorted[0] ?? null;

    const isTerminal = TERMINAL_INTENT_STATUSES.has(intent.status);
    const requiresAction = latestTxDomain?.status === 'requires_action';
    const canRetryPayment = intent.amountRemaining > 0 && !isTerminal;

    return {
      intent: {
        id: intent.id,
        status: intent.status,
        amountDue: intent.amountDue,
        amountPaid: intent.amountPaid,
        amountRefunded: intent.amountRefunded,
        amountRemaining: intent.amountRemaining,
        currency: intent.currency,
        updatedAt: intent.updatedAt,
      },
      latestTransaction: latestTxDomain
        ? {
            id: latestTxDomain.id,
            status: latestTxDomain.status,
            provider: latestTxDomain.provider ?? null,
            method: latestTxDomain.method,
            providerReference: latestTxDomain.providerReference ?? null,
            providerPaymentUrl: latestTxDomain.providerPaymentUrl ?? null,
            providerQrString: latestTxDomain.providerQrString ?? null,
            failureReason: latestTxDomain.failureReason ?? null,
            createdAt: latestTxDomain.createdAt,
            updatedAt: latestTxDomain.updatedAt,
          }
        : null,
      providerActions: [],
      isTerminal,
      requiresAction,
      canRetryPayment,
    };
  }
}
