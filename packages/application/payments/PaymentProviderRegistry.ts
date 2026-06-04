import type { PaymentProvider } from '@pos/domain/payments';
import { PaymentPolicyError } from '@pos/domain/payments';

/**
 * PaymentProviderRegistry — maps providerCode strings to PaymentProvider implementations.
 *
 * Design notes
 * ------------
 * - Providers are registered by their `providerCode` string (e.g. 'manual', 'fake_gateway').
 * - Callers retrieve a provider via `get(providerCode)`; unknown codes throw a
 *   `PaymentPolicyError` with code `UNSUPPORTED_PROVIDER` so the caller can map it
 *   to a 422 HTTP response without special-casing.
 * - Phase 2 registers: ManualProvider (providerCode='manual') + FakeGatewayProvider
 *   (providerCode='fake_gateway').  Real providers (Midtrans, Xendit, Stripe) are
 *   Phase 3+.
 */
export class PaymentProviderRegistry {
  private readonly providers = new Map<string, PaymentProvider>();

  register(provider: PaymentProvider): this {
    this.providers.set(provider.providerCode, provider);
    return this;
  }

  get(providerCode: string): PaymentProvider {
    const provider = this.providers.get(providerCode);
    if (!provider) {
      const available = [...this.providers.keys()].join(', ') || '(none registered)';
      throw new PaymentPolicyError(
        `Unsupported payment provider: "${providerCode}". Supported providers: ${available}`,
        'UNSUPPORTED_PROVIDER',
      );
    }
    return provider;
  }

  has(providerCode: string): boolean {
    return this.providers.has(providerCode);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }
}
