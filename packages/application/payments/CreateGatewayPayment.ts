import type { Database } from '@pos/infrastructure/database';
import type {
  IPaymentIntentRepository,
  IPaymentTransactionRepository,
} from '@pos/infrastructure/repositories/payments';
import type { DomainPaymentIntent, DomainPaymentTransaction } from '@pos/domain/payments';
import {
  assertIntentAcceptsPayment,
  assertAmountValid,
  PaymentPolicyError,
} from '@pos/domain/payments';
import type { PaymentProviderRegistry } from './PaymentProviderRegistry';
import { intentRowToDomain } from './CreatePaymentIntent';
import { txRowToDomain } from './ListPaymentTransactions';
import type { InsertPaymentTransaction } from '../../../shared/schema';

export interface CreateGatewayPaymentInput {
  tenantId: string;
  paymentIntentId: string;
  amount: number;
  method: 'qris' | 'ewallet' | 'card' | 'bank_transfer' | 'other';
  provider: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateGatewayPaymentOutput {
  intent: DomainPaymentIntent;
  transaction: DomainPaymentTransaction;
  providerReference: string | null;
  providerPaymentUrl: string | null;
  providerQrString: string | null;
  idempotentReplay: boolean;
}

/**
 * Phase 2 whitelist: only fake_gateway may be used until Phase 3 integrates real gateways.
 * This guard prevents accidental real-money calls if a future provider code leaks in.
 */
const PHASE2_ALLOWED_PROVIDERS = new Set<string>(['fake_gateway']);

export class CreateGatewayPayment {
  constructor(
    private readonly db: Database,
    private readonly intentRepo: IPaymentIntentRepository,
    private readonly txRepo: IPaymentTransactionRepository,
    private readonly providerRegistry: PaymentProviderRegistry,
  ) {}

  async execute(input: CreateGatewayPaymentInput): Promise<CreateGatewayPaymentOutput> {
    if (input.amount <= 0) {
      throw new PaymentPolicyError('Payment amount must be greater than zero', 'INVALID_AMOUNT');
    }

    // Phase 2 guard: only fake_gateway is allowed
    if (!PHASE2_ALLOWED_PROVIDERS.has(input.provider)) {
      throw new PaymentPolicyError(
        `Provider "${input.provider}" is not supported for gateway payments in Phase 2. ` +
          `Allowed provider(s): ${[...PHASE2_ALLOWED_PROVIDERS].join(', ')}.`,
        'UNSUPPORTED_PROVIDER',
      );
    }

    // Resolve the provider — throws UNSUPPORTED_PROVIDER if not registered
    const gatewayProvider = this.providerRegistry.get(input.provider);

    return await this.db.transaction(async (tx) => {
      // Step 1 — Lock the intent row FOR UPDATE (prevents concurrent overpayment /
      // status change while we are creating the transaction).
      const intentRow = await this.intentRepo.lockForUpdate(
        input.paymentIntentId,
        input.tenantId,
        tx,
      );

      if (!intentRow) {
        throw new Error('Payment intent not found or access denied');
      }

      const intentDomain = intentRowToDomain(intentRow);

      // Step 2 — Reject terminal intents immediately (before idempotency check
      // so that a duplicate call on a paid intent still returns the error).
      // NOTE: For gateway payments we enforce the terminal-state check BEFORE
      // the idempotency replay so callers cannot sneak a new pending transaction
      // onto an already-paid intent via replay.
      assertIntentAcceptsPayment(intentDomain);

      // Step 3 — Idempotency check (inside the locked transaction).
      if (input.idempotencyKey) {
        const existingTx = await this.txRepo.findByIdempotencyKey(
          input.tenantId,
          input.idempotencyKey,
          tx,
        );
        if (existingTx) {
          if (existingTx.paymentIntentId !== input.paymentIntentId) {
            throw new PaymentPolicyError(
              'Idempotency key was already used for a different payment intent',
              'IDEMPOTENCY_KEY_CONFLICT',
            );
          }
          // Same key + same intent → idempotent replay of the pending transaction.
          return {
            intent: intentDomain,
            transaction: txRowToDomain(existingTx),
            providerReference: existingTx.providerReference ?? null,
            providerPaymentUrl: existingTx.providerPaymentUrl ?? null,
            providerQrString: existingTx.providerQrString ?? null,
            idempotentReplay: true,
          };
        }
      }

      // Step 4 — Amount validation (same rules as RecordManualPayment).
      assertAmountValid(input.amount, intentDomain.amountRemaining, intentDomain.allowPartial);

      // Step 5 — Call the provider to generate the payment URL / QR / reference.
      const providerResult = await gatewayProvider.createPayment({
        paymentIntentId: input.paymentIntentId,
        amount: input.amount,
        currency: intentDomain.currency,
        method: input.method,
        metadata: input.metadata,
      });

      // Step 6 — Insert transaction as `pending`.
      // IMPORTANT: Do NOT create an allocation and do NOT update amountPaid.
      // The transaction is not yet settled — it only transitions to succeeded
      // when ConfirmFakeGatewayPayment is called.
      const transactionData: InsertPaymentTransaction = {
        tenantId: input.tenantId,
        paymentIntentId: input.paymentIntentId,
        direction: 'incoming',
        transactionType: 'payment',
        method: input.method,
        provider: input.provider,
        status: 'pending',
        amount: input.amount.toFixed(2),
        providerReference: providerResult.providerReference,
        providerPaymentUrl: providerResult.providerPaymentUrl,
        providerQrString: providerResult.providerQrString,
        idempotencyKey: input.idempotencyKey ?? null,
        metadata: input.metadata ?? null,
        receivedAmount: null,
        changeAmount: null,
        failureReason: null,
      };

      const createdTx = await this.txRepo.create(transactionData, tx);

      // Intent status is NOT recalculated — pending tx does not change amountPaid.
      return {
        intent: intentDomain,
        transaction: txRowToDomain(createdTx),
        providerReference: providerResult.providerReference,
        providerPaymentUrl: providerResult.providerPaymentUrl,
        providerQrString: providerResult.providerQrString,
        idempotentReplay: false,
      };
    });
  }
}
