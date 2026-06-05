/**
 * DrizzlePaymentIdempotencyRepository — Phase 8C skeleton.
 *
 * Implements PaymentIdempotencyRepository from @northflow/payment-orchestration-core.
 * Methods throw until Phase 8D wires the Drizzle DB connection and schema imports.
 *
 * Purpose:
 *   Protects create-intent, create-payment, and refund operations from duplicate
 *   submissions. On Phase 8D, reserve() will do an upsert with conflict detection.
 */

import type {
  PaymentIdempotencyRepository,
} from '@northflow/payment-orchestration-core';
import type {
  PaymentIdempotencyKeyDTO,
  ReserveIdempotencyKeyInput,
  FindIdempotencyKeyInput,
  MarkIdempotencyCompletedInput,
  MarkIdempotencyFailedInput,
} from '@northflow/payment-orchestration-core';

export class DrizzlePaymentIdempotencyRepository
  implements PaymentIdempotencyRepository
{
  reserve(
    _input: ReserveIdempotencyKeyInput,
  ): Promise<PaymentIdempotencyKeyDTO> {
    throw new Error('Not implemented until Phase 8D');
  }

  find(
    _input: FindIdempotencyKeyInput,
  ): Promise<PaymentIdempotencyKeyDTO | null> {
    throw new Error('Not implemented until Phase 8D');
  }

  markCompleted(_input: MarkIdempotencyCompletedInput): Promise<void> {
    throw new Error('Not implemented until Phase 8D');
  }

  markFailed(_input: MarkIdempotencyFailedInput): Promise<void> {
    throw new Error('Not implemented until Phase 8D');
  }
}
