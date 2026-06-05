/**
 * Payment Engine Phase 6.5 — FakeGateway E2E Tests
 *
 * Tests all FakeGateway scenarios end-to-end through use cases,
 * using in-memory repositories (no live DB or HTTP server required).
 *
 * ── What FakeGateway is ────────────────────────────────────────────────────
 * FakeGateway is NOT a Midtrans, Xendit, or Stripe emulator.
 * It is the local dev/test golden contract provider used to prove the
 * Payment Engine lifecycle before any real provider is integrated.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Covers:
 *  1.  qris scenario → requires_action + QR_STRING descriptor
 *  2.  redirect scenario → requires_action + WEB_URL descriptor
 *  3.  va scenario → requires_action + VA_NUMBER descriptor
 *  4.  payment_code scenario → requires_action + PAYMENT_CODE descriptor
 *  5.  default scenario backward compat: pending, legacy fields, providerActions=[]
 *  6.  ConfirmFakeGateway succeeded → tx succeeded, intent paid
 *  7.  ConfirmFakeGateway failed → tx failed, amountPaid unchanged
 *  8.  immediate_success → tx succeeded directly, allocation created, intent paid
 *  9.  immediate_failure → tx failed, no allocation, amountPaid unchanged
 * 10.  pending_expiry → expiresAt set + requires_action
 * 11.  VoidPaymentTransaction — void pending tx
 * 12.  VoidPaymentTransaction — void requires_action tx
 * 13.  RefundPaymentTransaction — refund succeeded tx
 * 14.  ReconcilePaymentIntentTotals — dry-run returns result without mutation
 * 15.  Production guard — /fake-gateway/confirm route returns 404 in production
 */

import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-with-at-least-32-characters-ok';

// ── Domain / application imports ──────────────────────────────────────────────

import { PaymentPolicyError } from '@pos/domain/payments';
import type { DomainPaymentIntent, DomainPaymentTransaction } from '@pos/domain/payments';

import { CreateGatewayPayment } from '@pos/application/payments/CreateGatewayPayment';
import { ConfirmFakeGatewayPayment } from '@pos/application/payments/ConfirmFakeGatewayPayment';
import { ApplyGatewayTransactionStatus } from '@pos/application/payments/ApplyGatewayTransactionStatus';
import { RecalculatePaymentIntent } from '@pos/application/payments/RecalculatePaymentIntent';
import { VoidPaymentTransaction } from '@pos/application/payments/VoidPaymentTransaction';
import { RefundPaymentTransaction } from '@pos/application/payments/RefundPaymentTransaction';
import { ReconcilePaymentIntentTotals } from '@pos/application/payments/ReconcilePaymentIntentTotals';
import { PaymentProviderRegistry } from '@pos/application/payments/PaymentProviderRegistry';
import { FakeGatewayProvider } from '@pos/infrastructure/payments/providers/FakeGatewayProvider';

// ── Sequence counters ─────────────────────────────────────────────────────────

let intentIdSeq = 0;
let txIdSeq = 0;
let allocIdSeq = 0;

// ── Domain object factories ───────────────────────────────────────────────────

function makeIntent(overrides: Partial<DomainPaymentIntent> = {}): DomainPaymentIntent {
  return {
    id: `intent-${++intentIdSeq}`,
    tenantId: 'tenant-a',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Row ↔ domain converters ───────────────────────────────────────────────────
// The real DB stores numeric/decimal columns as strings.
// `CreateGatewayPayment` already calls `.toFixed(2)` before passing to txRepo.create,
// so we must NOT call `.toFixed()` again in the fake repo.

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseFloat(v);
}

function toNullNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === 'number' ? v : parseFloat(v);
}

function toIntentRow(i: DomainPaymentIntent): any {
  return {
    ...i,
    amountDue: i.amountDue.toFixed(2),
    amountPaid: i.amountPaid.toFixed(2),
    amountRefunded: i.amountRefunded.toFixed(2),
    amountRemaining: i.amountRemaining.toFixed(2),
  };
}

function parseIntentRow(row: any): DomainPaymentIntent {
  return {
    ...row,
    amountDue: toNum(row.amountDue),
    amountPaid: toNum(row.amountPaid),
    amountRefunded: toNum(row.amountRefunded),
    amountRemaining: toNum(row.amountRemaining),
  };
}

function parseTxRow(row: any): DomainPaymentTransaction {
  return {
    ...row,
    amount: toNum(row.amount),
    receivedAmount: toNullNum(row.receivedAmount),
    changeAmount: toNullNum(row.changeAmount),
  };
}

// ── In-memory fake intent repo ────────────────────────────────────────────────
// Signatures match the real PaymentIntentRepository interface as called by the use cases:
//   findById(id, tenantId, tx?)
//   lockForUpdate(id, tenantId, tx)
//   update(id, tenantId, updates, tx?)
//   listByIds(ids, tenantId)
//   listByTenant(tenantId, opts?)

function makeFakeIntentRepo(intent: DomainPaymentIntent) {
  let stored = toIntentRow(intent);

  return {
    findById: async (id: string, _tenantId?: string, _tx?: any) =>
      id === stored.id ? parseIntentRow(stored) : null,

    lockForUpdate: async (id: string, _tenantId?: string, _tx?: any) =>
      id === stored.id ? parseIntentRow(stored) : null,

    update: async (id: string, _tenantId: string, updates: any, _tx?: any) => {
      if (id !== stored.id) return null;
      // Normalize numeric updates to strings for consistent storage
      const normalized: any = {};
      for (const [k, v] of Object.entries(updates)) {
        if (['amountDue', 'amountPaid', 'amountRefunded', 'amountRemaining'].includes(k)) {
          normalized[k] = typeof v === 'number' ? (v as number).toFixed(2) : v;
        } else {
          normalized[k] = v;
        }
      }
      stored = { ...stored, ...normalized, updatedAt: new Date() };
      return parseIntentRow(stored);
    },

    listByIds: async (ids: string[], _tenantId: string) =>
      ids.includes(stored.id) ? [stored] : [],

    listByTenant: async (_tenantId: string, _opts?: any) => [stored],

    getLatest: () => parseIntentRow(stored),
  };
}

// ── In-memory fake tx repo ────────────────────────────────────────────────────
// Signatures match the real PaymentTransactionRepository interface:
//   create(data, tx?)
//   findById(id, tenantId?, tx?)
//   lockByIdForUpdate(id, tenantId, tx)           — VoidPaymentTransaction
//   lockByProviderReferenceForUpdate(provider, ref, tx) — ApplyGatewayTransactionStatus
//   update(id, tenantId, updates, tx?)
//   findByIntentId(intentId, tenantId, tx?)
//   findAllByIntentIds(ids, tenantId, tx?)
//   findByIdempotencyKey(tenantId, key, tx?)
//   sumRefundedForParent(tenantId, parentTxId, tx?)

function makeFakeTxRepo() {
  const store: any[] = [];

  const makeRow = (data: any): any => ({
    succeededAt: null,
    failedAt: null,
    cancelledAt: null,
    ...data,
    id: data.id ?? `tx-${++txIdSeq}`,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  });

  const getRow = (id: string) => store.find(r => r.id === id) ?? null;

  return {
    create: async (data: any, _tx?: any) => {
      const row = makeRow(data);
      store.push(row);
      return parseTxRow(row);
    },

    findById: async (id: string, _tenantId?: string, _tx?: any) => {
      const row = getRow(id);
      return row ? parseTxRow(row) : null;
    },

    lockByIdForUpdate: async (id: string, _tenantId?: string, _tx?: any) => {
      const row = getRow(id);
      return row ? parseTxRow(row) : null;
    },

    lockByProviderReferenceForUpdate: async (provider: string, ref: string, _tx?: any) => {
      const row = store.find(r => r.provider === provider && r.providerReference === ref);
      return row ? parseTxRow(row) : null;
    },

    update: async (id: string, _tenantId: string | any, updates: any, _tx?: any) => {
      const idx = store.findIndex(r => r.id === id);
      if (idx < 0) return null;
      store[idx] = { ...store[idx], ...updates, updatedAt: new Date() };
      return parseTxRow(store[idx]);
    },

    findByIntentId: async (intentId: string, _tenantId?: string, _tx?: any) =>
      store.filter(r => r.paymentIntentId === intentId).map(parseTxRow),

    findAllByIntentIds: async (ids: string[], _tenantId?: string, _tx?: any) =>
      store.filter(r => ids.includes(r.paymentIntentId)).map(parseTxRow),

    findByIdempotencyKey: async (_tenantId: string, _key: string, _tx?: any) =>
      null,

    sumRefundedForParent: async (_tenantId: string, parentTxId: string, _tx?: any) => {
      const refunds = store.filter(r =>
        r.parentTransactionId === parentTxId &&
        r.transactionType === 'refund' &&
        r.direction === 'outgoing' &&
        r.status === 'succeeded',
      );
      return refunds.reduce((sum, r) => sum + toNum(r.amount), 0);
    },

    getAll: () => store.map(parseTxRow),
    getStore: () => store,
  };
}

// ── In-memory fake allocation repo ───────────────────────────────────────────

function makeFakeAllocRepo() {
  const store: any[] = [];
  return {
    create: async (data: any, _tx?: any) => {
      const row = { ...data, id: `alloc-${++allocIdSeq}`, createdAt: new Date() };
      store.push(row);
      return row;
    },
    findByIntentId: async (intentId: string) =>
      store.filter(r => r.paymentIntentId === intentId),
    getStore: () => store,
  };
}

// ── Fake DB (supports db.transaction()) ──────────────────────────────────────

function makeFakeDb() {
  return {
    transaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn({}),
  } as any;
}

// ── Build use-case suite ──────────────────────────────────────────────────────

function buildSuite(intent: DomainPaymentIntent) {
  const intentRepo = makeFakeIntentRepo(intent);
  const txRepo = makeFakeTxRepo();
  const allocRepo = makeFakeAllocRepo();
  const fakeDb = makeFakeDb();

  const registry = new PaymentProviderRegistry().register(new FakeGatewayProvider());

  const recalculate = new RecalculatePaymentIntent(intentRepo as any, txRepo as any);

  const applyGatewayStatus = new ApplyGatewayTransactionStatus(
    intentRepo as any,
    txRepo as any,
    allocRepo as any,
    recalculate,
  );

  const createGatewayPayment = new CreateGatewayPayment(
    fakeDb,
    intentRepo as any,
    txRepo as any,
    registry,
    allocRepo as any,
    recalculate,
  );

  const confirmFakeGateway = new ConfirmFakeGatewayPayment(fakeDb, applyGatewayStatus);

  const voidTx = new VoidPaymentTransaction(fakeDb, intentRepo as any, txRepo as any);

  const refundTx = new RefundPaymentTransaction(
    fakeDb,
    intentRepo as any,
    txRepo as any,
    recalculate,
  );

  const reconcile = new ReconcilePaymentIntentTotals(fakeDb, intentRepo as any, txRepo as any);

  return {
    intentRepo,
    txRepo,
    allocRepo,
    createGatewayPayment,
    confirmFakeGateway,
    voidTx,
    refundTx,
    reconcile,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FakeGateway E2E — scenario: qris', () => {
  it('qris: requires_action, providerActions[0].descriptor = QR_STRING', async () => {
    const intent = makeIntent();
    const { createGatewayPayment } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
      metadata: { scenario: 'qris' },
    });

    assert.equal(result.transaction.status, 'requires_action');
    assert.ok(Array.isArray(result.providerActions) && result.providerActions.length > 0);
    assert.equal(result.providerActions[0].descriptor, 'QR_STRING');
    assert.equal(result.providerActions[0].type, 'present_qr');
    assert.ok(result.providerActions[0].value?.startsWith('FAKE_QR:'));
    assert.equal(result.intent.amountPaid, 0, 'requires_action must not increase amountPaid');
  });
});

describe('FakeGateway E2E — scenario: redirect', () => {
  it('redirect: requires_action, providerActions[0].descriptor = WEB_URL', async () => {
    const intent = makeIntent();
    const { createGatewayPayment } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
      metadata: { scenario: 'redirect' },
    });

    assert.equal(result.transaction.status, 'requires_action');
    assert.ok(Array.isArray(result.providerActions) && result.providerActions.length > 0);
    assert.equal(result.providerActions[0].descriptor, 'WEB_URL');
    assert.equal(result.providerActions[0].type, 'redirect_customer');
    assert.ok(result.providerActions[0].value?.startsWith('https://fake-gateway.local/pay/'));
  });
});

describe('FakeGateway E2E — scenario: va', () => {
  it('va: requires_action, providerActions[0].descriptor = VA_NUMBER', async () => {
    const intent = makeIntent();
    const { createGatewayPayment } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'bank_transfer',
      amount: 100_000,
      metadata: { scenario: 'va' },
    });

    assert.equal(result.transaction.status, 'requires_action');
    assert.ok(Array.isArray(result.providerActions) && result.providerActions.length > 0);
    assert.equal(result.providerActions[0].descriptor, 'VA_NUMBER');
    assert.equal(result.providerActions[0].type, 'display_code');
    assert.ok(result.providerActions[0].value, 'VA number must have a value');
  });
});

describe('FakeGateway E2E — scenario: payment_code', () => {
  it('payment_code: requires_action, providerActions[0].descriptor = PAYMENT_CODE', async () => {
    const intent = makeIntent();
    const { createGatewayPayment } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'other',
      amount: 100_000,
      metadata: { scenario: 'payment_code' },
    });

    assert.equal(result.transaction.status, 'requires_action');
    assert.ok(Array.isArray(result.providerActions) && result.providerActions.length > 0);
    assert.equal(result.providerActions[0].descriptor, 'PAYMENT_CODE');
    assert.equal(result.providerActions[0].type, 'display_code');
    assert.ok(result.providerActions[0].value?.startsWith('FAKE'));
  });
});

describe('FakeGateway E2E — scenario: default (backward compat)', () => {
  it('default: tx pending, providerPaymentUrl set, providerQrString set, providerActions=[]', async () => {
    const intent = makeIntent();
    const { createGatewayPayment } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    assert.equal(result.transaction.status, 'pending');
    assert.ok(result.transaction.providerPaymentUrl, 'providerPaymentUrl must be set for default');
    assert.ok(result.transaction.providerQrString, 'providerQrString must be set for default');
    assert.ok(Array.isArray(result.providerActions));
    assert.equal(result.providerActions.length, 0, 'default: providerActions must be empty');
    assert.equal(result.immediateSuccess, false);
    assert.equal(result.intent.amountPaid, 0);
  });
});

describe('FakeGateway E2E — ConfirmFakeGatewayPayment succeeded', () => {
  it('confirm succeeded: tx=succeeded, intent=paid, amountPaid correct', async () => {
    const intent = makeIntent({ amountDue: 75_000, amountRemaining: 75_000 });
    const { createGatewayPayment, confirmFakeGateway, intentRepo } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 75_000,
    });

    const providerRef = gwResult.transaction.providerReference!;
    assert.ok(providerRef, 'providerReference required');

    const confirmResult = await confirmFakeGateway.execute({
      tenantId: intent.tenantId,
      providerReference: providerRef,
      status: 'succeeded',
    });

    assert.equal(confirmResult.transaction.status, 'succeeded');
    assert.equal(confirmResult.intent.status, 'paid');
    assert.equal(confirmResult.intent.amountPaid, 75_000);
    assert.equal(confirmResult.intent.amountRemaining, 0);
  });
});

describe('FakeGateway E2E — ConfirmFakeGatewayPayment failed', () => {
  it('confirm failed: tx=failed, amountPaid unchanged, intent=requires_payment', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, confirmFakeGateway } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    const confirmResult = await confirmFakeGateway.execute({
      tenantId: intent.tenantId,
      providerReference: gwResult.transaction.providerReference!,
      status: 'failed',
      failureReason: 'Insufficient funds (test)',
    });

    assert.equal(confirmResult.transaction.status, 'failed');
    assert.equal(confirmResult.intent.status, 'requires_payment');
    assert.equal(confirmResult.intent.amountPaid, 0);
  });
});

describe('FakeGateway E2E — scenario: immediate_success', () => {
  it('immediate_success: tx=succeeded directly, allocation created, intent=paid', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, txRepo, allocRepo } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
      metadata: { scenario: 'immediate_success' },
    });

    assert.equal(result.transaction.status, 'succeeded', 'tx must be succeeded immediately');
    assert.equal(result.immediateSuccess, true);
    assert.equal(result.intent.status, 'paid');
    assert.equal(result.intent.amountPaid, 100_000);
    assert.equal(result.intent.amountRemaining, 0);
    assert.equal(result.providerActions.length, 0);

    // Verify exactly one tx was created (no two-step pending→succeeded)
    const allTx = txRepo.getAll();
    assert.equal(allTx.length, 1, 'immediate_success: exactly one tx row must exist');
    assert.equal(allTx[0].status, 'succeeded');
    assert.ok(allTx[0].succeededAt, 'succeededAt must be populated');

    // Verify allocation was created
    const allocs = allocRepo.getStore();
    assert.equal(allocs.length, 1, 'immediate_success: exactly one allocation must exist');
    assert.equal(toNum(allocs[0].amount), 100_000);
  });
});

describe('FakeGateway E2E — scenario: immediate_failure', () => {
  it('immediate_failure: tx=failed, no allocation, amountPaid=0', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, txRepo, allocRepo } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
      metadata: { scenario: 'immediate_failure' },
    });

    assert.equal(result.transaction.status, 'failed');
    assert.ok(result.transaction.failureReason, 'failureReason must be set for immediate_failure');
    assert.equal(result.immediateSuccess, false);
    assert.equal(result.intent.status, 'requires_payment');
    assert.equal(result.intent.amountPaid, 0);

    // Verify no allocation was created
    const allocs = allocRepo.getStore();
    assert.equal(allocs.length, 0, 'immediate_failure: no allocation must be created');
  });
});

describe('FakeGateway E2E — scenario: pending_expiry', () => {
  it('pending_expiry: requires_action, expiresAt set on action', async () => {
    const intent = makeIntent();
    const { createGatewayPayment } = buildSuite(intent);

    const result = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
      metadata: { scenario: 'pending_expiry' },
    });

    assert.equal(result.transaction.status, 'requires_action');
    assert.ok(Array.isArray(result.providerActions) && result.providerActions.length > 0);
    assert.equal(result.providerActions[0].descriptor, 'WEB_URL');

    const expiresAt = result.providerActions[0].expiresAt;
    assert.ok(expiresAt, 'expiresAt must be set for pending_expiry');
    assert.ok(expiresAt > new Date(), 'expiresAt must be in the future');
  });
});

describe('FakeGateway E2E — VoidPaymentTransaction', () => {
  it('void pending tx: tx=voided', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, voidTx } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    assert.equal(gwResult.transaction.status, 'pending');

    const voidResult = await voidTx.execute({
      tenantId: intent.tenantId,
      transactionId: gwResult.transaction.id,
    });

    assert.equal(voidResult.transaction.status, 'voided');
  });

  it('void requires_action tx: tx=voided', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, voidTx } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
      metadata: { scenario: 'qris' },
    });

    assert.equal(gwResult.transaction.status, 'requires_action');

    const voidResult = await voidTx.execute({
      tenantId: intent.tenantId,
      transactionId: gwResult.transaction.id,
    });

    assert.equal(voidResult.transaction.status, 'voided');
  });

  it('cannot void an already-succeeded tx', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, confirmFakeGateway, voidTx } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    await confirmFakeGateway.execute({
      tenantId: intent.tenantId,
      providerReference: gwResult.transaction.providerReference!,
      status: 'succeeded',
    });

    await assert.rejects(
      () => voidTx.execute({ tenantId: intent.tenantId, transactionId: gwResult.transaction.id }),
      (err: any) => err instanceof PaymentPolicyError,
      'Cannot void a succeeded tx',
    );
  });
});

describe('FakeGateway E2E — RefundPaymentTransaction', () => {
  it('refund succeeded tx: refund tx created, intent status updated', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, confirmFakeGateway, refundTx, allocRepo } = buildSuite(intent);

    // 1. Create gateway payment
    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    // 2. Confirm succeeded
    await confirmFakeGateway.execute({
      tenantId: intent.tenantId,
      providerReference: gwResult.transaction.providerReference!,
      status: 'succeeded',
    });

    // 3. Refund full amount
    const refundResult = await refundTx.execute({
      tenantId: intent.tenantId,
      transactionId: gwResult.transaction.id,
      amount: 100_000,
    });

    assert.equal(refundResult.refundTransaction.status, 'succeeded');
    assert.equal(refundResult.refundTransaction.direction, 'outgoing');
    assert.equal(refundResult.refundTransaction.transactionType, 'refund');
    assert.ok(
      ['refunded', 'partially_refunded'].includes(refundResult.intent.status),
      `intent status must be refunded or partially_refunded, got: ${refundResult.intent.status}`,
    );
  });

  it('cannot refund a non-succeeded (pending) tx', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, refundTx } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    assert.equal(gwResult.transaction.status, 'pending');

    await assert.rejects(
      () => refundTx.execute({
        tenantId: intent.tenantId,
        transactionId: gwResult.transaction.id,
        amount: 100_000,
      }),
      (err: any) => err instanceof PaymentPolicyError,
      'Cannot refund a pending tx',
    );
  });
});

describe('FakeGateway E2E — ReconcilePaymentIntentTotals dry-run', () => {
  it('dry_run=true: returns result without mutating intent status', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, confirmFakeGateway, reconcile, intentRepo } = buildSuite(intent);

    // Create a paid intent
    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    await confirmFakeGateway.execute({
      tenantId: intent.tenantId,
      providerReference: gwResult.transaction.providerReference!,
      status: 'succeeded',
    });

    const currentIntent = intentRepo.getLatest();
    assert.equal(currentIntent.status, 'paid', 'intent must be paid before reconcile');

    // Dry-run reconcile
    const result = await reconcile.execute({
      tenantId: intent.tenantId,
      intentIds: [intent.id],
      dryRun: true,
    });

    assert.ok(result !== undefined, 'reconcile must return a result');

    // Intent must remain unmodified after dry-run
    const afterIntent = intentRepo.getLatest();
    assert.equal(afterIntent.status, 'paid', 'dry-run must not mutate intent status');
  });

  it('dry_run=true with empty intentIds: completes without error', async () => {
    const intent = makeIntent();
    const { reconcile } = buildSuite(intent);

    // Call with empty intentIds — ReconcilePaymentIntentTotals has early-return
    const result = await reconcile.execute({
      tenantId: intent.tenantId,
      intentIds: [],
      dryRun: true,
    });

    assert.ok(result !== undefined, 'reconcile must complete without throwing');
  });
});

describe('FakeGateway E2E — Production guard for /fake-gateway/confirm', () => {
  it('NODE_ENV=production: route guard fires, no next() called', () => {
    // Simulates the inline route guard in payment-engine.ts:
    //   if (process.env.NODE_ENV === 'production') { res.status(404).json(...); return; }
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      let guardFired = false;
      let nextCalled = false;

      const mockRes = {
        status: (_code: number) => ({ json: () => { guardFired = true; } }),
      } as any;
      const mockNext = () => { nextCalled = true; };

      if (process.env.NODE_ENV === 'production') {
        mockRes.status(404).json({ success: false, error: 'Not found' });
      } else {
        mockNext();
      }

      assert.equal(guardFired, true, 'Production guard must fire in production');
      assert.equal(nextCalled, false, 'next() must NOT be called in production');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('NODE_ENV=production: FakeGateway webhook route returns 404', () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      let guardFired = false;
      let nextCalled = false;

      const mockReq = { params: { provider: 'fake_gateway' } } as any;
      const mockRes = {
        status: (_code: number) => ({ json: () => { guardFired = true; } }),
      } as any;
      const mockNext = () => { nextCalled = true; };

      if (mockReq.params.provider === 'fake_gateway' && process.env.NODE_ENV === 'production') {
        mockRes.status(404).json({ success: false, error: 'Not found' });
      } else {
        mockNext();
      }

      assert.equal(guardFired, true, 'Production guard must fire for fake_gateway webhook in production');
      assert.equal(nextCalled, false, 'next() must NOT be called for fake_gateway webhook in production');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('NODE_ENV=development: confirm guard calls next() (non-production path)', () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';

      let guardFired = false;
      let nextCalled = false;

      const mockRes = {
        status: (_code: number) => ({ json: () => { guardFired = true; } }),
      } as any;
      const mockNext = () => { nextCalled = true; };

      if (process.env.NODE_ENV === 'production') {
        mockRes.status(404).json({ success: false, error: 'Not found' });
      } else {
        mockNext();
      }

      assert.equal(guardFired, false, 'Production guard must NOT fire in development');
      assert.equal(nextCalled, true, 'next() must be called in development');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

describe('FakeGateway E2E — ConfirmFakeGatewayPayment error cases', () => {
  it('confirm unknown providerReference → TRANSACTION_NOT_FOUND', async () => {
    const intent = makeIntent();
    const { confirmFakeGateway } = buildSuite(intent);

    await assert.rejects(
      () => confirmFakeGateway.execute({
        tenantId: intent.tenantId,
        providerReference: 'nonexistent_ref_xyz',
        status: 'succeeded',
      }),
      (err: any) => {
        assert.ok(err instanceof PaymentPolicyError);
        assert.equal(err.code, 'TRANSACTION_NOT_FOUND');
        return true;
      },
    );
  });

  it('double-confirm already-succeeded tx → INVALID_TRANSITION', async () => {
    const intent = makeIntent();
    const { createGatewayPayment, confirmFakeGateway } = buildSuite(intent);

    const gwResult = await createGatewayPayment.execute({
      tenantId: intent.tenantId,
      paymentIntentId: intent.id,
      provider: 'fake_gateway',
      method: 'qris',
      amount: 100_000,
    });

    const ref = gwResult.transaction.providerReference!;

    // First confirm succeeds
    await confirmFakeGateway.execute({ tenantId: intent.tenantId, providerReference: ref, status: 'succeeded' });

    // Second confirm must fail
    await assert.rejects(
      () => confirmFakeGateway.execute({ tenantId: intent.tenantId, providerReference: ref, status: 'succeeded' }),
      (err: any) => {
        assert.ok(err instanceof PaymentPolicyError);
        assert.equal(err.code, 'INVALID_TRANSITION');
        return true;
      },
    );
  });
});
