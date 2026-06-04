import type { Database } from '@pos/infrastructure/database';
import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments/PaymentTransactionRepository';

/**
 * Providers considered "internal" — safe to expire without calling a real gateway API.
 * Real external providers (midtrans, xendit, stripe, etc.) are excluded.
 */
const INTERNAL_PROVIDERS = new Set(['manual', 'cash', 'fake_gateway', 'internal']);

export interface ExpireStalePaymentTransactionsInput {
  /**
   * Transactions created more than this many minutes ago are eligible for expiry.
   */
  cutoffMinutes: number;
  /**
   * Optional tenant filter.
   */
  tenantId?: string;
  /**
   * Optional provider filter. When set, only transactions from that provider are
   * eligible. Note: even if a real gateway provider name is given, the safety
   * guard still prevents expiry — INTERNAL_PROVIDERS is the authoritative list.
   */
  provider?: string;
  /**
   * Maximum number of transactions to expire per run (default 50).
   */
  batchSize?: number;
  /**
   * When true, no mutations are made.
   */
  dryRun: boolean;
}

export interface ExpiredTransactionResult {
  transactionId: string;
  intentId: string;
  tenantId: string;
  provider: string;
  method: string;
  status: string;
  amount: number;
  createdAt: Date;
  ageMinutes: number;
  voided: boolean;
  skippedReason?: string;
}

export interface ExpireStalePaymentTransactionsOutput {
  dryRun: boolean;
  cutoffMinutes: number;
  totalFound: number;
  voided: number;
  skipped: number;
  transactions: ExpiredTransactionResult[];
}

/**
 * ExpireStalePaymentTransactions — Phase 5 reconciliation use case.
 *
 * Finds payment transactions with status 'pending' or 'requires_action' that
 * are older than cutoffMinutes and marks them as 'voided'.
 *
 * Safety rules:
 * - Only internal/fake providers are expired (manual, cash, fake_gateway).
 *   Real external gateway transactions are skipped — they must be cancelled
 *   through the real provider's API (not implemented yet).
 * - Each row is locked with FOR UPDATE before the status update.
 * - No real provider API calls are made.
 * - Supports dry run: when dryRun=true nothing is mutated.
 * - One failed row does not abort the rest of the batch.
 */
export class ExpireStalePaymentTransactions {
  constructor(
    private readonly db: Database,
    private readonly txRepo: IPaymentTransactionRepository,
  ) {}

  async execute(
    input: ExpireStalePaymentTransactionsInput,
  ): Promise<ExpireStalePaymentTransactionsOutput> {
    const cutoffDate = new Date(Date.now() - input.cutoffMinutes * 60 * 1000);
    const limit = input.batchSize ?? 50;
    const now = new Date();

    const staleRows = await this.txRepo.listStalePendingTransactions(cutoffDate, {
      tenantId: input.tenantId,
      provider: input.provider,
      limit,
    });

    const results: ExpiredTransactionResult[] = [];
    let voidedCount = 0;
    let skippedCount = 0;

    for (const row of staleRows) {
      const ageMs = now.getTime() - new Date(row.createdAt).getTime();
      const ageMinutes = Math.floor(ageMs / 60_000);
      const amount = typeof row.amount === 'string' ? parseFloat(row.amount) : Number(row.amount);

      const base: ExpiredTransactionResult = {
        transactionId: row.id,
        intentId: row.paymentIntentId,
        tenantId: row.tenantId,
        provider: row.provider,
        method: row.method,
        status: row.status,
        amount,
        createdAt: new Date(row.createdAt),
        ageMinutes,
        voided: false,
      };

      // Only internal/fake providers may be expired without a real API call.
      if (!INTERNAL_PROVIDERS.has(row.provider)) {
        results.push({
          ...base,
          skippedReason: `Provider "${row.provider}" requires a real gateway cancellation (not implemented)`,
        });
        skippedCount++;
        continue;
      }

      // Dry run: describe without mutating.
      if (input.dryRun) {
        results.push(base);
        continue;
      }

      try {
        let wasVoided = false;

        await this.db.transaction(async (dbTx) => {
          // Lock the row before updating to prevent concurrent double-expiry.
          const locked = await this.txRepo.lockByIdForUpdate(row.id, row.tenantId, dbTx);

          // Re-check status under the lock — another process may have settled it.
          if (!locked || (locked.status !== 'pending' && locked.status !== 'requires_action')) {
            return; // Already settled or gone — skip silently.
          }

          await this.txRepo.update(
            row.id,
            row.tenantId,
            {
              status: 'voided',
              cancelledAt: new Date(),
              failureReason: 'Expired by reconciliation job (stale pending transaction)',
            },
            dbTx,
          );

          wasVoided = true;
        });

        if (wasVoided) {
          results.push({ ...base, voided: true });
          voidedCount++;
        }
        // else: already settled under lock — don't push to results, silently skip
      } catch (err: any) {
        // One failure must not abort the batch.
        results.push({
          ...base,
          skippedReason: `Expiry failed: ${err?.message ?? String(err)}`,
        });
        skippedCount++;
      }
    }

    return {
      dryRun: input.dryRun,
      cutoffMinutes: input.cutoffMinutes,
      totalFound: staleRows.length,
      voided: voidedCount,
      skipped: skippedCount,
      transactions: results,
    };
  }
}
