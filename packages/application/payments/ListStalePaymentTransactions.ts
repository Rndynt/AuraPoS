import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments/PaymentTransactionRepository';

export interface ListStalePaymentTransactionsInput {
  /**
   * Transactions created more than this many minutes ago are considered stale.
   * Must be positive.
   */
  cutoffMinutes: number;
  /**
   * Optional tenant filter. When omitted, lists stale transactions across all tenants.
   * Reconciliation jobs running per-tenant should always pass this.
   */
  tenantId?: string;
  /**
   * Optional provider filter (e.g. 'fake_gateway', 'manual').
   */
  provider?: string;
  /**
   * Maximum number of rows to return (default 100).
   */
  limit?: number;
}

export interface StaleTransactionRow {
  transactionId: string;
  intentId: string;
  tenantId: string;
  provider: string;
  providerReference: string | null;
  method: string;
  status: string;
  amount: number;
  createdAt: Date;
  ageMinutes: number;
}

export interface ListStalePaymentTransactionsOutput {
  cutoffMinutes: number;
  total: number;
  transactions: StaleTransactionRow[];
}

/**
 * ListStalePaymentTransactions — Phase 5 reconciliation use case.
 *
 * Lists payment_transactions with status 'pending' or 'requires_action' that
 * are older than the given cutoff. Terminal statuses (succeeded, failed,
 * cancelled, voided, refunded) are excluded.
 *
 * The output includes enough data for admin debugging:
 *   transaction id, intent id, provider, providerReference, amount,
 *   createdAt, ageMinutes.
 *
 * This use case is read-only and never mutates any row.
 */
export class ListStalePaymentTransactions {
  constructor(private readonly txRepo: IPaymentTransactionRepository) {}

  async execute(
    input: ListStalePaymentTransactionsInput,
  ): Promise<ListStalePaymentTransactionsOutput> {
    const cutoffDate = new Date(Date.now() - input.cutoffMinutes * 60 * 1000);
    const now = new Date();

    const rows = await this.txRepo.listStalePendingTransactions(cutoffDate, {
      tenantId: input.tenantId,
      provider: input.provider,
      limit: input.limit ?? 100,
    });

    const transactions: StaleTransactionRow[] = rows.map((row) => {
      const ageMs = now.getTime() - new Date(row.createdAt).getTime();
      return {
        transactionId: row.id,
        intentId: row.paymentIntentId,
        tenantId: row.tenantId,
        provider: row.provider,
        providerReference: row.providerReference ?? null,
        method: row.method,
        status: row.status,
        amount: typeof row.amount === 'string' ? parseFloat(row.amount) : Number(row.amount),
        createdAt: new Date(row.createdAt),
        ageMinutes: Math.floor(ageMs / 60_000),
      };
    });

    return {
      cutoffMinutes: input.cutoffMinutes,
      total: transactions.length,
      transactions,
    };
  }
}
