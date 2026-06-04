/**
 * Payment Engine Phase 1.5 — DB-Backed Concurrency Tests
 *
 * These tests run against the REAL PostgreSQL database (not in-memory fakes).
 * They prove that the FOR UPDATE row lock and the DB-level unique constraint on
 * `payment_transactions.idempotency_key` protect against:
 *
 *  1. Duplicate idempotency key race: two concurrent RecordManualPayment calls
 *     with the same idempotency key produce exactly one transaction row and one
 *     allocation row, and amountPaid = amountDue.
 *
 *  2. Full-payment race with different idempotency keys: two concurrent calls
 *     each trying to pay the full remaining balance concurrently — only one
 *     should succeed, final amountPaid must not exceed amountDue.
 *
 * Each test creates its own isolated DB rows (tenant_id = scoped UUIDs) and
 * cleans them up in an `after` hook so they do not interfere with the dev DB.
 *
 * ── Why DB-backed instead of in-memory fake? ───────────────────────────────
 * In-memory fakes call `cb('fake-tx')` without serializing concurrent access.
 * Two concurrent JS promises both proceed without blocking — the fake tx is
 * not a real mutex. Only PostgreSQL's `SELECT … FOR UPDATE` inside a real
 * `BEGIN / COMMIT` block guarantees serialization. This test file exercises
 * the actual Drizzle transaction path against the live PG instance.
 */

import '../../register-paths';
import assert from 'node:assert/strict';
import { after, describe, it, before } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-with-at-least-32-characters-ok';

import { randomUUID } from 'node:crypto';

// ── DB + schema imports (dynamic to avoid top-level await issues) ─────────────
const { sql: rawSql, db } = await import('@pos/infrastructure/database');
const {
  tenants,
  paymentIntents,
  paymentTransactions,
  paymentAllocations,
} = await import('@shared/schema');
const { eq, and } = await import('drizzle-orm');

// ── Use cases ─────────────────────────────────────────────────────────────────
const { CreatePaymentIntent } = await import('@pos/application/payments/CreatePaymentIntent');
const { RecordManualPayment }  = await import('@pos/application/payments/RecordManualPayment');
const { RecalculatePaymentIntent } = await import('@pos/application/payments/RecalculatePaymentIntent');
const { PaymentIntentRepository } = await import('@pos/infrastructure/repositories/payments/PaymentIntentRepository');
const { PaymentTransactionRepository } = await import('@pos/infrastructure/repositories/payments/PaymentTransactionRepository');
const { PaymentAllocationRepository } = await import('@pos/infrastructure/repositories/payments/PaymentAllocationRepository');
const { PaymentPolicyError } = await import('@pos/domain/payments');

// ── Test helpers ──────────────────────────────────────────────────────────────

const TEST_TENANT_ID = randomUUID();
const ROWS_TO_CLEAN: { table: string; tenantId: string }[] = [];

async function insertTestTenant(id: string): Promise<void> {
  await rawSql`
    INSERT INTO tenants (id, name, slug, currency, timezone, is_active, created_at, updated_at)
    VALUES (
      ${id}::uuid,
      'DB-Concurrency Test Tenant',
      ${'db-conc-' + id.slice(0, 8)},
      'IDR',
      'Asia/Jakarta',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `;
  ROWS_TO_CLEAN.push({ table: 'tenants', tenantId: id });
}

function buildUseCase(tenantId: string) {
  const intentRepo   = new PaymentIntentRepository(db);
  const txRepo       = new PaymentTransactionRepository(db);
  const allocRepo    = new PaymentAllocationRepository(db);
  const recalculate  = new RecalculatePaymentIntent(intentRepo, txRepo);
  const createIntent = new CreatePaymentIntent(intentRepo);
  const recordPayment = new RecordManualPayment(db, intentRepo, txRepo, allocRepo, recalculate);
  return { createIntent, recordPayment, intentRepo, txRepo, allocRepo };
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

before(async () => {
  await insertTestTenant(TEST_TENANT_ID);
});

after(async () => {
  // Clean up all test rows in dependency order (child → parent).
  await rawSql`DELETE FROM payment_allocations  WHERE tenant_id = ${TEST_TENANT_ID}::uuid`;
  await rawSql`DELETE FROM payment_transactions WHERE tenant_id = ${TEST_TENANT_ID}::uuid`;
  await rawSql`DELETE FROM payment_intents      WHERE tenant_id = ${TEST_TENANT_ID}::uuid`;
  await rawSql`DELETE FROM tenants              WHERE id        = ${TEST_TENANT_ID}::uuid`;

  // Terminate the postgres.js connection pool so node:test can exit cleanly.
  await rawSql.end({ timeout: 3 });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DB Test 1 — Duplicate idempotency key race (same key, same intent)
// ═══════════════════════════════════════════════════════════════════════════════

describe('DB-backed: duplicate idempotency key concurrency', () => {
  it('two concurrent calls with the same key produce exactly one transaction row', async () => {
    const { createIntent, recordPayment } = buildUseCase(TEST_TENANT_ID);
    const idempotencyKey = `idem-race-${randomUUID()}`;

    // 1. Create intent in real DB
    const { intent } = await createIntent.execute({
      tenantId:    TEST_TENANT_ID,
      payableType: 'order',
      payableId:   `order-${randomUUID()}`,
      amountDue:   100000,
      allowPartial: false,
    });

    // 2. Fire two concurrent payments with identical idempotency key
    const results = await Promise.allSettled([
      recordPayment.execute({
        tenantId:       TEST_TENANT_ID,
        paymentIntentId: intent.id,
        amount:          100000,
        method:          'cash',
        receivedAmount:  100000,
        idempotencyKey,
      }),
      recordPayment.execute({
        tenantId:       TEST_TENANT_ID,
        paymentIntentId: intent.id,
        amount:          100000,
        method:          'cash',
        receivedAmount:  100000,
        idempotencyKey,
      }),
    ]);

    // 3. At least one must have succeeded
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    assert.ok(succeeded.length >= 1, 'At least one concurrent call must succeed');

    // 4. Check DB: exactly one transaction row for this idempotency key
    const txRows = await rawSql<{ id: string; payment_intent_id: string }[]>`
      SELECT id, payment_intent_id
      FROM payment_transactions
      WHERE tenant_id = ${TEST_TENANT_ID}::uuid
        AND idempotency_key = ${idempotencyKey}
    `;
    assert.equal(
      txRows.length,
      1,
      `Expected exactly 1 tx row for the idempotency key, got ${txRows.length}`,
    );

    // 5. Exactly one allocation for that transaction
    const allocRows = await rawSql`
      SELECT id FROM payment_allocations
      WHERE tenant_id        = ${TEST_TENANT_ID}::uuid
        AND payment_transaction_id = ${txRows[0].id}::uuid
    `;
    assert.equal(
      allocRows.length,
      1,
      `Expected exactly 1 allocation for the transaction, got ${allocRows.length}`,
    );

    // 6. Intent amountPaid = 100000, status = paid
    const intentRows = await rawSql<{ amount_paid: string; status: string }[]>`
      SELECT amount_paid, status FROM payment_intents
      WHERE id = ${intent.id}::uuid AND tenant_id = ${TEST_TENANT_ID}::uuid
    `;
    assert.equal(intentRows.length, 1);
    assert.equal(Number(intentRows[0].amount_paid), 100000, 'amountPaid must equal amountDue (100000)');
    assert.equal(intentRows[0].status, 'paid', 'intent status must be paid');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DB Test 2 — Full-payment race with different idempotency keys
// ═══════════════════════════════════════════════════════════════════════════════

describe('DB-backed: full-payment race with different idempotency keys', () => {
  it('only one succeeds when two calls each try to pay the full remaining amount', async () => {
    const { createIntent, recordPayment } = buildUseCase(TEST_TENANT_ID);

    // 1. Create intent: allowPartial = false, amountDue = 100000
    const { intent } = await createIntent.execute({
      tenantId:     TEST_TENANT_ID,
      payableType:  'order',
      payableId:    `order-${randomUUID()}`,
      amountDue:    100000,
      allowPartial: false,
    });

    // 2. Fire two concurrent payments with DIFFERENT idempotency keys,
    //    each for the full remaining amount.
    const keyA = `race-key-A-${randomUUID()}`;
    const keyB = `race-key-B-${randomUUID()}`;

    const results = await Promise.allSettled([
      recordPayment.execute({
        tenantId:        TEST_TENANT_ID,
        paymentIntentId: intent.id,
        amount:          100000,
        method:          'card',
        idempotencyKey:  keyA,
      }),
      recordPayment.execute({
        tenantId:        TEST_TENANT_ID,
        paymentIntentId: intent.id,
        amount:          100000,
        method:          'card',
        idempotencyKey:  keyB,
      }),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed    = results.filter((r) => r.status === 'rejected');

    // 3. Exactly one must succeed, the other must fail
    //    (either INTENT_NOT_PAYABLE or AMOUNT_EXCEEDS_REMAINING from the lock path)
    assert.equal(
      succeeded.length,
      1,
      `Expected exactly 1 success, got ${succeeded.length}. Results: ${JSON.stringify(results.map((r) => r.status))}`,
    );
    assert.equal(
      failed.length,
      1,
      `Expected exactly 1 failure, got ${failed.length}`,
    );

    // 4. Final amountPaid must equal amountDue (100000), NOT exceed it
    const intentRows = await rawSql<{ amount_paid: string; status: string }[]>`
      SELECT amount_paid, status FROM payment_intents
      WHERE id = ${intent.id}::uuid AND tenant_id = ${TEST_TENANT_ID}::uuid
    `;
    assert.equal(intentRows.length, 1);
    const finalAmountPaid = Number(intentRows[0].amount_paid);
    assert.ok(
      finalAmountPaid <= 100000,
      `amountPaid must NOT exceed amountDue (100000). Got: ${finalAmountPaid}`,
    );
    assert.equal(finalAmountPaid, 100000, 'amountPaid must equal amountDue after one successful payment');
    assert.equal(intentRows[0].status, 'paid', 'intent status must be paid');

    // 5. Exactly one transaction in DB for this intent
    const txRows = await rawSql`
      SELECT id FROM payment_transactions
      WHERE tenant_id        = ${TEST_TENANT_ID}::uuid
        AND payment_intent_id = ${intent.id}::uuid
        AND status            = 'succeeded'
    `;
    assert.equal(
      txRows.length,
      1,
      `Expected exactly 1 succeeded transaction, got ${txRows.length}`,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DB Test 3 — IDEMPOTENCY_KEY_CONFLICT: same key different intent in real DB
// ═══════════════════════════════════════════════════════════════════════════════

describe('DB-backed: IDEMPOTENCY_KEY_CONFLICT across different intents', () => {
  it('rejects second payment with same key on different intent, produces no extra rows', async () => {
    const { createIntent, recordPayment } = buildUseCase(TEST_TENANT_ID);
    const sharedKey = `shared-conflict-key-${randomUUID()}`;

    // Create two separate intents
    const { intent: intentA } = await createIntent.execute({
      tenantId:     TEST_TENANT_ID,
      payableType:  'order',
      payableId:    `order-conflict-A-${randomUUID()}`,
      amountDue:    50000,
      allowPartial: false,
    });

    const { intent: intentB } = await createIntent.execute({
      tenantId:     TEST_TENANT_ID,
      payableType:  'order',
      payableId:    `order-conflict-B-${randomUUID()}`,
      amountDue:    30000,
      allowPartial: false,
    });

    // First payment on intent A — succeeds
    await recordPayment.execute({
      tenantId:        TEST_TENANT_ID,
      paymentIntentId: intentA.id,
      amount:          50000,
      method:          'cash',
      receivedAmount:  50000,
      idempotencyKey:  sharedKey,
    });

    const txCountAfterFirst = (await rawSql`
      SELECT id FROM payment_transactions WHERE tenant_id = ${TEST_TENANT_ID}::uuid
        AND payment_intent_id = ${intentA.id}::uuid
    `).length;

    // Second payment on intent B with same key — must conflict
    await assert.rejects(
      () => recordPayment.execute({
        tenantId:        TEST_TENANT_ID,
        paymentIntentId: intentB.id,
        amount:          30000,
        method:          'cash',
        receivedAmount:  30000,
        idempotencyKey:  sharedKey,
      }),
      (err: any) => err instanceof PaymentPolicyError && err.code === 'IDEMPOTENCY_KEY_CONFLICT',
      'Must throw IDEMPOTENCY_KEY_CONFLICT when same key is reused for different intent',
    );

    // No extra transaction or allocation rows created for intent B
    const txRowsB = await rawSql`
      SELECT id FROM payment_transactions WHERE tenant_id = ${TEST_TENANT_ID}::uuid
        AND payment_intent_id = ${intentB.id}::uuid
    `;
    assert.equal(txRowsB.length, 0, 'conflict must not create any tx rows for the conflicting intent');

    const allocRowsB = await rawSql`
      SELECT id FROM payment_allocations WHERE tenant_id = ${TEST_TENANT_ID}::uuid
        AND payment_intent_id = ${intentB.id}::uuid
    `;
    assert.equal(allocRowsB.length, 0, 'conflict must not create any allocation rows for the conflicting intent');
  });
});
