/**
 * DrizzlePaymentTransactionRepository — Phase 8C skeleton.
 *
 * Implements PaymentTransactionRepository from @northflow/payment-orchestration-core.
 * Methods throw until Phase 8D wires the Drizzle DB connection and schema imports.
 */

import type {
  PaymentTransactionRepository,
  CreatePaymentTransactionInput,
  UpdateTransactionStatusInput,
} from '@northflow/payment-orchestration-core';
import type { StandalonePaymentTransactionDTO } from '@northflow/payment-orchestration-core';

export class DrizzlePaymentTransactionRepository
  implements PaymentTransactionRepository
{
  findById(
    _id: string,
    _merchantId: string,
  ): Promise<StandalonePaymentTransactionDTO | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  findByIntentId(
    _intentId: string,
    _merchantId: string,
  ): Promise<StandalonePaymentTransactionDTO[]> {
    throw new Error('Not implemented until Phase 8D');
  }

  findByProviderReference(
    _provider: string,
    _providerReference: string,
  ): Promise<StandalonePaymentTransactionDTO | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  create(
    _input: CreatePaymentTransactionInput,
  ): Promise<StandalonePaymentTransactionDTO> {
    throw new Error('Not implemented until Phase 8D');
  }

  updateStatus(
    _input: UpdateTransactionStatusInput,
  ): Promise<StandalonePaymentTransactionDTO> {
    throw new Error('Not implemented until Phase 8D');
  }

  sumSucceededRefundsByParent(_parentTransactionId: string): Promise<number> {
    throw new Error('Not implemented until Phase 8D');
  }
}
