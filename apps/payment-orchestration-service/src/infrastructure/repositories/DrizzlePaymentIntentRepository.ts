/**
 * DrizzlePaymentIntentRepository — Phase 8C skeleton.
 *
 * Implements PaymentIntentRepository from @northflow/payment-orchestration-core.
 * Methods throw until Phase 8D wires the Drizzle DB connection and schema imports.
 */

import type {
  PaymentIntentRepository,
  CreatePaymentIntentDbInput,
  UpdateIntentTotalsInput,
  UpdateIntentStatusInput,
  FindByExternalPayableInput,
} from '@northflow/payment-orchestration-core';
import type { StandalonePaymentIntentDTO } from '@northflow/payment-orchestration-core';

export class DrizzlePaymentIntentRepository implements PaymentIntentRepository {
  findById(
    _id: string,
    _merchantId: string,
  ): Promise<StandalonePaymentIntentDTO | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  findByExternalPayable(
    _input: FindByExternalPayableInput,
  ): Promise<StandalonePaymentIntentDTO | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  create(
    _input: CreatePaymentIntentDbInput,
  ): Promise<StandalonePaymentIntentDTO> {
    throw new Error('Not implemented until Phase 8D');
  }

  updateTotals(
    _input: UpdateIntentTotalsInput,
  ): Promise<StandalonePaymentIntentDTO> {
    throw new Error('Not implemented until Phase 8D');
  }

  updateStatus(
    _input: UpdateIntentStatusInput,
  ): Promise<StandalonePaymentIntentDTO> {
    throw new Error('Not implemented until Phase 8D');
  }
}
