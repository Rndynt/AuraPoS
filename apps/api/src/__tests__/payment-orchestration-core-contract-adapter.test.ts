/**
 * payment-orchestration-core-contract-adapter.test.ts
 *
 * Phase 8B — contract compatibility tests.
 *
 * Proves that embedded FakeGateway and Xendit provider outputs can be mapped
 * to @northflow/payment-orchestration-core shapes via PaymentProviderCoreAdapter
 * without any runtime behavior changes.
 *
 * All provider calls are mocked — no real Xendit network calls.
 * Run with:
 *   npx tsx --tsconfig apps/api/tsconfig.node.json --test \
 *     apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  toCoreProviderAction,
  toCoreProviderActions,
  toCoreProviderCapabilities,
} from '@pos/application/payments/adapters/PaymentProviderCoreAdapter';
import { FakeGatewayProvider } from '@pos/infrastructure/payments/providers/FakeGatewayProvider';
import type { ProviderAction, ProviderCapabilities } from '@pos/domain/payments';
import type {
  PaymentProviderAction,
  PaymentProviderCapabilities,
} from '@northflow/payment-orchestration-core';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_INTENT_ID = 'test-intent-abc123';
const FAKE_AMOUNT = 100_000;
const FAKE_CURRENCY = 'IDR';

function makeInput(scenario: string) {
  return {
    paymentIntentId: FAKE_INTENT_ID,
    amount: FAKE_AMOUNT,
    currency: FAKE_CURRENCY,
    method: 'qris' as const,
    metadata: { scenario },
  };
}

// ── FakeGateway action mapping tests ──────────────────────────────────────────

describe('PaymentProviderCoreAdapter — FakeGateway action mapping', () => {
  const provider = new FakeGatewayProvider();

  it('Test 1: FakeGateway qris action maps to core present_qr + QR_STRING', async () => {
    const result = await provider.createPayment(makeInput('qris'));
    assert.equal(result.actions.length, 1, 'qris scenario must produce exactly one action');

    const coreActions = toCoreProviderActions(result.actions);
    assert.equal(coreActions.length, 1);

    const action = coreActions[0] as PaymentProviderAction;
    assert.equal(action.type, 'present_qr', 'type must be present_qr');
    assert.equal(action.descriptor, 'QR_STRING', 'descriptor must be QR_STRING');
    assert.ok(typeof action.value === 'string' && action.value.length > 0, 'value must be non-empty QR string');
    assert.equal(action.url, null, 'url must be null for QR actions');
    assert.ok(action.label.length > 0, 'label must be non-empty');
  });

  it('Test 2: FakeGateway va action maps to core display_code + VA_NUMBER', async () => {
    const result = await provider.createPayment(makeInput('va'));
    assert.equal(result.actions.length, 1);

    const coreActions = toCoreProviderActions(result.actions);
    const action = coreActions[0] as PaymentProviderAction;
    assert.equal(action.type, 'display_code');
    assert.equal(action.descriptor, 'VA_NUMBER');
    assert.ok(typeof action.value === 'string' && action.value.length > 0, 'value must be VA number');
    assert.equal(action.url, null);
  });

  it('Test 3: FakeGateway redirect action maps to core redirect_customer + WEB_URL', async () => {
    const result = await provider.createPayment(makeInput('redirect'));
    assert.equal(result.actions.length, 1);

    const coreActions = toCoreProviderActions(result.actions);
    const action = coreActions[0] as PaymentProviderAction;
    assert.equal(action.type, 'redirect_customer');
    assert.equal(action.descriptor, 'WEB_URL');
    assert.ok(typeof action.value === 'string' && action.value.startsWith('https://'), 'value must be URL');
    assert.ok(typeof action.url === 'string' && action.url.startsWith('https://'), 'url must be set for WEB_URL');
    assert.equal(action.value, action.url, 'value and url must be identical for WEB_URL');
  });

  it('Test 3b: FakeGateway payment_code action maps to core display_code + PAYMENT_CODE', async () => {
    const result = await provider.createPayment(makeInput('payment_code'));
    assert.equal(result.actions.length, 1);

    const coreActions = toCoreProviderActions(result.actions);
    const action = coreActions[0] as PaymentProviderAction;
    assert.equal(action.type, 'display_code');
    assert.equal(action.descriptor, 'PAYMENT_CODE');
    assert.ok(typeof action.value === 'string' && action.value.length > 0);
    assert.equal(action.url, null);
  });

  it('Test 3c: FakeGateway immediate_success maps to empty actions array', async () => {
    const result = await provider.createPayment(makeInput('immediate_success'));
    assert.equal(result.actions.length, 0);

    const coreActions = toCoreProviderActions(result.actions);
    assert.equal(coreActions.length, 0);
    assert.equal(result.status, 'succeeded');
  });

  it('Test 3d: FakeGateway immediate_failure maps to empty actions array', async () => {
    const result = await provider.createPayment(makeInput('immediate_failure'));
    assert.equal(result.actions.length, 0);

    const coreActions = toCoreProviderActions(result.actions);
    assert.equal(coreActions.length, 0);
    assert.equal(result.status, 'failed');
  });
});

// ── Xendit action mapping tests (mocked responses) ────────────────────────────

describe('PaymentProviderCoreAdapter — Xendit action mapping (mocked)', () => {
  it('Test 4: Xendit redirect action maps to core redirect_customer + WEB_URL', () => {
    const xenditRedirectAction: ProviderAction = {
      type: 'redirect_customer',
      descriptor: 'WEB_URL',
      label: 'Complete payment',
      value: 'https://checkout.xendit.co/pay/test-123',
      expiresAt: null,
      metadata: { providerType: 'REDIRECT_CUSTOMER' },
    };

    const coreAction = toCoreProviderAction(xenditRedirectAction);
    assert.equal(coreAction.type, 'redirect_customer');
    assert.equal(coreAction.descriptor, 'WEB_URL');
    assert.equal(coreAction.value, 'https://checkout.xendit.co/pay/test-123');
    assert.equal(coreAction.url, 'https://checkout.xendit.co/pay/test-123', 'url must be set for WEB_URL');
  });

  it('Test 5: Xendit QR action maps to core present_qr + QR_STRING', () => {
    const xenditQrAction: ProviderAction = {
      type: 'present_qr',
      descriptor: 'QR_STRING',
      label: 'Scan QR code to pay',
      value: '00020101021226660014ID.LINKAJA.WWW0215ID10010056160370304QRIS',
      expiresAt: null,
      metadata: { providerType: 'PRESENT_TO_CUSTOMER' },
    };

    const coreAction = toCoreProviderAction(xenditQrAction);
    assert.equal(coreAction.type, 'present_qr');
    assert.equal(coreAction.descriptor, 'QR_STRING');
    assert.ok(typeof coreAction.value === 'string' && coreAction.value.length > 0);
    assert.equal(coreAction.url, null, 'url must be null for QR actions');
  });

  it('Test 6: Xendit VA action maps to core display_code + VA_NUMBER', () => {
    const xenditVaAction: ProviderAction = {
      type: 'display_code',
      descriptor: 'VA_NUMBER',
      label: 'Virtual Account Number',
      value: '8800123456',
      expiresAt: null,
      metadata: { providerType: 'PRESENT_TO_CUSTOMER' },
    };

    const coreAction = toCoreProviderAction(xenditVaAction);
    assert.equal(coreAction.type, 'display_code');
    assert.equal(coreAction.descriptor, 'VA_NUMBER');
    assert.equal(coreAction.value, '8800123456');
    assert.equal(coreAction.url, null);
  });
});

// ── Capability mapping tests ──────────────────────────────────────────────────

describe('PaymentProviderCoreAdapter — capability mapping', () => {
  it('Test 7: FakeGateway capability mapping preserves existing booleans', () => {
    const provider = new FakeGatewayProvider();
    const embedded = provider.capabilities;

    const coreCapabilities: PaymentProviderCapabilities = toCoreProviderCapabilities(embedded);

    // canCancel / canRefund renamed to supportsCancel / supportsRefund
    assert.equal(coreCapabilities.supportsCancel, embedded.canCancel, 'supportsCancel must match canCancel');
    assert.equal(coreCapabilities.supportsRefund, embedded.canRefund, 'supportsRefund must match canRefund');

    // Direct-mapped booleans must be preserved
    assert.equal(coreCapabilities.supportsPolling, embedded.supportsPolling);
    assert.equal(coreCapabilities.supportsWebhook, embedded.supportsWebhook);
    assert.equal(coreCapabilities.supportsRedirect, embedded.supportsRedirect);
    assert.equal(coreCapabilities.supportsQr, embedded.supportsQr);
    assert.equal(coreCapabilities.supportsVa, embedded.supportsVa);
    assert.equal(coreCapabilities.supportsPaymentCode, embedded.supportsPaymentCode);
    assert.equal(coreCapabilities.supportsPartialRefund, embedded.supportsPartialRefund);

    // Phase 8B optional fields
    assert.equal(coreCapabilities.supportsMultiplePartialRefund, embedded.supportsMultiplePartialRefund);
    assert.equal(coreCapabilities.canReturnImmediateSuccess, embedded.canReturnImmediateSuccess);
    assert.equal(coreCapabilities.canReturnImmediateFailure, embedded.canReturnImmediateFailure);

    // FakeGateway expected values
    assert.equal(coreCapabilities.supportsCancel, false);
    assert.equal(coreCapabilities.supportsRefund, false);
    assert.equal(coreCapabilities.supportsWebhook, true);
    assert.equal(coreCapabilities.supportsQr, true);
    assert.equal(coreCapabilities.supportsRedirect, true);
    assert.equal(coreCapabilities.supportsVa, true);
    assert.equal(coreCapabilities.canReturnImmediateSuccess, true);
    assert.equal(coreCapabilities.canReturnImmediateFailure, true);
  });

  it('Test 8: Xendit sandbox capability mapping preserves existing booleans', () => {
    const xenditCapabilities: ProviderCapabilities = {
      supportsRedirect: true,
      supportsQr: true,
      supportsVa: true,
      supportsPaymentCode: false,
      canReturnImmediateSuccess: true,
      canReturnImmediateFailure: true,
      canCancel: false,
      canRefund: false,
      supportsPartialRefund: false,
      supportsMultiplePartialRefund: false,
      supportsWebhook: true,
      supportsPolling: false,
    };

    const coreCapabilities = toCoreProviderCapabilities(xenditCapabilities);

    assert.equal(coreCapabilities.supportsCancel, false, 'xendit sandbox does not support cancel');
    assert.equal(coreCapabilities.supportsRefund, false, 'xendit sandbox does not support refund Phase 7A');
    assert.equal(coreCapabilities.supportsWebhook, true);
    assert.equal(coreCapabilities.supportsQr, true);
    assert.equal(coreCapabilities.supportsVa, true);
    assert.equal(coreCapabilities.supportsPaymentCode, false, 'xendit sandbox Phase 7A: payment code unvalidated');
    assert.equal(coreCapabilities.supportsRedirect, true);
    assert.equal(coreCapabilities.canReturnImmediateSuccess, true);
    assert.equal(coreCapabilities.canReturnImmediateFailure, true);
    assert.equal(coreCapabilities.supportsPolling, false);
    assert.equal(coreCapabilities.supportsMultiplePartialRefund, false);
  });

  it('Test 9: Manual provider capability mapping — no gateway capabilities', () => {
    const manualCapabilities: ProviderCapabilities = {
      canCancel: false,
      canRefund: false,
      supportsWebhook: false,
      supportsPolling: false,
      supportsRedirect: false,
      supportsQr: false,
      supportsVa: false,
      supportsPaymentCode: false,
      supportsPartialRefund: false,
      supportsMultiplePartialRefund: false,
      canReturnImmediateSuccess: true,
      canReturnImmediateFailure: false,
    };

    const coreCapabilities = toCoreProviderCapabilities(manualCapabilities);

    assert.equal(coreCapabilities.supportsCancel, false);
    assert.equal(coreCapabilities.supportsRefund, false);
    assert.equal(coreCapabilities.supportsWebhook, false);
    assert.equal(coreCapabilities.supportsQr, false);
    assert.equal(coreCapabilities.supportsVa, false);
    assert.equal(coreCapabilities.supportsRedirect, false);
    assert.equal(coreCapabilities.canReturnImmediateSuccess, true, 'manual always succeeds immediately');
    assert.equal(coreCapabilities.canReturnImmediateFailure, false);
  });
});

// ── Single action round-trip ──────────────────────────────────────────────────

describe('PaymentProviderCoreAdapter — toCoreProviderAction edge cases', () => {
  it('Test 10: action with null value maps to value=null, url=null', () => {
    const pollAction: ProviderAction = {
      type: 'poll',
      descriptor: 'NONE',
      label: 'Waiting for payment',
      value: null,
      expiresAt: null,
    };

    const core = toCoreProviderAction(pollAction);
    assert.equal(core.type, 'poll');
    assert.equal(core.descriptor, 'NONE');
    assert.equal(core.value, null);
    assert.equal(core.url, null);
  });

  it('Test 10b: embedded metadata and expiresAt are not propagated to core (by design)', async () => {
    const provider = new FakeGatewayProvider();
    const result = await provider.createPayment(makeInput('redirect'));
    const embedded = result.actions[0]!;

    const core = toCoreProviderAction(embedded);

    // Core shape must not have expiresAt or metadata keys
    assert.ok(!('expiresAt' in core), 'core action must not have expiresAt');
    assert.ok(!('metadata' in core), 'core action must not have metadata');
  });
});
