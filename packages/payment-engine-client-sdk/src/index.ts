/**
 * @pos/payment-engine-client-sdk — Phase 8A Public API
 *
 * Typed HTTP client for the payment-engine-service standalone API.
 *
 * Features:
 * - Fetch-compatible (Node 18+ / modern browsers)
 * - Typed request/response shapes
 * - Custom header injection (service token, merchant ID, source app)
 * - Typed error classes (PaymentEngineClientError, PaymentEngineNetworkError)
 * - No React dependency
 * - No AuraPoS tenant/session dependency
 * - No @pos/payment-engine-core dependency (self-contained)
 *
 * Usage:
 * ```ts
 * import { PaymentEngineClient } from '@pos/payment-engine-client-sdk';
 *
 * const client = new PaymentEngineClient({
 *   baseUrl: 'http://localhost:5100',
 *   serviceToken: process.env.PAYMENT_ENGINE_SERVICE_TOKEN,
 *   merchantId: 'my-merchant-id',
 *   sourceApp: 'my-app',
 * });
 *
 * const intent = await client.createPaymentIntent({
 *   externalPayableType: 'order',
 *   externalPayableId: 'order-123',
 *   currency: 'IDR',
 *   amountDue: 100000,
 * });
 * ```
 */

export { PaymentEngineClient } from './client.ts';
export { PaymentEngineClientError, PaymentEngineNetworkError } from './errors.ts';
export type {
  PaymentEngineClientConfig,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  CreateGatewayPaymentRequest,
  GatewayPaymentResponse,
  PaymentIntentStatusResponse,
  RefundabilityResponse,
  ProviderActionResponse,
} from './types.ts';
