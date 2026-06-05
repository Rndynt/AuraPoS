/**
 * FakeGateway E2E Smoke Test Script
 *
 * Phase 6.6 — FakeGateway End-to-End Smoke & Dev Testing
 *             (Refundability + Intent Status + HMAC Webhook HTTP smoke)
 *
 * Runs end-to-end HTTP assertions against a LIVE server (default: localhost:5000).
 * Tests all FakeGateway scenarios through actual Payment Engine API endpoints.
 *
 * ── IMPORTANT ────────────────────────────────────────────────────────────────
 * FakeGateway is NOT a Midtrans, Xendit, or Stripe emulator.
 * It is the golden contract provider for local/dev/test flows ONLY.
 * This script must NEVER be run against a production server.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ── Prerequisites ─────────────────────────────────────────────────────────────
 * 1. The server must be running with NODE_ENV != production:
 *      npm run dev
 *
 * 2. Set PAYMENT_ENGINE_SMOKE_TEST=true to enable this script:
 *      export PAYMENT_ENGINE_SMOKE_TEST=true
 *
 * 3. Set PAYMENT_ENGINE_SERVICE_TOKEN (32+ chars, matching server config):
 *      export PAYMENT_ENGINE_SERVICE_TOKEN="my-dev-smoke-test-token-32chars-min"
 *
 * ── Run command ───────────────────────────────────────────────────────────────
 *   PAYMENT_ENGINE_SMOKE_TEST=true \
 *   PAYMENT_ENGINE_SERVICE_TOKEN="my-dev-smoke-test-token-32chars-min" \
 *   node_modules/.bin/tsx --tsconfig apps/api/tsconfig.node.json \
 *   apps/api/src/scripts/payment-engine/fakegateway-smoke.ts
 *
 * Or via npm script (if configured):
 *   PAYMENT_ENGINE_SMOKE_TEST=true \
 *   PAYMENT_ENGINE_SERVICE_TOKEN="..." \
 *   npm run payment:fakegateway:smoke
 */

import '../../register-paths';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// ── Safety guard — must be explicitly enabled ─────────────────────────────────

if (process.env.PAYMENT_ENGINE_SMOKE_TEST !== 'true') {
  console.error(
    '\n❌  PAYMENT_ENGINE_SMOKE_TEST is not set to "true".\n' +
    '    This script only runs with explicit opt-in:\n\n' +
    '      export PAYMENT_ENGINE_SMOKE_TEST=true\n\n' +
    '    Do NOT run against production.\n',
  );
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error(
    '\n❌  This script must not run with NODE_ENV=production.\n' +
    '    FakeGateway endpoints are hard-disabled in production.\n',
  );
  process.exit(1);
}

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:5000';
const SERVICE_TOKEN = process.env.PAYMENT_ENGINE_SERVICE_TOKEN ?? '';

if (!SERVICE_TOKEN || SERVICE_TOKEN.length < 32) {
  console.error(
    '\n❌  PAYMENT_ENGINE_SERVICE_TOKEN is not set or is shorter than 32 characters.\n' +
    '    Export it before running:\n\n' +
    '      export PAYMENT_ENGINE_SERVICE_TOKEN="my-dev-smoke-test-token-32chars-min"\n\n' +
    '    The server must also have the same token configured.\n',
  );
  process.exit(1);
}

// ── DB setup: find or create a fakegateway-smoke tenant ──────────────────────
// Dynamic imports are used here instead of static top-level imports so that
// DB modules are never loaded when the safety guards above exit early.
// In ESM/TypeScript, static imports are evaluated before the module body runs,
// meaning the DB connection would be initialized even if NODE_ENV=production
// or PAYMENT_ENGINE_SMOKE_TEST is not set — defeating the safety guards.

const { db } = await import('@pos/infrastructure/database');
const { tenants } = await import('@shared/schema');
const { eq } = await import('drizzle-orm');

const existing = await db
  .select({ id: tenants.id })
  .from(tenants)
  .where(eq(tenants.slug, 'fakegateway-smoke'))
  .limit(1);

let tenantId: string;
if (existing.length > 0) {
  tenantId = existing[0].id;
  console.log(`Found existing fakegateway-smoke tenant: ${tenantId}`);
} else {
  const [t] = await db.insert(tenants).values({
    name: 'FakeGateway Smoke Test Tenant',
    slug: 'fakegateway-smoke',
    businessType: 'CAFE_RESTAURANT',
    planTier: 'free',
    subscriptionStatus: 'active',
    timezone: 'UTC',
    currency: 'IDR',
    locale: 'id-ID',
    isActive: true,
  }).returning({ id: tenants.id });
  tenantId = t.id;
  console.log(`Created fakegateway-smoke tenant: ${tenantId}`);
}

console.log(`\n🚀 FakeGateway E2E Smoke Test`);
console.log(`   BASE_URL  = ${BASE}`);
console.log(`   TENANT_ID = ${tenantId}`);
console.log(`   TOKEN     = ${SERVICE_TOKEN.slice(0, 8)}...\n`);

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: object,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'x-payment-engine-service-token': SERVICE_TOKEN,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ── Result tracking ───────────────────────────────────────────────────────────

type ScenarioResult = {
  name: string;
  passed: boolean;
  error?: string;
};

const results: ScenarioResult[] = [];
let failed = 0;

function pass(name: string) {
  results.push({ name, passed: true });
  console.log(`  ✅ ${name}`);
}

function fail(name: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  results.push({ name, passed: false, error: message });
  console.error(`  ❌ ${name}: ${message}`);
  failed++;
}

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

// ── Helper: create a fresh intent ─────────────────────────────────────────────

async function createIntent(amountDue = 100_000, allowPartial = false): Promise<string> {
  const idem = `fgsmoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const r = await api('POST', '/api/payment-engine/intents', {
    payable_type: 'order',
    payable_id: `smoke-order-${idem}`,
    amount_due: amountDue,
    allow_partial: allowPartial,
    idempotency_key: idem,
  });
  assert.equal(r.status, 201, `create intent → ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.data.id as string;
}

// ── Helper: create gateway payment ────────────────────────────────────────────

async function createGatewayPayment(intentId: string, scenario: string, amount = 100_000) {
  return api('POST', `/api/payment-engine/intents/${intentId}/gateway-payments`, {
    provider: 'fake_gateway',
    method: 'qris',
    amount,
    metadata: scenario === 'default' ? {} : { scenario },
  });
}

// ── Scenario tests ────────────────────────────────────────────────────────────

console.log('── Scenario: default + fake confirm succeeded ──');
await run('default: tx status=pending, legacy fields set, providerActions=[]', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'default');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const tx = r.body.data.transaction;
  assert.equal(tx.status, 'pending');
  assert.ok(tx.providerReference, 'providerReference must be set');
  assert.ok(r.body.data.providerActions, 'providerActions must exist');
  assert.equal(r.body.data.providerActions.length, 0, 'default: providerActions must be empty');
});

await run('default + confirm succeeded: intent becomes paid', async () => {
  const intentId = await createIntent();
  const gwR = await createGatewayPayment(intentId, 'default');
  const ref = gwR.body.data.transaction.providerReference as string;
  assert.ok(ref, 'providerReference required for confirm');

  const confirmR = await api('POST', '/api/payment-engine/fake-gateway/confirm', {
    provider_reference: ref,
    status: 'succeeded',
  });
  assert.equal(confirmR.status, 200, JSON.stringify(confirmR.body));
  assert.equal(confirmR.body.data.transaction.status, 'succeeded');
  assert.equal(confirmR.body.data.intent.status, 'paid');
  assert.equal(confirmR.body.data.intent.amountPaid, 100_000);
});

console.log('\n── Scenario: qris ──');
await run('qris: status=requires_action, providerActions[0].descriptor=QR_STRING', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'qris');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const tx = r.body.data.transaction;
  assert.equal(tx.status, 'requires_action');
  const actions = r.body.data.providerActions;
  assert.ok(Array.isArray(actions) && actions.length > 0, 'qris: must have providerActions');
  assert.equal(actions[0].descriptor, 'QR_STRING');
  assert.equal(actions[0].type, 'present_qr');
  assert.ok(actions[0].value?.startsWith('FAKE_QR:'), 'qris value must start with FAKE_QR:');
});

await run('qris + confirm succeeded: intent paid', async () => {
  const intentId = await createIntent();
  const gwR = await createGatewayPayment(intentId, 'qris');
  const ref = gwR.body.data.transaction.providerReference as string;
  const confirmR = await api('POST', '/api/payment-engine/fake-gateway/confirm', {
    provider_reference: ref,
    status: 'succeeded',
  });
  assert.equal(confirmR.body.data.intent.status, 'paid');
});

console.log('\n── Scenario: va requires_action ──');
await run('va: status=requires_action, providerActions[0].descriptor=VA_NUMBER', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'va');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'requires_action');
  const actions = r.body.data.providerActions;
  assert.ok(Array.isArray(actions) && actions.length > 0, 'va: must have providerActions');
  assert.equal(actions[0].descriptor, 'VA_NUMBER');
  assert.equal(actions[0].type, 'display_code');
});

console.log('\n── Scenario: payment_code requires_action ──');
await run('payment_code: status=requires_action, descriptor=PAYMENT_CODE', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'payment_code');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'requires_action');
  const actions = r.body.data.providerActions;
  assert.ok(Array.isArray(actions) && actions.length > 0, 'payment_code: must have providerActions');
  assert.equal(actions[0].descriptor, 'PAYMENT_CODE');
  assert.equal(actions[0].type, 'display_code');
});

console.log('\n── Scenario: redirect requires_action ──');
await run('redirect: status=requires_action, descriptor=WEB_URL', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'redirect');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'requires_action');
  const actions = r.body.data.providerActions;
  assert.ok(Array.isArray(actions) && actions.length > 0, 'redirect: must have providerActions');
  assert.equal(actions[0].descriptor, 'WEB_URL');
  assert.equal(actions[0].type, 'redirect_customer');
});

console.log('\n── Scenario: immediate_success ──');
await run('immediate_success: tx=succeeded, intent=paid, immediateSuccess=true', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'immediate_success');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'succeeded');
  assert.equal(r.body.data.intent.status, 'paid');
  assert.equal(r.body.data.intent.amountPaid, 100_000);
  assert.equal(r.body.data.immediateSuccess, true);
  assert.equal(r.body.data.providerActions.length, 0);
});

console.log('\n── Scenario: immediate_failure ──');
await run('immediate_failure: tx=failed, intent=requires_payment, amountPaid=0', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'immediate_failure');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'failed');
  assert.ok(r.body.data.transaction.failureReason, 'failureReason must be set');
  assert.equal(r.body.data.intent.status, 'requires_payment');
  assert.equal(r.body.data.intent.amountPaid, 0);
});

console.log('\n── Scenario: pending_expiry ──');
await run('pending_expiry: requires_action, WEB_URL + expiresAt set', async () => {
  const intentId = await createIntent();
  const r = await createGatewayPayment(intentId, 'pending_expiry');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'requires_action');
  const actions = r.body.data.providerActions;
  assert.ok(Array.isArray(actions) && actions.length > 0, 'pending_expiry: must have providerActions');
  assert.equal(actions[0].descriptor, 'WEB_URL');
  assert.ok(actions[0].expiresAt, 'expiresAt must be set on pending_expiry action');
});

console.log('\n── Scenario: fake confirm failed ──');
await run('confirm failed: tx=failed, intent unchanged (requires_payment)', async () => {
  const intentId = await createIntent();
  const gwR = await createGatewayPayment(intentId, 'default');
  const ref = gwR.body.data.transaction.providerReference as string;
  const r = await api('POST', '/api/payment-engine/fake-gateway/confirm', {
    provider_reference: ref,
    status: 'failed',
    failure_reason: 'Insufficient funds (smoke test)',
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'failed');
  assert.equal(r.body.data.intent.status, 'requires_payment');
  assert.equal(r.body.data.intent.amountPaid, 0);
});

console.log('\n── Scenario: void pending/requires_action ──');
await run('void pending tx: tx=voided', async () => {
  const intentId = await createIntent();
  const gwR = await createGatewayPayment(intentId, 'default');
  const txId = gwR.body.data.transaction.id as string;
  const r = await api('POST', `/api/payment-engine/transactions/${txId}/void`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'voided');
});

await run('void requires_action tx: tx=voided', async () => {
  const intentId = await createIntent();
  const gwR = await createGatewayPayment(intentId, 'qris');
  const txId = gwR.body.data.transaction.id as string;
  const r = await api('POST', `/api/payment-engine/transactions/${txId}/void`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.transaction.status, 'voided');
});

console.log('\n── Scenario: refund succeeded transaction ──');
await run('refund succeeded tx: refund tx created, intent status updated', async () => {
  const intentId = await createIntent();
  const gwR = await createGatewayPayment(intentId, 'default');
  const ref = gwR.body.data.transaction.providerReference as string;
  const txId = gwR.body.data.transaction.id as string;

  // Confirm first to make succeeded
  await api('POST', '/api/payment-engine/fake-gateway/confirm', {
    provider_reference: ref,
    status: 'succeeded',
  });

  const r = await api('POST', `/api/payment-engine/transactions/${txId}/refund`, {
    amount: 100_000,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.data.refundTransaction.status, 'succeeded');
  assert.equal(r.body.data.refundTransaction.direction, 'outgoing');
  assert.ok(
    ['refunded', 'partially_refunded'].includes(r.body.data.intent.status),
    `intent status must be refunded or partially_refunded, got: ${r.body.data.intent.status}`,
  );
});

console.log('\n── Reconciliation dry-run endpoints ──');

await run('reconciliation/stale-transactions: returns 200', async () => {
  const r = await api('GET', '/api/payment-engine/reconciliation/stale-transactions');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.success, true);
});

await run('reconciliation/reprocess-stale-events (dry_run=true): returns 200', async () => {
  const r = await api('POST', '/api/payment-engine/reconciliation/reprocess-stale-events', {
    dry_run: true,
    cutoff_minutes: 30,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.success, true);
});

await run('reconciliation/expire-stale-transactions (dry_run=true): returns 200', async () => {
  const r = await api('POST', '/api/payment-engine/reconciliation/expire-stale-transactions', {
    dry_run: true,
    cutoff_minutes: 60,
    provider: 'fake_gateway',
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.success, true);
});

await run('reconciliation/reconcile-intent-totals (dry_run=true): returns 200', async () => {
  const intentId = await createIntent();
  const r = await api('POST', '/api/payment-engine/reconciliation/reconcile-intent-totals', {
    intent_ids: [intentId],
    dry_run: true,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.success, true);
});

console.log('\n── Auth / security guards ──');

await run('wrong service token → 401 INVALID_SERVICE_TOKEN', async () => {
  const r = await fetch(`${BASE}/api/payment-engine/intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'x-payment-engine-service-token': 'wrong-token',
    },
    body: JSON.stringify({ payable_type: 'order', payable_id: 'x', amount_due: 1000 }),
  });
  const json = await r.json() as any;
  assert.equal(r.status, 401, JSON.stringify(json));
  assert.equal(json.code, 'INVALID_SERVICE_TOKEN');
});

await run('no auth → 401', async () => {
  const r = await fetch(`${BASE}/api/payment-engine/intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ payable_type: 'order', payable_id: 'x', amount_due: 1000 }),
  });
  assert.equal(r.status, 401);
});

// ── HMAC webhook helper ───────────────────────────────────────────────────────
// Webhook requests use HMAC-SHA256 only — NO service token, NO session.

const WEBHOOK_SECRET =
  process.env.FAKE_GATEWAY_WEBHOOK_SECRET ??
  'fake-gateway-test-secret-default-dev-only-NOT-for-prod';

function computeHmac(rawBody: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
}

/**
 * Send a raw webhook request to /api/payment-engine/webhooks/fake_gateway.
 * Uses HMAC-SHA256 signature only — no service token, no session.
 * Pass `overrideSignature` to inject a deliberately wrong sig for rejection tests.
 */
async function webhookApi(
  body: object,
  overrideSignature?: string,
): Promise<{ status: number; body: any }> {
  const raw = JSON.stringify(body);
  const sig = overrideSignature ?? computeHmac(raw);
  const res = await fetch(`${BASE}/api/payment-engine/webhooks/fake_gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fake-gateway-signature': sig,
    },
    body: raw,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

// ── Phase 6.6 — HMAC Webhook HTTP Smoke ──────────────────────────────────────

console.log('\n── Phase 6.6: HMAC Webhook HTTP smoke ──');

// Persist providerRef so we can reuse intentId for refundability + status tests.
let webhookIntentId: string;
let webhookProviderRef: string;

await run('HMAC webhook setup: create intent + qris gateway payment', async () => {
  webhookIntentId = await createIntent(100_000);
  const gwR = await createGatewayPayment(webhookIntentId, 'qris');
  assert.equal(gwR.status, 200, JSON.stringify(gwR.body));
  webhookProviderRef = gwR.body.data.transaction.providerReference as string;
  assert.ok(webhookProviderRef, 'providerReference must be set for webhook test');
});

await run('HMAC webhook: payment.succeeded → outcome=processed, tx=succeeded', async () => {
  const eventId = `smoke-evt-${Date.now()}`;
  const payload = {
    event_id: eventId,
    event_type: 'payment.succeeded',
    provider_reference: webhookProviderRef,
    amount: 100_000,
  };
  const r = await webhookApi(payload);
  assert.equal(r.status, 200, `webhook succeeded → ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.success, true);
  assert.equal(r.body.data.outcome, 'processed');
});

await run('HMAC webhook idempotent replay: same event_id → outcome=idempotent_replay', async () => {
  // Use the SAME event_id as the previous test to exercise idempotency
  const eventId = `smoke-evt-idempotent-${Date.now()}`;
  const payload = {
    event_id: eventId,
    event_type: 'payment.succeeded',
    provider_reference: webhookProviderRef,
    amount: 100_000,
  };
  // Send first time
  const r1 = await webhookApi(payload);
  // Send SAME payload a second time
  const r2 = await webhookApi(payload);
  // First call should be processed or idempotent_replay (transaction already succeeded via prior test)
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  // Second identical event_id must be idempotent_replay
  assert.equal(r2.status, 200, JSON.stringify(r2.body));
  assert.equal(r2.body.data.outcome, 'idempotent_replay');
});

await run('HMAC webhook invalid signature → 401', async () => {
  const payload = {
    event_id: `smoke-badsig-${Date.now()}`,
    event_type: 'payment.succeeded',
    provider_reference: webhookProviderRef,
    amount: 100_000,
  };
  const r = await webhookApi(payload, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
  assert.equal(r.status, 401, `bad sig must return 401, got ${r.status}: ${JSON.stringify(r.body)}`);
});

// ── Phase 6.6 — GET /intents/:id/status ──────────────────────────────────────

console.log('\n── Phase 6.6: GET /intents/:id/status ──');

await run('intent status: fresh intent → isTerminal=false, canRetryPayment=true', async () => {
  const freshId = await createIntent();
  const r = await api('GET', `/api/payment-engine/intents/${freshId}/status`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.isTerminal, false);
  assert.equal(r.body.data.canRetryPayment, true);
  assert.equal(r.body.data.requiresAction, false);
  assert.equal(r.body.data.latestTransaction, null);
  assert.deepEqual(r.body.data.providerActions, []);
});

await run('intent status: after HMAC webhook succeeded → isTerminal=true, canRetryPayment=false', async () => {
  const r = await api('GET', `/api/payment-engine/intents/${webhookIntentId}/status`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.isTerminal, true);
  assert.equal(r.body.data.canRetryPayment, false);
  assert.equal(r.body.data.requiresAction, false);
  assert.equal(r.body.data.intent.status, 'paid');
  assert.ok(r.body.data.latestTransaction, 'latestTransaction must be set');
  assert.equal(r.body.data.latestTransaction.status, 'succeeded');
});

await run('intent status: requires_action tx → requiresAction=true', async () => {
  const id = await createIntent();
  await createGatewayPayment(id, 'qris');
  const r = await api('GET', `/api/payment-engine/intents/${id}/status`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.requiresAction, true);
  assert.equal(r.body.data.isTerminal, false);
  assert.equal(r.body.data.canRetryPayment, true);
});

await run('intent status: unknown intent → 404', async () => {
  const r = await api('GET', '/api/payment-engine/intents/00000000-0000-0000-0000-000000000000/status');
  assert.equal(r.status, 404, JSON.stringify(r.body));
});

// ── Phase 6.6 — GET /intents/:id/refundability ───────────────────────────────

console.log('\n── Phase 6.6: GET /intents/:id/refundability ──');

await run('refundability: fresh intent (no txs) → totalRefundable=0', async () => {
  const freshId = await createIntent();
  const r = await api('GET', `/api/payment-engine/intents/${freshId}/refundability`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.totalRefundable, 0);
  assert.deepEqual(r.body.data.transactions, []);
});

await run('refundability: paid intent (after HMAC webhook) → totalRefundable=100000', async () => {
  const r = await api('GET', `/api/payment-engine/intents/${webhookIntentId}/refundability`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.data.totalRefundable, 100_000);
  const refundableTxs = r.body.data.transactions.filter((t: any) => t.canRefund);
  assert.equal(refundableTxs.length, 1);
  assert.equal(refundableTxs[0].refundableRemaining, 100_000);
  assert.equal(refundableTxs[0].refundedAmount, 0);
  assert.equal(refundableTxs[0].amount, 100_000);
});

await run('refundability: after refund → totalRefundable reduced', async () => {
  // Use the HMAC-webhook intent which is paid + refundable
  const refR = await api(
    'GET', `/api/payment-engine/intents/${webhookIntentId}/refundability`,
  );
  assert.equal(refR.status, 200);
  const txRow = refR.body.data.transactions.find((t: any) => t.canRefund);
  assert.ok(txRow, 'must have a refundable transaction');
  const txId = txRow.transactionId;

  // Issue a partial refund
  const partialR = await api(`POST`, `/api/payment-engine/transactions/${txId}/refund`, {
    amount: 25_000,
  });
  assert.equal(partialR.status, 201, JSON.stringify(partialR.body));

  // Re-check refundability
  const afterR = await api('GET', `/api/payment-engine/intents/${webhookIntentId}/refundability`);
  assert.equal(afterR.status, 200, JSON.stringify(afterR.body));
  assert.equal(afterR.body.data.totalRefundable, 75_000);
  const row = afterR.body.data.transactions.find((t: any) => t.transactionId === txId);
  assert.ok(row);
  assert.equal(row.refundedAmount, 25_000);
  assert.equal(row.refundableRemaining, 75_000);
});

await run('refundability: unknown intent → 404', async () => {
  const r = await api('GET', '/api/payment-engine/intents/00000000-0000-0000-0000-000000000000/refundability');
  assert.equal(r.status, 404, JSON.stringify(r.body));
});

// ── Summary table ─────────────────────────────────────────────────────────────

const total = results.length;
const passed = results.filter(r => r.passed).length;

console.log('\n════════════════════════════════════════════════════════════');
console.log('  FakeGateway E2E Smoke Test — Summary');
console.log('════════════════════════════════════════════════════════════');

for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`  ${icon}  ${r.name}${r.error ? `\n       Error: ${r.error}` : ''}`);
}

console.log('────────────────────────────────────────────────────────────');
console.log(`  Passed: ${passed} / ${total}`);
if (failed > 0) {
  console.log(`  Failed: ${failed}`);
  console.log('\n❌  Smoke test FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅  All FakeGateway smoke tests passed!\n');
  process.exit(0);
}
