/**
 * errors — typed error classes for payment-orchestration-client-sdk.
 *
 * Thrown by client methods on non-2xx HTTP responses or transport failures.
 * No dependency on @northflow/payment-orchestration-core — self-contained for portability.
 */

/**
 * PaymentEngineClientError — thrown when the service returns a non-2xx response.
 *
 * Carries:
 * - `status`       — HTTP status code (e.g. 422, 404, 500)
 * - `code`         — machine-readable error code from the service (if available)
 * - `serviceError` — raw error body from the service (safe to log, no secrets)
 */
export class PaymentEngineClientError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;
  public readonly serviceError: unknown;

  constructor(message: string, status: number, code?: string, serviceError?: unknown) {
    super(message);
    this.name = 'PaymentEngineClientError';
    this.status = status;
    this.code = code;
    this.serviceError = serviceError;
  }
}

/**
 * PaymentEngineNetworkError — thrown when the HTTP request fails at network level.
 *
 * Examples: DNS failure, connection refused, timeout.
 */
export class PaymentEngineNetworkError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PaymentEngineNetworkError';
    this.cause = cause;
  }
}
