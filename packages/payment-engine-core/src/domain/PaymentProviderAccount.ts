/**
 * PaymentProviderAccount — a merchant's configured payment provider credentials.
 *
 * A merchant may have multiple provider accounts (e.g. one Xendit sandbox account
 * and one production account). The `providerAccountId` in `PaymentScope` selects
 * which account to use for a given payment.
 *
 * Phase 8A: contract-only. No DB schema changes.
 */

/**
 * Environment in which the provider account operates.
 *
 * - `test`       — local/unit-test mock (no real HTTP calls)
 * - `sandbox`    — provider's test environment (real HTTP, no real money)
 * - `production` — provider's production environment (real money)
 */
export type PaymentProviderAccountEnvironment = 'test' | 'sandbox' | 'production';

/**
 * Operational status of the provider account.
 *
 * - `active`   — enabled for new payments
 * - `disabled` — configuration exists but payments are rejected
 */
export type PaymentProviderAccountStatus = 'active' | 'disabled';

/**
 * PaymentProviderAccount — links a merchant to a payment provider configuration.
 *
 * `credentialsRef` is an opaque reference to the secret store entry (Vault path,
 * AWS Secrets Manager ARN, Replit secret name, etc.). The payment engine never
 * stores secrets directly — it resolves credentials at runtime via the secret store.
 *
 * `publicConfig` may contain non-sensitive provider configuration (channel codes,
 * return URLs, currency, etc.) that is safe to persist.
 */
export interface PaymentProviderAccount {
  id: string;
  merchantId: string;
  provider: string;
  environment: PaymentProviderAccountEnvironment;
  credentialsRef?: string | null;
  publicConfig?: Record<string, unknown>;
  status: PaymentProviderAccountStatus;
  metadata?: Record<string, unknown>;
}
