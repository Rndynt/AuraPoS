import { randomBytes, createHmac } from 'crypto';
import type {
  PaymentProvider,
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  CancelProviderPaymentInput,
  CancelProviderPaymentResult,
  RefundProviderPaymentInput,
  RefundProviderPaymentResult,
  VerifyWebhookInput,
  ParseWebhookInput,
  ParsedProviderWebhook,
} from '@pos/domain/payments';

/**
 * The default HMAC secret used in non-production environments when
 * FAKE_GATEWAY_WEBHOOK_SECRET env var is not set.
 *
 * ⚠️  NOT suitable for production — the name makes this intent clear.
 */
const DEFAULT_NON_PROD_SECRET = 'fake-gateway-test-secret-default-dev-only-NOT-for-prod';

/**
 * FakeGatewayProvider — dev/test-only simulated payment gateway.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  DO NOT use in production.  This provider has no real money movement.  │
 * │  It exists solely for local development and automated tests.           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Behavior
 * --------
 * - `providerCode = 'fake_gateway'`
 * - `createPayment()` generates a deterministic-looking fake reference, URL,
 *   and QR string.  `succeededImmediately` is always `false` — the transaction
 *   stays in `pending` state until `ConfirmFakeGatewayPayment` or a webhook
 *   event triggers the confirmation.
 * - `cancelPayment()` → `success: false`  (Phase 4 scope)
 * - `refundPayment()` → `success: false`  (Phase 4 scope)
 * - `verifyWebhook()` → HMAC-SHA256 via `x-fake-gateway-signature` header.
 *   Disabled (returns false) in production regardless of signature validity.
 * - `parseWebhook()` → parses event_id, event_type, provider_reference, etc.
 *
 * Webhook signature
 * -----------------
 * The provider signs the raw request body with HMAC-SHA256.
 * Secret resolution order:
 *   1. FAKE_GATEWAY_WEBHOOK_SECRET env var (all environments)
 *   2. DEFAULT_NON_PROD_SECRET constant (non-production only)
 *   3. No valid secret → signature verification fails
 *
 * Use `FakeGatewayProvider.computeSignature(rawBody)` in tests to generate
 * a valid signature for a given payload.
 *
 * Webhook payload shape (JSON)
 * ----------------------------
 * {
 *   "event_id":          "evt_fake_<random>",   // unique event identifier
 *   "event_type":        "payment.succeeded",   // | "payment.failed" | "payment.pending" | other
 *   "provider_reference": "fake_<intent>_<hex>", // matches tx.providerReference
 *   "status":            "succeeded",           // | "failed" | "pending"
 *   "failure_reason":    null,                  // string or null
 *   "metadata":          {}                     // any extra fields
 * }
 *
 * Event type → transaction status mapping
 * ----------------------------------------
 * "payment.succeeded" → transactionStatus: "succeeded"
 * "payment.failed"    → transactionStatus: "failed"
 * "payment.pending"   → transactionStatus: "pending"  (no state mutation)
 * anything else       → transactionStatus: "ignored"   (no state mutation)
 */
export class FakeGatewayProvider implements PaymentProvider {
  public readonly providerCode = 'fake_gateway';

  // ── Private helpers ──────────────────────────────────────────────────────

  private getWebhookSecret(): string | null {
    const envSecret = process.env.FAKE_GATEWAY_WEBHOOK_SECRET;
    if (envSecret) return envSecret;
    if (process.env.NODE_ENV !== 'production') return DEFAULT_NON_PROD_SECRET;
    return null;
  }

  // ── PaymentProvider interface ─────────────────────────────────────────────

  async createPayment(input: CreateProviderPaymentInput): Promise<CreateProviderPaymentResult> {
    const suffix = randomBytes(4).toString('hex');
    const providerReference = `fake_${input.paymentIntentId}_${suffix}`;
    const providerPaymentUrl = `https://fake-gateway.local/pay/${providerReference}`;
    const providerQrString = `FAKE_QR:${providerReference}:${input.amount}:${input.currency}`;

    return {
      providerReference,
      providerPaymentUrl,
      providerQrString,
      succeededImmediately: false,
      failureReason: null,
    };
  }

  /**
   * Cancel is not supported in Phase 3.
   * Void/cancel support is planned for Phase 4.
   */
  async cancelPayment(_input: CancelProviderPaymentInput): Promise<CancelProviderPaymentResult> {
    return {
      success: false,
      failureReason: 'FakeGatewayProvider does not support cancel. Implement in Phase 4.',
    };
  }

  /**
   * Refund is not supported in Phase 3.
   * Refund support (outgoing transactions + intent recalculation) is planned for Phase 4.
   */
  async refundPayment(_input: RefundProviderPaymentInput): Promise<RefundProviderPaymentResult> {
    return {
      providerReference: null,
      success: false,
      failureReason: 'FakeGatewayProvider does not support refund. Implement in Phase 4.',
    };
  }

  /**
   * Verify the HMAC-SHA256 signature in `x-fake-gateway-signature`.
   *
   * Returns false in production (unconditionally) to prevent accidental
   * webhook processing by a leaked fake-gateway endpoint.
   *
   * Returns false if:
   *  - NODE_ENV === 'production'
   *  - No secret is available
   *  - The provided signature does not match
   */
  async verifyWebhook(input: VerifyWebhookInput): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') return false;

    const secret = this.getWebhookSecret();
    if (!secret) return false;

    const signature =
      input.signature ||
      input.headers['x-fake-gateway-signature'] ||
      '';

    if (!signature) return false;

    const expected = FakeGatewayProvider.computeSignature(input.rawPayload, secret);
    return signature === expected;
  }

  /**
   * Parse a fake gateway webhook payload.
   *
   * Expects JSON with:
   *   event_id, event_type, provider_reference, status, failure_reason?, metadata?
   *
   * Throws if:
   *  - The payload is not valid JSON
   *  - Required fields (event_id, event_type, provider_reference) are missing
   */
  async parseWebhook(input: ParseWebhookInput): Promise<ParsedProviderWebhook> {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(input.rawPayload);
    } catch {
      throw new Error('FakeGatewayProvider.parseWebhook: payload is not valid JSON');
    }

    const providerEventId = body['event_id'];
    const eventType = body['event_type'];
    const providerReference = body['provider_reference'];

    if (typeof providerEventId !== 'string' || !providerEventId) {
      throw new Error('FakeGatewayProvider.parseWebhook: missing or invalid "event_id"');
    }
    if (typeof eventType !== 'string' || !eventType) {
      throw new Error('FakeGatewayProvider.parseWebhook: missing or invalid "event_type"');
    }
    if (typeof providerReference !== 'string' || !providerReference) {
      throw new Error('FakeGatewayProvider.parseWebhook: missing or invalid "provider_reference"');
    }

    // Map event_type to canonical transactionStatus
    let transactionStatus: ParsedProviderWebhook['transactionStatus'];
    switch (eventType) {
      case 'payment.succeeded':
        transactionStatus = 'succeeded';
        break;
      case 'payment.failed':
        transactionStatus = 'failed';
        break;
      case 'payment.pending':
        transactionStatus = 'pending';
        break;
      default:
        transactionStatus = 'ignored';
        break;
    }

    const failureReason =
      typeof body['failure_reason'] === 'string' ? body['failure_reason'] : null;

    const metadata =
      body['metadata'] && typeof body['metadata'] === 'object' && !Array.isArray(body['metadata'])
        ? (body['metadata'] as Record<string, unknown>)
        : null;

    return {
      provider: this.providerCode,
      providerEventId,
      providerReference,
      eventType,
      transactionStatus,
      failureReason,
      metadata,
      // Legacy convenience fields — derived from transactionStatus
      isPaymentSuccess: transactionStatus === 'succeeded',
      isPaymentFailure: transactionStatus === 'failed',
      amount: typeof body['amount'] === 'number' ? body['amount'] : null,
      rawData: body,
    };
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /**
   * Compute the HMAC-SHA256 signature for a given raw payload.
   *
   * Used in tests and dev tooling to generate a valid signature without having
   * to hand-craft the HMAC value.
   *
   * @param rawPayload  The raw request body string (same bytes the server receives).
   * @param secret      Optional secret — defaults to the non-prod constant.
   *                    Pass the value of FAKE_GATEWAY_WEBHOOK_SECRET if you set it.
   */
  static computeSignature(rawPayload: string, secret?: string): string {
    const s = secret ?? DEFAULT_NON_PROD_SECRET;
    return createHmac('sha256', s).update(rawPayload).digest('hex');
  }
}
