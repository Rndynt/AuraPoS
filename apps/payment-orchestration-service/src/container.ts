/**
 * container — dependency injection container for payment-orchestration-service.
 *
 * Phase 8A: minimal container with no real dependencies wired.
 *           Only carries config for use by routers.
 *
 * Phase 8C+: DB connection, repository instances, provider registry, use cases.
 *
 * No AuraPoS session/tenant middleware.
 * No POS order domain deps.
 */

import type { PaymentOrchestrationServiceConfig } from './config/env.ts';

export interface ServiceContainer {
  config: PaymentOrchestrationServiceConfig;
  // TODO(Phase 8C): db: DatabaseConnection;
  // TODO(Phase 8C): intentRepo: IStandalonePaymentIntentRepository;
  // TODO(Phase 8C): transactionRepo: IStandalonePaymentTransactionRepository;
  // TODO(Phase 8C): merchantRepo: IPaymentMerchantRepository;
  // TODO(Phase 8C): providerRegistry: PaymentProviderRegistry;
}

export function createContainer(config: PaymentOrchestrationServiceConfig): ServiceContainer {
  return { config };
}
