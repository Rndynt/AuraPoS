/**
 * container — dependency injection container for payment-orchestration-service.
 *
 * Phase 8A: minimal container with no real dependencies wired.
 * Phase 8C: repository skeleton classes exist but are not yet wired (Phase 8D).
 * Phase 8D+: DB connection, repository instances, provider registry, use cases.
 *
 * No AuraPoS session/tenant middleware.
 * No POS order domain deps.
 */

import type { PaymentOrchestrationServiceConfig } from './config/env.ts';

// Phase 8C: repository interfaces available — wiring deferred to Phase 8D
// import type { PaymentMerchantRepository } from '@northflow/payment-orchestration-core';
// import type { PaymentIntentRepository } from '@northflow/payment-orchestration-core';
// import type { PaymentTransactionRepository } from '@northflow/payment-orchestration-core';
// import type { PaymentProviderAccountRepository } from '@northflow/payment-orchestration-core';
// import type { PaymentProviderEventRepository } from '@northflow/payment-orchestration-core';
// import type { PaymentIdempotencyRepository } from '@northflow/payment-orchestration-core';

export interface ServiceContainer {
  config: PaymentOrchestrationServiceConfig;
  // Phase 8D: uncomment and wire when DB connection is established
  // db: DatabaseConnection;
  // merchantRepo: PaymentMerchantRepository;
  // intentRepo: PaymentIntentRepository;
  // transactionRepo: PaymentTransactionRepository;
  // providerAccountRepo: PaymentProviderAccountRepository;
  // providerEventRepo: PaymentProviderEventRepository;
  // idempotencyRepo: PaymentIdempotencyRepository;
  // providerRegistry: PaymentProviderRegistry;
}

export function createContainer(config: PaymentOrchestrationServiceConfig): ServiceContainer {
  return { config };
}
