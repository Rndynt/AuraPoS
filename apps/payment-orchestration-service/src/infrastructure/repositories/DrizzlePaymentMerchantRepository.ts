/**
 * DrizzlePaymentMerchantRepository — Phase 8C skeleton.
 *
 * Implements PaymentMerchantRepository from @northflow/payment-orchestration-core.
 * Methods throw until Phase 8D wires the Drizzle DB connection and schema imports.
 */

import type {
  PaymentMerchantRepository,
  CreatePaymentMerchantInput,
} from '@northflow/payment-orchestration-core';
import type { PaymentMerchant } from '@northflow/payment-orchestration-core';

export class DrizzlePaymentMerchantRepository implements PaymentMerchantRepository {
  findById(_id: string): Promise<PaymentMerchant | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  findByExternalRef(_input: {
    sourceApp: string;
    externalRef: string;
  }): Promise<PaymentMerchant | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  create(_input: CreatePaymentMerchantInput): Promise<PaymentMerchant> {
    throw new Error('Not implemented until Phase 8D');
  }

  updateStatus(
    _id: string,
    _status: PaymentMerchant['status'],
  ): Promise<PaymentMerchant> {
    throw new Error('Not implemented until Phase 8D');
  }
}
