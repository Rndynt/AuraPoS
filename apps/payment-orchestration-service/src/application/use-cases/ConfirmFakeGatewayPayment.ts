/**
 * ConfirmFakeGatewayPayment — manually confirm a FakeGateway transaction in dev/test mode.
 *
 * Phase 8D: non-production only. Simulates provider webhook confirmation.
 * Phase 8D Hardening (Task 6):
 *   - Conditional status update: only transitions from requires_action or pending → succeeded.
 *   - Fresh reload of transaction before checking status (reduces TOCTOU window).
 *   - Reload intent BEFORE updating totals to detect concurrent changes and re-check overpayment.
 *   - Overpayment guard at confirmation time: if tx.amount > current intent.amountRemaining, reject.
 *   - alreadyConfirmed returns current state without re-applying totals.
 *
 * Concurrency note: the read-before-write pattern has a known TOCTOU race under high concurrency.
 * A truly atomic conditional UPDATE (WHERE status IN ('requires_action', 'pending')) would require
 * a repository extension; this is deferred to Phase 8E as an enhancement when real provider webhooks
 * are wired and concurrent confirmation becomes a practical concern.
 *
 * Rules:
 * - Only available in NODE_ENV !== 'production'.
 * - Only transactions with status requires_action or pending may be confirmed.
 * - Updates transaction to succeeded.
 * - Updates intent totals and status.
 * - Confirming already-succeeded is idempotent (does NOT double-add amountPaid).
 */

import type {
  PaymentTransactionRepository,
  PaymentIntentRepository,
} from '@northflow/payment-orchestration-core';
import type {
  StandalonePaymentIntentDTO,
  StandalonePaymentTransactionDTO,
} from '@northflow/payment-orchestration-core';
import { computeIntentStatus } from './intentStatusHelper.ts';

export interface ConfirmFakeGatewayPaymentInput {
  merchantId: string;
  transactionId: string;
}

export interface ConfirmFakeGatewayPaymentOutput {
  transaction: StandalonePaymentTransactionDTO;
  intent: StandalonePaymentIntentDTO;
  alreadyConfirmed: boolean;
}

export class ConfirmFakeGatewayPayment {
  constructor(
    private readonly transactionRepo: PaymentTransactionRepository,
    private readonly intentRepo: PaymentIntentRepository,
    private readonly nodeEnv: string,
  ) {}

  async execute(
    input: ConfirmFakeGatewayPaymentInput,
  ): Promise<ConfirmFakeGatewayPaymentOutput> {
    if (this.nodeEnv === 'production') {
      throw Object.assign(
        new Error('FakeGateway confirm is not available in production'),
        { statusCode: 403, code: 'FORBIDDEN_IN_PRODUCTION' },
      );
    }

    // Fresh read of transaction to minimise TOCTOU window.
    const tx = await this.transactionRepo.findById(
      input.transactionId,
      input.merchantId,
    );
    if (!tx) {
      throw Object.assign(
        new Error(`Transaction not found: ${input.transactionId}`),
        { statusCode: 404, code: 'TRANSACTION_NOT_FOUND' },
      );
    }

    // Idempotent: already succeeded — reload intent for consistent response.
    if (tx.status === 'succeeded') {
      const intent = await this.intentRepo.findById(tx.intentId, input.merchantId);
      if (!intent) {
        throw Object.assign(
          new Error(`Payment intent not found for transaction: ${tx.intentId}`),
          { statusCode: 404, code: 'INTENT_NOT_FOUND' },
        );
      }
      return { transaction: tx, intent, alreadyConfirmed: true };
    }

    // Conditional guard: only requires_action or pending may be confirmed.
    if (tx.status !== 'requires_action' && tx.status !== 'pending') {
      throw Object.assign(
        new Error(
          `Transaction status '${tx.status}' cannot be confirmed. ` +
            'Only requires_action or pending transactions may be confirmed.',
        ),
        { statusCode: 422, code: 'INVALID_TRANSACTION_STATUS' },
      );
    }

    // Reload intent fresh BEFORE updating to re-check overpayment.
    const intent = await this.intentRepo.findById(tx.intentId, input.merchantId);
    if (!intent) {
      throw Object.assign(
        new Error(`Payment intent not found for transaction: ${tx.intentId}`),
        { statusCode: 404, code: 'INTENT_NOT_FOUND' },
      );
    }

    // Overpayment guard at confirmation time.
    // The amountRemaining may have changed since the gateway payment was created
    // (e.g., another payment was confirmed concurrently).
    if (tx.amount > intent.amountRemaining) {
      throw Object.assign(
        new Error(
          `Confirming this transaction would cause overpayment. ` +
            `Transaction amount (${tx.amount}) exceeds current remaining amount (${intent.amountRemaining}).`,
        ),
        { statusCode: 422, code: 'OVERPAYMENT_REJECTED' },
      );
    }

    // Update transaction status to succeeded.
    const confirmedTx = await this.transactionRepo.updateStatus({
      id: tx.id,
      merchantId: input.merchantId,
      status: 'succeeded',
    });

    // Update intent totals.
    const newAmountPaid = intent.amountPaid + tx.amount;
    const newAmountRemaining = Math.max(0, intent.amountDue - newAmountPaid);
    const newStatus = computeIntentStatus(intent.amountDue, newAmountPaid);

    const updatedTotals = await this.intentRepo.updateTotals({
      id: intent.id,
      merchantId: input.merchantId,
      amountPaid: newAmountPaid,
      amountRefunded: intent.amountRefunded,
      amountRemaining: newAmountRemaining,
    });

    const updatedIntent = await this.intentRepo.updateStatus({
      id: intent.id,
      merchantId: input.merchantId,
      status: newStatus,
    });

    return {
      transaction: confirmedTx,
      intent: { ...updatedTotals, status: updatedIntent.status },
      alreadyConfirmed: false,
    };
  }
}
