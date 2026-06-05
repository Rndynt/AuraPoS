/**
 * providerRegistry — standalone payment provider registry.
 *
 * Phase 8H: registers FakeGateway and standalone Xendit sandbox in non-production environments.
 *
 * Rules:
 * - FakeGateway is always registered in non-production.
 * - In production, no provider is registered (real provider wiring is Phase 8E+).
 * - Never change embedded provider registry in packages/infrastructure/payments/.
 */

import type { StandalonePaymentProvider } from './StandalonePaymentProvider.ts';
import { StandaloneFakeGatewayProvider } from './StandaloneFakeGatewayProvider.ts';
import { XenditSandboxProvider } from './XenditSandboxProvider.ts';

export type ProviderRegistry = Map<string, StandalonePaymentProvider>;

export function createProviderRegistry(nodeEnv: string): ProviderRegistry {
  const registry = new Map<string, StandalonePaymentProvider>();

  if (nodeEnv !== 'production') {
    const fakeGateway = new StandaloneFakeGatewayProvider();
    registry.set(fakeGateway.providerCode, fakeGateway);
    console.log(
      `[payment-orchestration-service/providers] Registered provider: ${fakeGateway.providerCode} (dev/test only)`,
    );

    const xenditSandbox = new XenditSandboxProvider({
      nodeEnv,
      httpClient: async () => {
        throw Object.assign(
          new Error('Xendit sandbox HTTP client is not configured for this runtime.'),
          { statusCode: 503, code: 'PROVIDER_HTTP_CLIENT_UNCONFIGURED' },
        );
      },
    });
    registry.set(xenditSandbox.providerCode, xenditSandbox);
    console.log(
      `[payment-orchestration-service/providers] Registered provider: ${xenditSandbox.providerCode} (sandbox/test only)`,
    );
  }

  return registry;
}
