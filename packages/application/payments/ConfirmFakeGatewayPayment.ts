import type { Database } from '@pos/infrastructure/database';
import type { DomainPaymentIntent, DomainPaymentTransaction } from '@pos/domain/payments';
import { PaymentPolicyError } from '@pos/domain/payments';
import type { ApplyGatewayTransactionStatus } from './ApplyGatewayTransactionStatus';

export interface ConfirmFakeGatewayPaymentInput {
  tenantId: string;
  providerReference: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmFakeGatewayPaymentOutput {
  intent: DomainPaymentIntent;
  transaction: DomainPaymentTransaction;
}

/**
 * ConfirmFakeGatewayPayment — dev/test-only controlled confirmation use case.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  This use case is NOT a real webhook handler.                           │
 * │  It exists solely to simulate gateway callbacks in development / tests. │
 * │  The corresponding HTTP endpoint must be disabled (or guarded) in       │
 * │  production — see the route file for the NODE_ENV guard.               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Phase 3 refactor
 * ----------------
 * The transaction-mutation logic has been extracted into the shared
 * `ApplyGatewayTransactionStatus` helper, which is also used by
 * `HandlePaymentProviderWebhook`.  ConfirmFakeGatewayPayment is now a thin
 * wrapper that:
 *  1. Opens a DB transaction.
 *  2. Delegates to `ApplyGatewayTransactionStatus.execute()`.
 *  3. Converts `not_found` / `already_terminal` results into thrown
 *     `PaymentPolicyError` (consistent with the pre-Phase-3 behavior).
 *
 * Concurrency safety is preserved by `ApplyGatewayTransactionStatus`, which
 * uses `SELECT ... FOR UPDATE` on the transaction row before any mutation.
 */
export class ConfirmFakeGatewayPayment {
  constructor(
    private readonly db: Database,
    private readonly applyGatewayTransactionStatus: ApplyGatewayTransactionStatus,
  ) {}

  async execute(
    input: ConfirmFakeGatewayPaymentInput,
  ): Promise<ConfirmFakeGatewayPaymentOutput> {
    return await this.db.transaction(async (tx) => {
      const result = await this.applyGatewayTransactionStatus.execute(
        {
          tenantId: input.tenantId,
          provider: 'fake_gateway',
          providerReference: input.providerReference,
          status: input.status,
          failureReason: input.failureReason ?? null,
          allocationMetadata: input.metadata ?? null,
        },
        tx,
      );

      if (result.outcome === 'not_found') {
        throw new PaymentPolicyError(
          `No fake_gateway transaction found for provider reference: "${input.providerReference}"`,
          'TRANSACTION_NOT_FOUND',
        );
      }

      if (result.outcome === 'already_terminal') {
        throw new PaymentPolicyError(
          `Cannot confirm transaction in state "${result.currentStatus}". ` +
            `Only pending/requires_action transactions may be confirmed.`,
          'INVALID_TRANSITION',
        );
      }

      // succeeded or failed
      return { intent: result.intent, transaction: result.transaction };
    });
  }
}
