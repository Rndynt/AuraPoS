/**
 * Payment Engine Phase 6.6 — Refundability + Intent Status Tests
 *
 * Tests GetPaymentIntentRefundability and GetPaymentIntentStatus use cases
 * end-to-end through use cases, using in-memory repositories (no live DB).
 *
 * Covers:
 *  1.  Refundability: no transactions → totalRefundable=0, empty list
 *  2.  Refundability: succeeded incoming payment → canRefund=true, correct amounts
 *  3.  Refundability: partial refund → correct refundableRemaining
 *  4.  Refundability: fully refunded tx → canRefund=false, reason='Fully refunded'
 *  5.  Refundability: failed/voided/outgoing tx → canRefund=false with reason
 *  6.  Refundability: intent not found → throws
 *  7.  IntentStatus: no transactions → latestTransaction=null, canRetryPayment=true
 *  8.  IntentStatus: requires_action tx → requiresAction=true, isTerminal=false
 *  9.  IntentStatus: succeeded tx + paid intent → isTerminal=true, canRetryPayment=false
 * 10.  IntentStatus: failed tx → requiresAction=false, canRetryPayment=true
 * 11.  IntentStatus: intent not found → throws
 */

import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-with-at-least-32-characters-ok';

import type { DomainPaymentIntent, DomainPaymentTransaction } from '@pos/domain/payments';
import { GetPaymentIntentRefundability } from '@pos/application/payments/GetPaymentIntentRefundability';
import { GetPaymentIntentStatus } from '@pos/application/payments/GetPaymentIntentStatus';

// ── Sequence counters ─────────────────────────────────────────────────────────

let intentIdSeq = 0;
let txIdSeq = 0;

// ── Domain object factories ───────────────────────────────────────────────────

function makeIntent(overrides: Partial<DomainPaymentIntent> = {}): DomainPaymentIntent {
  return {
    id: `intent-${++intentIdSeq}`,
    tenantId: 'tenant-test',
    outletId: null,
    payableType: 'order',
    payableId: 'order-1',
    currency: 'IDR',
    amountDue: 100_000,
    amountPaid: 0,
    amountRefunded: 0,
    amountRemaining: 100_000,
    status: 'requires_payment',
    allowPartial: false,
    expiresAt: null,
    metadata: null,
    idempotencyKey: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeTx(overrides: Partial<DomainPaymentTransaction> = {}): DomainPaymentTransaction {
  return {
    id: `tx-${++txIdSeq}`,
    tenantId: 'tenant-test',
    paymentIntentId: 'intent-1',
    parentTransactionId: null,
    direction: 'incoming',
    transactionType: 'payment',
    method: 'qris',
    provider: 'fake_gateway',
    status: 'succeeded',
    amount: 100_000,
    receivedAmount: null,
    changeAmount: null,
    providerReference: null,
    providerPaymentUrl: null,
    providerQrString: null,
    failureReason: null,
    idempotencyKey: null,
    metadata: null,
    createdAt: new Date('2025-01-01T00:01:00Z'),
    updatedAt: new Date('2025-01-01T00:01:00Z'),
    succeededAt: null,
    failedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

// ── In-memory fake intent repo ────────────────────────────────────────────────

function makeFakeIntentRepo(intent: DomainPaymentIntent | null) {
  return {
    findById: async (id: string, _tenantId?: string) =>
      intent && id === intent.id ? intent : null,
  };
}

// ── In-memory fake tx repo ────────────────────────────────────────────────────

function makeFakeTxRepo(txs: DomainPaymentTransaction[]) {
  return {
    findByIntentId: async (intentId: string, _tenantId?: string) =>
      txs.filter((t) => t.paymentIntentId === intentId),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRefundabilityUC(
  intent: DomainPaymentIntent | null,
  txs: DomainPaymentTransaction[] = [],
) {
  return new GetPaymentIntentRefundability(
    makeFakeIntentRepo(intent) as any,
    makeFakeTxRepo(txs) as any,
  );
}

function buildStatusUC(
  intent: DomainPaymentIntent | null,
  txs: DomainPaymentTransaction[] = [],
) {
  return new GetPaymentIntentStatus(
    makeFakeIntentRepo(intent) as any,
    makeFakeTxRepo(txs) as any,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetPaymentIntentRefundability', () => {
  it('no transactions → totalRefundable=0, empty transactions list', async () => {
    const intent = makeIntent();
    const uc = buildRefundabilityUC(intent, []);
    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.totalRefundable, 0);
    assert.equal(result.transactions.length, 0);
    assert.equal(result.intent.id, intent.id);
    assert.equal(result.intent.status, 'requires_payment');
  });

  it('succeeded incoming payment → canRefund=true, refundableRemaining=amount', async () => {
    const intent = makeIntent({ amountPaid: 100_000, status: 'paid', amountRemaining: 0 });
    const tx = makeTx({ paymentIntentId: intent.id, direction: 'incoming', status: 'succeeded', transactionType: 'payment', amount: 100_000 });
    const uc = buildRefundabilityUC(intent, [tx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.totalRefundable, 100_000);
    assert.equal(result.transactions.length, 1);
    const row = result.transactions[0];
    assert.equal(row.canRefund, true);
    assert.equal(row.refundableRemaining, 100_000);
    assert.equal(row.refundedAmount, 0);
    assert.equal(row.transactionId, tx.id);
    assert.equal(row.reason, undefined);
  });

  it('partial refund → refundableRemaining = original - alreadyRefunded', async () => {
    const intent = makeIntent({ amountPaid: 100_000, amountRefunded: 30_000, status: 'partially_refunded', amountRemaining: 0 });
    const parentTx = makeTx({ paymentIntentId: intent.id, direction: 'incoming', status: 'succeeded', transactionType: 'payment', amount: 100_000 });
    const refundTx = makeTx({
      paymentIntentId: intent.id,
      direction: 'outgoing',
      transactionType: 'refund',
      status: 'succeeded',
      amount: 30_000,
      parentTransactionId: parentTx.id,
    });
    const uc = buildRefundabilityUC(intent, [parentTx, refundTx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    // totalRefundable = 100k - 30k = 70k
    assert.equal(result.totalRefundable, 70_000);
    // Only 1 entry for the parent tx (refund itself has canRefund=false)
    const parentRow = result.transactions.find((t) => t.transactionId === parentTx.id)!;
    assert.ok(parentRow, 'parent tx row must exist');
    assert.equal(parentRow.canRefund, true);
    assert.equal(parentRow.refundedAmount, 30_000);
    assert.equal(parentRow.refundableRemaining, 70_000);
  });

  it('fully refunded tx → canRefund=false, reason=Fully refunded', async () => {
    const intent = makeIntent({ amountPaid: 100_000, amountRefunded: 100_000, status: 'refunded', amountRemaining: 0 });
    const parentTx = makeTx({ paymentIntentId: intent.id, direction: 'incoming', status: 'succeeded', transactionType: 'payment', amount: 100_000 });
    const refundTx = makeTx({
      paymentIntentId: intent.id,
      direction: 'outgoing',
      transactionType: 'refund',
      status: 'succeeded',
      amount: 100_000,
      parentTransactionId: parentTx.id,
    });
    const uc = buildRefundabilityUC(intent, [parentTx, refundTx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.totalRefundable, 0);
    const parentRow = result.transactions.find((t) => t.transactionId === parentTx.id)!;
    assert.equal(parentRow.canRefund, false);
    assert.equal(parentRow.reason, 'Fully refunded');
  });

  it('failed/pending/outgoing tx → canRefund=false with descriptive reason', async () => {
    const intent = makeIntent();
    const failedTx = makeTx({ paymentIntentId: intent.id, direction: 'incoming', status: 'failed', amount: 100_000 });
    const pendingTx = makeTx({ paymentIntentId: intent.id, direction: 'incoming', status: 'pending', amount: 100_000 });
    const outgoingTx = makeTx({ paymentIntentId: intent.id, direction: 'outgoing', transactionType: 'refund', status: 'succeeded', amount: 10_000, parentTransactionId: 'some-parent' });
    const uc = buildRefundabilityUC(intent, [failedTx, pendingTx, outgoingTx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.totalRefundable, 0);
    const failedRow = result.transactions.find((t) => t.transactionId === failedTx.id)!;
    assert.equal(failedRow.canRefund, false);
    assert.ok(failedRow.reason?.includes('status is failed'));
    const pendingRow = result.transactions.find((t) => t.transactionId === pendingTx.id)!;
    assert.equal(pendingRow.canRefund, false);
    assert.ok(pendingRow.reason?.includes('status is pending'));
    const outgoingRow = result.transactions.find((t) => t.transactionId === outgoingTx.id)!;
    assert.equal(outgoingRow.canRefund, false);
    assert.ok(outgoingRow.reason?.includes('direction is outgoing'));
  });

  it('intent not found → throws "not found"', async () => {
    const uc = buildRefundabilityUC(null, []);
    await assert.rejects(
      () => uc.execute({ tenantId: 'tenant-test', paymentIntentId: 'nonexistent' }),
      /not found/i,
    );
  });
});

describe('GetPaymentIntentStatus', () => {
  it('no transactions → latestTransaction=null, canRetryPayment=true, isTerminal=false', async () => {
    const intent = makeIntent({ amountRemaining: 100_000, status: 'requires_payment' });
    const uc = buildStatusUC(intent, []);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.latestTransaction, null);
    assert.equal(result.isTerminal, false);
    assert.equal(result.requiresAction, false);
    assert.equal(result.canRetryPayment, true);
    assert.deepEqual(result.providerActions, []);
    assert.equal(result.intent.status, 'requires_payment');
  });

  it('requires_action tx → requiresAction=true, isTerminal=false, canRetryPayment=true (amountRemaining>0)', async () => {
    const intent = makeIntent({ amountRemaining: 100_000, status: 'requires_payment' });
    const tx = makeTx({ paymentIntentId: intent.id, status: 'requires_action', providerReference: 'fake_intent_abc' });
    const uc = buildStatusUC(intent, [tx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.requiresAction, true);
    assert.equal(result.isTerminal, false);
    assert.equal(result.canRetryPayment, true);
    assert.ok(result.latestTransaction, 'latestTransaction must exist');
    assert.equal(result.latestTransaction!.status, 'requires_action');
    assert.equal(result.latestTransaction!.providerReference, 'fake_intent_abc');
  });

  it('paid intent + succeeded tx → isTerminal=true, canRetryPayment=false', async () => {
    const intent = makeIntent({ amountPaid: 100_000, amountRemaining: 0, status: 'paid' });
    const tx = makeTx({ paymentIntentId: intent.id, status: 'succeeded', amount: 100_000 });
    const uc = buildStatusUC(intent, [tx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.isTerminal, true);
    assert.equal(result.canRetryPayment, false);
    assert.equal(result.requiresAction, false);
    assert.equal(result.intent.status, 'paid');
    assert.equal(result.intent.amountPaid, 100_000);
    assert.equal(result.intent.amountRemaining, 0);
  });

  it('failed tx → requiresAction=false, canRetryPayment=true, isTerminal=false', async () => {
    const intent = makeIntent({ amountRemaining: 100_000, status: 'requires_payment' });
    const tx = makeTx({ paymentIntentId: intent.id, status: 'failed', failureReason: 'Insufficient funds' });
    const uc = buildStatusUC(intent, [tx]);

    const result = await uc.execute({ tenantId: intent.tenantId, paymentIntentId: intent.id });

    assert.equal(result.requiresAction, false);
    assert.equal(result.canRetryPayment, true);
    assert.equal(result.isTerminal, false);
    assert.equal(result.latestTransaction!.status, 'failed');
    assert.equal(result.latestTransaction!.failureReason, 'Insufficient funds');
  });

  it('intent not found → throws "not found"', async () => {
    const uc = buildStatusUC(null, []);
    await assert.rejects(
      () => uc.execute({ tenantId: 'tenant-test', paymentIntentId: 'nonexistent' }),
      /not found/i,
    );
  });
});
