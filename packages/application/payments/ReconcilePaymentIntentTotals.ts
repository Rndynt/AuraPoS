import type { Database } from '@pos/infrastructure/database';
import type { IPaymentIntentRepository } from '@pos/infrastructure/repositories/payments/PaymentIntentRepository';
import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments/PaymentTransactionRepository';
import { aggregateTransactionTotals, calculateIntentStatus } from '@pos/domain/payments';
import { txRowToDomain } from './ListPaymentTransactions';
import { intentRowToDomain } from './CreatePaymentIntent';

export interface ReconcilePaymentIntentTotalsInput {
  /**
   * Tenant whose intents will be reconciled. All reads and writes are scoped
   * to this tenant — isolation is preserved.
   */
  tenantId: string;
  /**
   * Optional explicit list of intent IDs to reconcile.
   * When omitted, all intents for the tenant are reconciled (paginated by batchSize).
   */
  intentIds?: string[];
  /**
   * Maximum number of intents to check per run (default 200).
   * Ignored when intentIds is provided.
   */
  batchSize?: number;
  /**
   * When true, no fixes are written. Only mismatches are returned.
   */
  dryRun: boolean;
}

export interface IntentMismatch {
  intentId: string;
  tenantId: string;
  payableType: string;
  payableId: string;
  stored: {
    amountPaid: number;
    amountRefunded: number;
    amountRemaining: number;
    status: string;
  };
  expected: {
    amountPaid: number;
    amountRefunded: number;
    amountRemaining: number;
    status: string;
  };
  /** true only when dryRun=false and the intent was successfully fixed */
  fixed: boolean;
  fixError?: string;
}

export interface ReconcilePaymentIntentTotalsOutput {
  dryRun: boolean;
  tenantId: string;
  totalChecked: number;
  totalMismatches: number;
  totalFixed: number;
  mismatches: IntentMismatch[];
}

/** Epsilon for floating-point comparison of monetary amounts (0.001 IDR) */
const AMOUNT_EPSILON = 0.001;

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < AMOUNT_EPSILON;
}

/**
 * ReconcilePaymentIntentTotals — Phase 5 reconciliation use case.
 *
 * Recomputes the expected amountPaid, amountRefunded, amountRemaining, and
 * status for each payment intent from its transactions, then compares against
 * the stored values.
 *
 * Dry run returns mismatches without writing.
 * Actual run locks each mismatched intent row (FOR UPDATE) and overwrites the
 * stored totals using the same recalculation logic as RecalculatePaymentIntent.
 *
 * Tenant isolation: all queries are scoped to the given tenantId.
 */
export class ReconcilePaymentIntentTotals {
  constructor(
    private readonly db: Database,
    private readonly intentRepo: IPaymentIntentRepository,
    private readonly txRepo: IPaymentTransactionRepository,
  ) {}

  async execute(
    input: ReconcilePaymentIntentTotalsInput,
  ): Promise<ReconcilePaymentIntentTotalsOutput> {
    const tenantId = input.tenantId;

    // ── 1. Fetch the intents to check ────────────────────────────────────────
    let intentRows: Awaited<ReturnType<typeof this.intentRepo.listByTenant>>;

    if (input.intentIds && input.intentIds.length > 0) {
      intentRows = await this.intentRepo.listByIds(input.intentIds, tenantId);
    } else {
      intentRows = await this.intentRepo.listByTenant(tenantId, {
        limit: input.batchSize ?? 200,
      });
    }

    if (intentRows.length === 0) {
      return {
        dryRun: input.dryRun,
        tenantId,
        totalChecked: 0,
        totalMismatches: 0,
        totalFixed: 0,
        mismatches: [],
      };
    }

    // ── 2. Bulk-fetch all transactions for these intents (single query) ───────
    const intentIds = intentRows.map((r) => r.id);
    const allTxRows = await this.txRepo.findAllByIntentIds(intentIds, tenantId);

    // Group transactions by intentId for O(1) lookup.
    const txByIntent = new Map<string, typeof allTxRows>();
    for (const tx of allTxRows) {
      const bucket = txByIntent.get(tx.paymentIntentId) ?? [];
      bucket.push(tx);
      txByIntent.set(tx.paymentIntentId, bucket);
    }

    // ── 3. Check each intent ──────────────────────────────────────────────────
    const mismatches: IntentMismatch[] = [];
    let totalFixed = 0;

    for (const intentRow of intentRows) {
      const txRows = txByIntent.get(intentRow.id) ?? [];
      const transactions = txRows.map(txRowToDomain);

      const { amountPaid, amountRefunded } = aggregateTransactionTotals(transactions);
      const amountDue =
        typeof intentRow.amountDue === 'string'
          ? parseFloat(intentRow.amountDue)
          : intentRow.amountDue;
      const amountRemaining = Math.max(0, amountDue - amountPaid + amountRefunded);
      const status = calculateIntentStatus(amountDue, amountPaid, amountRefunded, amountRemaining);

      const storedAmountPaid =
        typeof intentRow.amountPaid === 'string'
          ? parseFloat(intentRow.amountPaid)
          : Number(intentRow.amountPaid);
      const storedAmountRefunded =
        typeof intentRow.amountRefunded === 'string'
          ? parseFloat(intentRow.amountRefunded)
          : Number(intentRow.amountRefunded);
      const storedAmountRemaining =
        typeof intentRow.amountRemaining === 'string'
          ? parseFloat(intentRow.amountRemaining)
          : Number(intentRow.amountRemaining);
      const storedStatus = intentRow.status;

      const hasMismatch =
        !amountsMatch(storedAmountPaid, amountPaid) ||
        !amountsMatch(storedAmountRefunded, amountRefunded) ||
        !amountsMatch(storedAmountRemaining, amountRemaining) ||
        storedStatus !== status;

      if (!hasMismatch) continue;

      const mismatch: IntentMismatch = {
        intentId: intentRow.id,
        tenantId,
        payableType: intentRow.payableType,
        payableId: intentRow.payableId,
        stored: {
          amountPaid: storedAmountPaid,
          amountRefunded: storedAmountRefunded,
          amountRemaining: storedAmountRemaining,
          status: storedStatus,
        },
        expected: {
          amountPaid,
          amountRefunded,
          amountRemaining,
          status,
        },
        fixed: false,
      };

      // ── 4. Fix the mismatch (actual run only) ─────────────────────────────
      if (!input.dryRun) {
        try {
          await this.db.transaction(async (dbTx) => {
            // Lock the intent row before updating.
            const locked = await this.intentRepo.lockForUpdate(intentRow.id, tenantId, dbTx);
            if (!locked) {
              throw new Error('Intent not found under lock — may have been deleted');
            }

            // Re-aggregate inside the transaction for consistency.
            const freshTxRows = await this.txRepo.findAllByIntentIds([intentRow.id], tenantId, dbTx);
            const freshTxs = freshTxRows.map(txRowToDomain);
            const { amountPaid: freshPaid, amountRefunded: freshRefunded } =
              aggregateTransactionTotals(freshTxs);
            const freshRemaining = Math.max(0, amountDue - freshPaid + freshRefunded);
            const freshStatus = calculateIntentStatus(
              amountDue,
              freshPaid,
              freshRefunded,
              freshRemaining,
            );

            await this.intentRepo.update(
              intentRow.id,
              tenantId,
              {
                amountPaid: freshPaid.toFixed(2) as any,
                amountRefunded: freshRefunded.toFixed(2) as any,
                amountRemaining: freshRemaining.toFixed(2) as any,
                status: freshStatus,
              },
              dbTx,
            );
          });

          mismatch.fixed = true;
          totalFixed++;
        } catch (err: any) {
          mismatch.fixError = err?.message ?? String(err);
        }
      }

      mismatches.push(mismatch);
    }

    return {
      dryRun: input.dryRun,
      tenantId,
      totalChecked: intentRows.length,
      totalMismatches: mismatches.length,
      totalFixed,
      mismatches,
    };
  }
}
