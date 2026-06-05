/**
 * Payment Engine Phase 7A — Xendit Sandbox Provider Tests
 *
 * All tests use mocked HTTP only — no real Xendit API calls.
 * The mock is injected via the XenditProvider constructor's optional `httpFetch` parameter.
 *
 * Test inventory (16 tests):
 *  1.  Provider disabled when XENDIT_SANDBOX_ENABLED not set
 *  2.  Provider disabled when secret key missing
 *  3.  Provider capabilities are correct for Phase 7A
 *  4.  createPayment sends Basic Auth with secret + ':' base64-encoded
 *  5.  createPayment maps REQUIRES_ACTION + REDIRECT_CUSTOMER/WEB_URL → requires_action + redirect_customer/WEB_URL
 *  6.  createPayment maps QR action → present_qr/QR_STRING
 *  7.  createPayment maps VA action → display_code/VA_NUMBER
 *  8.  createPayment maps SUCCEEDED → succeeded with succeededImmediately=true
 *  9.  createPayment maps FAILED → failed with safe failure reason
 * 10.  createPayment: non-2xx response returns failed without leaking secret
 * 11.  createPayment: network error throws controlled Error (no secret in message)
 * 12.  verifyWebhook: valid x-callback-token verifies true
 * 13.  verifyWebhook: invalid token verifies false
 * 14.  parseWebhook: payment.capture → succeeded
 * 15.  parseWebhook: payment.failure → failed with failure reason
 * 16.  parseWebhook: payment_request.expiry → ignored (Phase 7A policy)
 * 17.  Existing FakeGateway contract tests still pass (regression)
 */

import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

process.env['DATABASE_URL'] ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env['BETTER_AUTH_SECRET'] ||= 'test-secret-with-at-least-32-characters-ok';

import {
  XenditProvider,
  loadXenditSandboxConfig,
} from '@pos/infrastructure/payments/providers/XenditProvider';
import type { XenditSandboxConfig, FetchFn } from '@pos/infrastructure/payments/providers/XenditProvider';
import { FakeGatewayProvider } from '@pos/infrastructure/payments/providers/FakeGatewayProvider';
import type { CreateProviderPaymentInput, VerifyWebhookInput, ParseWebhookInput } from '@pos/domain/payments';

// ── Config fixture ─────────────────────────────────────────────────────────────

const TEST_CONFIG: XenditSandboxConfig = {
  secretKey: 'xnd_development_test_secret_key_12345',
  webhookToken: 'test-webhook-token-sandbox-abc123',
  apiBaseUrl: 'https://api.xendit.co',
  successReturnUrl: 'http://localhost:5000/payment/success',
  failureReturnUrl: 'http://localhost:5000/payment/failure',
};

// ── Mock HTTP helpers ──────────────────────────────────────────────────────────

type MockResponseBody = Record<string, unknown>;

function makeMockFetch(status: number, body: MockResponseBody): FetchFn {
  return async (_url, _init) => ({
    status,
    json: async () => body,
  });
}

/** Capture what the provider sends to Xendit for assertion */
interface CapturedRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

function makeCapturingFetch(
  status: number,
  body: MockResponseBody,
): { fetch: FetchFn; captured: CapturedRequest } {
  const captured: CapturedRequest = { url: '' };
  const fetch: FetchFn = async (url, init) => {
    captured.url = url;
    captured.method = init?.method;
    captured.headers = init?.headers;
    if (init?.body) {
      try { captured.body = JSON.parse(init.body); } catch { captured.body = {}; }
    }
    return { status, json: async () => body };
  };
  return { fetch, captured };
}

// ── Xendit response fixtures ───────────────────────────────────────────────────

const REQUIRES_ACTION_REDIRECT_RESPONSE: MockResponseBody = {
  payment_request_id: 'pr_test_redirect_001',
  reference_id: 'aurapos-pi_test001',
  status: 'REQUIRES_ACTION',
  actions: [
    {
      type: 'REDIRECT_CUSTOMER',
      descriptor: 'WEB_URL',
      url: 'https://checkout.xendit.co/pay/pr_test_redirect_001',
    },
  ],
  request_amount: 100000,
  currency: 'IDR',
};

const REQUIRES_ACTION_QR_RESPONSE: MockResponseBody = {
  payment_request_id: 'pr_test_qr_001',
  status: 'REQUIRES_ACTION',
  actions: [
    {
      type: 'PRESENT_TO_CUSTOMER',
      descriptor: 'QR_STRING',
      value: '00020101021226570011ID.CO.QRIS.WWW',
    },
  ],
};

const REQUIRES_ACTION_VA_RESPONSE: MockResponseBody = {
  payment_request_id: 'pr_test_va_001',
  status: 'REQUIRES_ACTION',
  actions: [
    {
      type: 'PRESENT_TO_CUSTOMER',
      descriptor: 'VA_NUMBER',
      value: '8800100000',
    },
  ],
};

const SUCCEEDED_RESPONSE: MockResponseBody = {
  payment_request_id: 'pr_test_succ_001',
  status: 'SUCCEEDED',
  actions: [],
};

const FAILED_RESPONSE: MockResponseBody = {
  payment_request_id: 'pr_test_fail_001',
  status: 'FAILED',
  failure_code: 'PAYMENT_DECLINED',
  failure_message: 'Card declined by issuer',
  actions: [],
};

const API_ERROR_RESPONSE: MockResponseBody = {
  error_code: 'INVALID_CHANNEL_CODE',
  message: 'The channel code provided is not supported.',
};

// ── Input fixtures ────────────────────────────────────────────────────────────

function makeQrisInput(overrides: Partial<CreateProviderPaymentInput> = {}): CreateProviderPaymentInput {
  return {
    paymentIntentId: 'pi_test001',
    amount: 100000,
    currency: 'IDR',
    method: 'qris',
    metadata: { xendit_channel_code: 'QRIS' },
    ...overrides,
  };
}

// ── Env var isolation ─────────────────────────────────────────────────────────

let savedEnv: Record<string, string | undefined> = {};
const XENDIT_ENV_KEYS = [
  'XENDIT_SANDBOX_ENABLED',
  'XENDIT_SECRET_KEY_SANDBOX',
  'XENDIT_WEBHOOK_TOKEN_SANDBOX',
  'XENDIT_API_BASE_URL',
  'XENDIT_PAYMENT_SUCCESS_RETURN_URL',
  'XENDIT_PAYMENT_FAILURE_RETURN_URL',
];

beforeEach(() => {
  savedEnv = {};
  for (const key of XENDIT_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of XENDIT_ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 1 — Provider disabled when XENDIT_SANDBOX_ENABLED not set
// ═════════════════════════════════════════════════════════════════════════════

describe('loadXenditSandboxConfig — disabled states', () => {
  it('returns null when XENDIT_SANDBOX_ENABLED is not set', () => {
    delete process.env['XENDIT_SANDBOX_ENABLED'];
    delete process.env['XENDIT_SECRET_KEY_SANDBOX'];
    const config = loadXenditSandboxConfig();
    assert.equal(config, null);
  });

  // Test 2 — Provider disabled when secret key missing
  it('returns null when XENDIT_SECRET_KEY_SANDBOX is missing', () => {
    process.env['XENDIT_SANDBOX_ENABLED'] = 'true';
    delete process.env['XENDIT_SECRET_KEY_SANDBOX'];
    const config = loadXenditSandboxConfig();
    assert.equal(config, null);
  });

  it('returns null when XENDIT_SANDBOX_ENABLED is false', () => {
    process.env['XENDIT_SANDBOX_ENABLED'] = 'false';
    process.env['XENDIT_SECRET_KEY_SANDBOX'] = 'xnd_development_key';
    const config = loadXenditSandboxConfig();
    assert.equal(config, null);
  });

  it('returns config when both enabled and key present', () => {
    process.env['XENDIT_SANDBOX_ENABLED'] = 'true';
    process.env['XENDIT_SECRET_KEY_SANDBOX'] = 'xnd_development_key';
    process.env['XENDIT_WEBHOOK_TOKEN_SANDBOX'] = 'tok123';
    const config = loadXenditSandboxConfig();
    assert.ok(config !== null);
    assert.equal(config!.secretKey, 'xnd_development_key');
    assert.equal(config!.webhookToken, 'tok123');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 3 — Provider capabilities
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider capabilities', () => {
  it('has correct Phase 7A capability matrix', () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const cap = provider.capabilities;

    assert.equal(provider.providerCode, 'xendit_sandbox');

    // Action type support
    assert.equal(cap.supportsRedirect, true);
    assert.equal(cap.supportsQr, true);
    assert.equal(cap.supportsVa, true);
    assert.equal(cap.supportsPaymentCode, false);

    // Immediate outcomes
    assert.equal(cap.canReturnImmediateSuccess, true);
    assert.equal(cap.canReturnImmediateFailure, true);

    // Provider-level refund/cancel — not in Phase 7A
    assert.equal(cap.canCancel, false);
    assert.equal(cap.canRefund, false);
    assert.equal(cap.supportsPartialRefund, false);
    assert.equal(cap.supportsMultiplePartialRefund, false);

    // Communication model
    assert.equal(cap.supportsWebhook, true);
    assert.equal(cap.supportsPolling, false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 4 — createPayment sends Basic Auth correctly
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider.createPayment — HTTP request shape', () => {
  it('sends Basic Auth header with secret + ":" base64-encoded', async () => {
    const { fetch, captured } = makeCapturingFetch(200, REQUIRES_ACTION_REDIRECT_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, fetch);

    await provider.createPayment(makeQrisInput());

    const expectedAuth = `Basic ${Buffer.from(`${TEST_CONFIG.secretKey}:`).toString('base64')}`;
    assert.equal(captured.headers?.['Authorization'], expectedAuth);
    assert.equal(captured.url, `${TEST_CONFIG.apiBaseUrl}/v3/payment_requests`);
    assert.equal(captured.method, 'POST');
  });

  it('sends correct request body fields', async () => {
    const { fetch, captured } = makeCapturingFetch(200, REQUIRES_ACTION_REDIRECT_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, fetch);

    await provider.createPayment(makeQrisInput({ amount: 75000 }));

    assert.equal(captured.body?.['type'], 'PAY');
    assert.equal(captured.body?.['country'], 'ID');
    assert.equal(captured.body?.['currency'], 'IDR');
    assert.equal(captured.body?.['request_amount'], 75000);
    assert.equal(captured.body?.['channel_code'], 'QRIS');
    assert.ok(captured.body?.['reference_id']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 5 — REQUIRES_ACTION + REDIRECT_CUSTOMER/WEB_URL mapping
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider.createPayment — status & action mapping', () => {
  it('maps REQUIRES_ACTION + REDIRECT_CUSTOMER/WEB_URL to requires_action + redirect_customer', async () => {
    const mockFetch = makeMockFetch(200, REQUIRES_ACTION_REDIRECT_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);

    const result = await provider.createPayment(makeQrisInput());

    assert.equal(result.status, 'requires_action');
    assert.equal(result.providerReference, 'pr_test_redirect_001');
    assert.equal(result.actions.length, 1);

    const action = result.actions[0]!;
    assert.equal(action.type, 'redirect_customer');
    assert.equal(action.descriptor, 'WEB_URL');
    assert.ok(action.value?.startsWith('https://'));

    // Legacy field derived from WEB_URL action
    assert.equal(result.providerPaymentUrl, action.value);
    assert.equal(result.providerQrString, null);
    assert.equal(result.succeededImmediately, false);
    assert.equal(result.failureReason, null);
  });

  // Test 6 — QR action mapping
  it('maps PRESENT_TO_CUSTOMER + QR_STRING to present_qr + QR_STRING', async () => {
    const mockFetch = makeMockFetch(200, REQUIRES_ACTION_QR_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);

    const result = await provider.createPayment(makeQrisInput());

    assert.equal(result.status, 'requires_action');
    assert.equal(result.actions.length, 1);

    const action = result.actions[0]!;
    assert.equal(action.type, 'present_qr');
    assert.equal(action.descriptor, 'QR_STRING');
    assert.ok(typeof action.value === 'string' && action.value.length > 0);

    // Legacy QR field
    assert.equal(result.providerQrString, action.value);
    assert.equal(result.providerPaymentUrl, null);
  });

  // Test 7 — VA action mapping
  it('maps PRESENT_TO_CUSTOMER + VA_NUMBER to display_code + VA_NUMBER', async () => {
    const mockFetch = makeMockFetch(200, REQUIRES_ACTION_VA_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);

    const result = await provider.createPayment(
      makeQrisInput({ method: 'bank_transfer', metadata: { xendit_channel_code: 'BCA' } }),
    );

    assert.equal(result.status, 'requires_action');
    assert.equal(result.actions.length, 1);

    const action = result.actions[0]!;
    assert.equal(action.type, 'display_code');
    assert.equal(action.descriptor, 'VA_NUMBER');
    assert.ok(typeof action.value === 'string');
  });

  // Test 8 — SUCCEEDED mapping
  it('maps SUCCEEDED to internal succeeded with succeededImmediately=true', async () => {
    const mockFetch = makeMockFetch(200, SUCCEEDED_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);

    const result = await provider.createPayment(makeQrisInput());

    assert.equal(result.status, 'succeeded');
    assert.equal(result.succeededImmediately, true);
    assert.equal(result.failureReason, null);
    assert.equal(result.providerReference, 'pr_test_succ_001');
  });

  // Test 9 — FAILED mapping
  it('maps FAILED to internal failed with safe failure reason', async () => {
    const mockFetch = makeMockFetch(200, FAILED_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);

    const result = await provider.createPayment(makeQrisInput());

    assert.equal(result.status, 'failed');
    assert.equal(result.succeededImmediately, false);
    assert.ok(typeof result.failureReason === 'string' && result.failureReason.length > 0);
    // Failure reason must NOT contain the secret key
    assert.equal(result.failureReason!.includes(TEST_CONFIG.secretKey), false);
  });

  // CANCELED/EXPIRED → failed (documented Phase 7A limitation)
  it('maps CANCELED to failed (Phase 7A policy)', async () => {
    const mockFetch = makeMockFetch(200, {
      payment_request_id: 'pr_test_canceled_001',
      status: 'CANCELED',
      actions: [],
    });
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);
    const result = await provider.createPayment(makeQrisInput());
    assert.equal(result.status, 'failed');
  });

  // Test 10 — non-2xx response returns failed without leaking secret
  it('non-2xx Xendit response returns status=failed without leaking secret', async () => {
    const mockFetch = makeMockFetch(422, API_ERROR_RESPONSE);
    const provider = new XenditProvider(TEST_CONFIG, mockFetch);

    const result = await provider.createPayment(makeQrisInput());

    assert.equal(result.status, 'failed');
    assert.ok(typeof result.failureReason === 'string');
    assert.equal(result.providerReference, null);
    // Secret must NOT appear in failure reason
    assert.equal(result.failureReason!.includes(TEST_CONFIG.secretKey), false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 11 — Network error throws controlled Error (no secret leakage)
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider.createPayment — network error handling', () => {
  it('network error throws controlled Error without leaking secret key', async () => {
    const failFetch: FetchFn = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:443');
    };
    const provider = new XenditProvider(TEST_CONFIG, failFetch);

    await assert.rejects(
      () => provider.createPayment(makeQrisInput()),
      (err: Error) => {
        assert.ok(err instanceof Error);
        // Error message must not leak the secret
        assert.equal(err.message.includes(TEST_CONFIG.secretKey), false);
        return true;
      },
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 12 & 13 — verifyWebhook
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider.verifyWebhook', () => {
  it('returns true for valid x-callback-token', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const input: VerifyWebhookInput = {
      rawPayload: '{"event":"payment.capture"}',
      signature: '',
      headers: { 'x-callback-token': TEST_CONFIG.webhookToken },
    };
    const result = await provider.verifyWebhook(input);
    assert.equal(result, true);
  });

  it('returns false for invalid token', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const input: VerifyWebhookInput = {
      rawPayload: '{"event":"payment.capture"}',
      signature: '',
      headers: { 'x-callback-token': 'wrong-token' },
    };
    const result = await provider.verifyWebhook(input);
    assert.equal(result, false);
  });

  it('returns false when webhookToken config is empty', async () => {
    const configNoToken: XenditSandboxConfig = { ...TEST_CONFIG, webhookToken: '' };
    const provider = new XenditProvider(configNoToken);
    const input: VerifyWebhookInput = {
      rawPayload: '{}',
      signature: '',
      headers: { 'x-callback-token': 'any-token' },
    };
    const result = await provider.verifyWebhook(input);
    assert.equal(result, false);
  });

  it('returns false when header is missing', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const input: VerifyWebhookInput = {
      rawPayload: '{}',
      signature: '',
      headers: {},
    };
    const result = await provider.verifyWebhook(input);
    assert.equal(result, false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Tests 14–16 — parseWebhook
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider.parseWebhook', () => {
  const baseInput = (event: string, extraData: Record<string, unknown> = {}): ParseWebhookInput => ({
    rawPayload: JSON.stringify({
      event,
      data: {
        payment_request_id: 'pr_webhook_test_001',
        reference_id: 'aurapos-pi_test001',
        status: 'SUCCEEDED',
        request_amount: 50000,
        currency: 'IDR',
        ...extraData,
      },
      created: '2026-01-01T00:00:00.000Z',
    }),
    headers: { 'x-callback-token': TEST_CONFIG.webhookToken },
  });

  // Test 14 — payment.capture → succeeded
  it('payment.capture parses to transactionStatus=succeeded', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const parsed = await provider.parseWebhook(baseInput('payment.capture'));

    assert.equal(parsed.provider, 'xendit_sandbox');
    assert.equal(parsed.transactionStatus, 'succeeded');
    assert.equal(parsed.isPaymentSuccess, true);
    assert.equal(parsed.isPaymentFailure, false);
    assert.equal(parsed.providerReference, 'pr_webhook_test_001');
    assert.equal(parsed.eventType, 'payment.capture');
    assert.equal(parsed.amount, 50000);
    // Deterministic event ID
    assert.equal(parsed.providerEventId, 'payment.capture:pr_webhook_test_001');
  });

  // Test 15 — payment.failure → failed with failure reason
  it('payment.failure parses to transactionStatus=failed with failure reason', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const parsed = await provider.parseWebhook(
      baseInput('payment.failure', {
        failure_code: 'INSUFFICIENT_BALANCE',
        failure_reason: 'Not enough balance',
      }),
    );

    assert.equal(parsed.transactionStatus, 'failed');
    assert.equal(parsed.isPaymentSuccess, false);
    assert.equal(parsed.isPaymentFailure, true);
    assert.ok(typeof parsed.failureReason === 'string' && parsed.failureReason.length > 0);
    assert.ok(parsed.failureReason!.includes('INSUFFICIENT_BALANCE'));
  });

  // Test 16 — payment_request.expiry → ignored (Phase 7A policy)
  it('payment_request.expiry parses to transactionStatus=ignored (Phase 7A policy)', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const parsed = await provider.parseWebhook(baseInput('payment_request.expiry'));

    assert.equal(parsed.transactionStatus, 'ignored');
    assert.equal(parsed.isPaymentSuccess, false);
    assert.equal(parsed.isPaymentFailure, false);
  });

  it('unknown event type parses to ignored', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const parsed = await provider.parseWebhook(baseInput('payment_request.unknown_event'));
    assert.equal(parsed.transactionStatus, 'ignored');
  });

  it('throws on invalid JSON payload', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    await assert.rejects(
      () => provider.parseWebhook({ rawPayload: 'not-json', headers: {} }),
      /not valid JSON/,
    );
  });

  it('throws when data.payment_request_id is missing', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const badPayload = JSON.stringify({ event: 'payment.capture', data: {} });
    await assert.rejects(
      () => provider.parseWebhook({ rawPayload: badPayload, headers: {} }),
      /payment_request_id/,
    );
  });

  it('rawData contains the full parsed payload', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const parsed = await provider.parseWebhook(baseInput('payment.capture'));
    assert.ok(parsed.rawData['event'] === 'payment.capture');
    assert.ok(typeof parsed.rawData['data'] === 'object');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Test 17 — FakeGateway regression (existing contract still works)
// ═════════════════════════════════════════════════════════════════════════════

describe('FakeGatewayProvider regression (Phase 7A must not break FakeGateway)', () => {
  it('FakeGatewayProvider default scenario returns pending with legacy fields', async () => {
    const fg = new FakeGatewayProvider();
    const result = await fg.createPayment({
      paymentIntentId: 'pi_regression',
      amount: 50000,
      currency: 'IDR',
      method: 'qris',
    });

    // Phase 6 backward-compat contract: default → pending, both legacy URLs set
    assert.equal(result.status, 'pending');
    assert.ok(typeof result.providerPaymentUrl === 'string');
    assert.ok(typeof result.providerQrString === 'string');
    assert.equal(result.succeededImmediately, false);
    assert.equal(result.failureReason, null);
  });

  it('FakeGatewayProvider capabilities are unaffected by XenditProvider existence', () => {
    const fg = new FakeGatewayProvider();
    assert.equal(fg.providerCode, 'fake_gateway');
    assert.equal(fg.capabilities.supportsWebhook, true);
    assert.equal(fg.capabilities.supportsRedirect, true);
    assert.equal(fg.capabilities.supportsQr, true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Additional — cancelPayment / refundPayment stubs
// ═════════════════════════════════════════════════════════════════════════════

describe('XenditProvider cancel/refund stubs (Phase 7A)', () => {
  it('cancelPayment returns success=false with clear message', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const result = await provider.cancelPayment({ providerReference: 'pr_x001' });
    assert.equal(result.success, false);
    assert.ok(typeof result.failureReason === 'string' && result.failureReason.length > 0);
  });

  it('refundPayment returns success=false with clear message', async () => {
    const provider = new XenditProvider(TEST_CONFIG);
    const result = await provider.refundPayment({ providerReference: 'pr_x001', amount: 10000 });
    assert.equal(result.success, false);
    assert.ok(typeof result.failureReason === 'string' && result.failureReason.length > 0);
  });
});
