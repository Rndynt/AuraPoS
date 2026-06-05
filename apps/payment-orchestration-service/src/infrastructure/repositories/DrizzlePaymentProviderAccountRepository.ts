/**
 * DrizzlePaymentProviderAccountRepository — Phase 8C skeleton.
 *
 * Implements PaymentProviderAccountRepository from @northflow/payment-orchestration-core.
 * Methods throw until Phase 8D wires the Drizzle DB connection and schema imports.
 */

import type {
  PaymentProviderAccountRepository,
  CreatePaymentProviderAccountInput,
} from '@northflow/payment-orchestration-core';
import type {
  PaymentProviderAccount,
} from '@northflow/payment-orchestration-core';

export class DrizzlePaymentProviderAccountRepository
  implements PaymentProviderAccountRepository
{
  findById(
    _id: string,
    _merchantId: string,
  ): Promise<PaymentProviderAccount | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  findByMerchantAndProvider(
    _merchantId: string,
    _provider: string,
    _environment?: string,
  ): Promise<PaymentProviderAccount | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  create(
    _input: CreatePaymentProviderAccountInput,
  ): Promise<PaymentProviderAccount> {
    throw new Error('Not implemented until Phase 8D');
  }

  updateStatus(
    _id: string,
    _merchantId: string,
    _status: PaymentProviderAccount['status'],
  ): Promise<PaymentProviderAccount> {
    throw new Error('Not implemented until Phase 8D');
  }
}
