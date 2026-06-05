/**
 * DrizzlePaymentProviderEventRepository — Phase 8C skeleton.
 *
 * Implements PaymentProviderEventRepository from @northflow/payment-orchestration-core.
 * Methods throw until Phase 8D wires the Drizzle DB connection and schema imports.
 *
 * Note on merchantId backfill:
 *   Events arrive without merchant context; merchant is resolved after providerReference
 *   is matched to an existing transaction/intent via assignMerchant().
 */

import type {
  PaymentProviderEventRepository,
  FindStalePendingInput,
} from '@northflow/payment-orchestration-core';
import type {
  PaymentProviderEventDTO,
  ReserveProviderEventInput,
} from '@northflow/payment-orchestration-core';

export class DrizzlePaymentProviderEventRepository
  implements PaymentProviderEventRepository
{
  reserveEvent(
    _input: ReserveProviderEventInput,
  ): Promise<PaymentProviderEventDTO> {
    throw new Error('Not implemented until Phase 8D');
  }

  findByProviderEventId(
    _provider: string,
    _providerEventId: string,
  ): Promise<PaymentProviderEventDTO | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  assignMerchant(_eventId: string, _merchantId: string): Promise<void> {
    throw new Error('Not implemented until Phase 8D');
  }

  markProcessed(_eventId: string): Promise<void> {
    throw new Error('Not implemented until Phase 8D');
  }

  markFailed(_eventId: string, _error: string): Promise<void> {
    throw new Error('Not implemented until Phase 8D');
  }

  findStalePending(
    _input: FindStalePendingInput,
  ): Promise<PaymentProviderEventDTO[]> {
    throw new Error('Not implemented until Phase 8D');
  }
}
