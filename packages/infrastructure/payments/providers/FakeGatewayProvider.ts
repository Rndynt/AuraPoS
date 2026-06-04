import { randomBytes } from 'crypto';
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
 *   stays in `pending` state until `ConfirmFakeGatewayPayment` is called.
 * - `cancelPayment()` → `success: false`  (Phase 4 scope)
 * - `refundPayment()` → `success: false`  (Phase 4 scope)
 * - `verifyWebhook()` → `false`            (Phase 3 scope)
 * - `parseWebhook()` → throws              (Phase 3 scope)
 */
export class FakeGatewayProvider implements PaymentProvider {
  public readonly providerCode = 'fake_gateway';

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
   * Cancel is not supported in Phase 2.
   * Void/cancel support is planned for Phase 4.
   */
  async cancelPayment(_input: CancelProviderPaymentInput): Promise<CancelProviderPaymentResult> {
    return {
      success: false,
      failureReason: 'FakeGatewayProvider does not support cancel in Phase 2. Implement in Phase 4.',
    };
  }

  /**
   * Refund is not supported in Phase 2.
   * Refund support (outgoing transactions + intent recalculation) is planned for Phase 4.
   */
  async refundPayment(_input: RefundProviderPaymentInput): Promise<RefundProviderPaymentResult> {
    return {
      providerReference: null,
      success: false,
      failureReason: 'FakeGatewayProvider does not support refund in Phase 2. Implement in Phase 4.',
    };
  }

  /**
   * Webhook verification is not supported.
   * Real webhook signature verification is planned for Phase 3.
   */
  async verifyWebhook(_input: VerifyWebhookInput): Promise<boolean> {
    return false;
  }

  /**
   * Webhook parsing is not supported.
   * Real webhook processing (event storage + idempotent handler) is planned for Phase 3.
   */
  async parseWebhook(_input: ParseWebhookInput): Promise<ParsedProviderWebhook> {
    throw new Error(
      'FakeGatewayProvider does not support webhook parsing. Real webhook processing is Phase 3.',
    );
  }
}
