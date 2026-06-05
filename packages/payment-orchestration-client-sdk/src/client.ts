/**
 * client — typed HTTP client for payment-orchestration-service.
 *
 * Targets `/v1/...` paths for the standalone payment-orchestration-service.
 * Supports custom headers: x-payment-orchestration-service-token, x-payment-merchant-id, x-source-app.
 *
 * Fetch-compatible; uses the global `fetch` API (Node 18+ / modern browsers).
 * No React dependency. No AuraPoS tenant dependency.
 *
 * Phase 8A: methods implemented as real HTTP wrappers.
 * The service returns 501 for most routes in Phase 8A — this is expected.
 */

import { PaymentEngineClientError, PaymentEngineNetworkError } from './errors.ts';
import type {
  PaymentEngineClientConfig,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  CreateGatewayPaymentRequest,
  GatewayPaymentResponse,
  PaymentIntentStatusResponse,
  RefundabilityResponse,
} from './types.ts';

export class PaymentEngineClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: PaymentEngineClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    if (config.serviceToken) {
      this.defaultHeaders['x-payment-orchestration-service-token'] = config.serviceToken;
    }
    if (config.merchantId) {
      this.defaultHeaders['x-payment-merchant-id'] = config.merchantId;
    }
    if (config.sourceApp) {
      this.defaultHeaders['x-source-app'] = config.sourceApp;
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { ...this.defaultHeaders, ...extraHeaders };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err: unknown) {
      throw new PaymentEngineNetworkError(
        `Network error calling payment-orchestration-service: ${String(err)}`,
        err,
      );
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code =
        data != null && typeof data === 'object' && 'code' in data
          ? String((data as Record<string, unknown>)['code'])
          : undefined;
      const message =
        data != null && typeof data === 'object' && 'message' in data
          ? String((data as Record<string, unknown>)['message'])
          : `HTTP ${response.status} from payment-orchestration-service`;

      throw new PaymentEngineClientError(message, response.status, code, data);
    }

    // Unwrap { ok, data } envelope if present; otherwise return data as-is.
    if (data != null && typeof data === 'object' && 'data' in data) {
      return (data as Record<string, unknown>)['data'] as T;
    }
    return data as T;
  }

  // ── Public methods ──────────────────────────────────────────────────────────

  /**
   * createPaymentIntent — create a new payment intent.
   *
   * POST /v1/payment-intents
   *
   * Phase 8A: service returns 501. Call will throw PaymentEngineClientError with status=501.
   * Phase 8D: fully implemented.
   */
  async createPaymentIntent(
    input: CreatePaymentIntentRequest,
  ): Promise<PaymentIntentResponse> {
    return this.request<PaymentIntentResponse>('POST', '/v1/payment-intents', input);
  }

  /**
   * createGatewayPayment — create a gateway payment for an existing intent.
   *
   * POST /v1/payment-intents/:intentId/gateway-payments
   *
   * Phase 8A: service returns 501.
   */
  async createGatewayPayment(
    intentId: string,
    input: CreateGatewayPaymentRequest,
  ): Promise<GatewayPaymentResponse> {
    return this.request<GatewayPaymentResponse>(
      'POST',
      `/v1/payment-intents/${intentId}/gateway-payments`,
      input,
    );
  }

  /**
   * getPaymentIntentStatus — poll the status of a payment intent.
   *
   * GET /v1/payment-intents/:intentId/status
   *
   * Phase 8A: service returns 501.
   */
  async getPaymentIntentStatus(intentId: string): Promise<PaymentIntentStatusResponse> {
    return this.request<PaymentIntentStatusResponse>(
      'GET',
      `/v1/payment-intents/${intentId}/status`,
    );
  }

  /**
   * getRefundability — check whether a payment intent can be refunded.
   *
   * GET /v1/payment-intents/:intentId/refundability
   *
   * Phase 8A: service returns 501 (placeholder route added in Phase 8A hardening).
   * Phase 8D: fully implemented.
   */
  async getRefundability(intentId: string): Promise<RefundabilityResponse> {
    return this.request<RefundabilityResponse>(
      'GET',
      `/v1/payment-intents/${intentId}/refundability`,
    );
  }
}
