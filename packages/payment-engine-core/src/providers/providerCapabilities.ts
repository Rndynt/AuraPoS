/**
 * providerCapabilities — capability contract for standalone payment providers.
 *
 * TODO(Phase 8B): migrate from packages/domain/payments/provider.ts ProviderCapabilities.
 * Phase 8A: standalone definition for the payment-engine-core package.
 */

/**
 * PaymentProviderCapabilities — declares what a provider can do.
 *
 * Used by use cases to validate operations before calling provider methods.
 * For example: asserting `supportsWebhook=true` before registering a webhook URL.
 */
export interface PaymentProviderCapabilities {
  supportsRefund: boolean;
  supportsCancel: boolean;
  supportsPolling: boolean;
  supportsWebhook: boolean;
  supportedMethods: string[];
  supportsRedirect: boolean;
  supportsQr: boolean;
  supportsVa: boolean;
  supportsPaymentCode: boolean;
  supportsPartialRefund: boolean;
}
