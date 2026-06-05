import type { IPaymentIntentRepository } from '@pos/infrastructure/repositories/payments';
import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments';
import { intentRowToDomain } from './CreatePaymentIntent';
import { txRowToDomain } from './ListPaymentTransactions';

export interface GetPaymentIntentRefundabilityInput {
  tenantId: string;
  paymentIntentId: string;
}

export interface RefundabilityTransactionRow {
  transactionId: string;
  provider: string | null;
  method: string;
  transactionType: string;
  direction: string;
  status: string;
  amount: number;
  refundedAmount: number;
  refundableRemaining: number;
  canRefund: boolean;
  reason?: string;
  providerReference: string | null;
  createdAt: Date;
}

export interface GetPaymentIntentRefundabilityOutput {
  intent: {
    id: string;
    status: string;
    amountDue: number;
    amountPaid: number;
    amountRefunded: number;
    amountRemaining: number;
    currency: string;
  };
  totalRefundable: number;
  transactions: RefundabilityTransactionRow[];
}

const REFUNDABLE_TYPES = new Set(['payment', 'deposit', 'settlement']);

function toNumber(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v as string);
}

/**
 * GetPaymentIntentRefundability
 *
 * Phase 6.6 — Read-only pre-check for POS UI before cashier initiates a refund.
 *
 * Returns how much of each succeeded incoming transaction is still refundable so
 * the UI can show the maximum refund amount per transaction.
 *
 * Rules:
 * - Tenant-scoped and read-only — no DB mutation, no provider API calls.
 * - Loads all intent transactions in a single query to avoid N+1.
 * - Computes already-refunded amounts in memory from the same result set.
 * - A transaction is refundable only when:
 *     direction = 'incoming', status = 'succeeded',
 *     transactionType in { payment, deposit, settlement },
 *     AND refundableRemaining > 0.
 */
export class GetPaymentIntentRefundability {
  constructor(
    private readonly intentRepo: IPaymentIntentRepository,
    private readonly txRepo: IPaymentTransactionRepository,
  ) {}

  async execute(
    input: GetPaymentIntentRefundabilityInput,
  ): Promise<GetPaymentIntentRefundabilityOutput> {
    const { tenantId, paymentIntentId } = input;

    const intentRow = await this.intentRepo.findById(paymentIntentId, tenantId);
    if (!intentRow) {
      throw new Error('Payment intent not found or access denied');
    }
    const intent = intentRowToDomain(intentRow);

    // Single query — no N+1
    const txRows = await this.txRepo.findByIntentId(paymentIntentId, tenantId);
    const txs = txRows.map(txRowToDomain);

    // Build parentId → total succeeded refund amount map in memory
    const refundedByParent = new Map<string, number>();
    for (const tx of txs) {
      if (
        tx.direction === 'outgoing' &&
        tx.transactionType === 'refund' &&
        tx.status === 'succeeded' &&
        tx.parentTransactionId
      ) {
        const prev = refundedByParent.get(tx.parentTransactionId) ?? 0;
        refundedByParent.set(tx.parentTransactionId, prev + tx.amount);
      }
    }

    const transactions: RefundabilityTransactionRow[] = txs.map((tx) => {
      const isEligible =
        tx.direction === 'incoming' &&
        tx.status === 'succeeded' &&
        REFUNDABLE_TYPES.has(tx.transactionType);

      const refundedAmount = refundedByParent.get(tx.id) ?? 0;
      const refundableRemaining = isEligible ? Math.max(0, tx.amount - refundedAmount) : 0;
      const canRefund = isEligible && refundableRemaining > 0;

      let reason: string | undefined;
      if (!isEligible) {
        if (tx.direction !== 'incoming') reason = `Not refundable: direction is ${tx.direction}`;
        else if (tx.status !== 'succeeded') reason = `Not refundable: status is ${tx.status}`;
        else reason = `Not refundable: type is ${tx.transactionType}`;
      } else if (!canRefund) {
        reason = 'Fully refunded';
      }

      return {
        transactionId: tx.id,
        provider: tx.provider ?? null,
        method: tx.method,
        transactionType: tx.transactionType,
        direction: tx.direction,
        status: tx.status,
        amount: tx.amount,
        refundedAmount,
        refundableRemaining,
        canRefund,
        reason,
        providerReference: tx.providerReference ?? null,
        createdAt: tx.createdAt,
      };
    });

    const totalRefundable = transactions.reduce((sum, t) => sum + t.refundableRemaining, 0);

    return {
      intent: {
        id: intent.id,
        status: intent.status,
        amountDue: intent.amountDue,
        amountPaid: intent.amountPaid,
        amountRefunded: intent.amountRefunded,
        amountRemaining: intent.amountRemaining,
        currency: intent.currency,
      },
      totalRefundable,
      transactions,
    };
  }
}
