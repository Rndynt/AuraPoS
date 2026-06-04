import type { Database } from '@pos/infrastructure/database';
import type { IPaymentProviderEventRepository } from '@pos/infrastructure/repositories/payments/PaymentProviderEventRepository';
import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments/PaymentTransactionRepository';
import type { DomainPaymentIntent, DomainPaymentTransaction } from '@pos/domain/payments';
import type { PaymentProviderRegistry } from './PaymentProviderRegistry';
import type { ApplyGatewayTransactionStatus } from './ApplyGatewayTransactionStatus';

export interface HandlePaymentProviderWebhookInput {
  /** Provider code from the URL route parameter, e.g. "fake_gateway". */
  provider: string;
  /** HTTP request headers as a key-value object. */
  headers: Record<string, string>;
  /** Raw request body (string).  Must match what was used to compute the signature. */
  rawBody: string;
  /**
   * Tenant ID resolved from the request context (service token / tenant header).
   * May be null for unauthenticated webhook calls from real payment providers.
   * When null the tenant is resolved from the transaction row via a global lookup.
   */
  tenantId?: string | null;
}

export type HandlePaymentProviderWebhookOutput =
  | {
      outcome: 'processed';
      eventId: string;
      intent: DomainPaymentIntent;
      transaction: DomainPaymentTransaction;
    }
  | { outcome: 'idempotent_replay'; eventId: string }
  | { outcome: 'ignored'; eventId: string | null; reason: string }
  | { outcome: 'invalid_signature'; eventId: null }
  | { outcome: 'unknown_provider' }
  | { outcome: 'parse_error'; error: string };

/**
 * HandlePaymentProviderWebhook — generic webhook processing use case (Phase 3).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  This use case processes inbound provider webhook events.               │
 * │  It is NOT a test utility — it will be the live webhook handler once    │
 * │  real gateways are integrated in Phase 5+.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Processing pipeline
 * -------------------
 * 1. Lookup provider in registry → return `unknown_provider` if absent.
 * 2. Verify HMAC signature → return `invalid_signature` if invalid.
 * 3. Parse raw payload via provider.parseWebhook → return `parse_error` on failure.
 * 4. Idempotency check: if event already processed, return `idempotent_replay`.
 * 5. Resolve tenantId:
 *    a. From route context (input.tenantId) — always available for fake_gateway.
 *    b. Via global DB lookup on (provider, providerReference) for real providers.
 * 6. Begin DB transaction:
 *    a. Insert payment_provider_events row.
 *    b. For `ignored` or `pending` status → markIgnored → return `ignored`.
 *    c. Apply transaction status via ApplyGatewayTransactionStatus.
 *    d. `already_terminal` → markIgnored(TRANSACTION_ALREADY_TERMINAL) → `ignored`.
 *    e. `not_found`        → markFailed(TRANSACTION_NOT_FOUND) → `ignored`.
 *    f. `succeeded` / `failed` → markProcessed → return `processed`.
 *
 * Idempotency
 * -----------
 * The (provider, providerEventId) unique index on payment_provider_events guarantees
 * that duplicate event IDs cannot be inserted.  This handles:
 *  - Provider retry of the same event (most common case).
 *  - Concurrent duplicate delivery (race handled by unique constraint).
 *
 * Concurrency
 * -----------
 * The `ApplyGatewayTransactionStatus` helper holds a `SELECT ... FOR UPDATE` lock
 * on the payment_transaction row throughout the mutation.  Two concurrent webhooks
 * for the same event will:
 *  1. First request: idempotency check → not found → insert event → acquire lock →
 *     mutate transaction → markProcessed.
 *  2. Second request: idempotency check → not found → insert event → unique
 *     constraint violation → re-check → find processed → return `idempotent_replay`.
 */
export class HandlePaymentProviderWebhook {
  constructor(
    private readonly db: Database,
    private readonly registry: PaymentProviderRegistry,
    private readonly eventRepo: IPaymentProviderEventRepository,
    private readonly txRepo: IPaymentTransactionRepository,
    private readonly applyGatewayStatus: ApplyGatewayTransactionStatus,
  ) {}

  async execute(
    input: HandlePaymentProviderWebhookInput,
  ): Promise<HandlePaymentProviderWebhookOutput> {
    // Step 1 — Validate provider.
    if (!this.registry.has(input.provider)) {
      return { outcome: 'unknown_provider' };
    }
    const provider = this.registry.get(input.provider);

    // Step 2 — Verify webhook signature.
    // The signature header name is provider-specific; verifyWebhook handles lookup.
    const signature =
      input.headers['x-fake-gateway-signature'] ||
      input.headers['x-signature'] ||
      input.headers['x-webhook-signature'] ||
      '';

    const signatureValid = await provider.verifyWebhook({
      rawPayload: input.rawBody,
      signature,
      headers: input.headers,
    });

    if (!signatureValid) {
      return { outcome: 'invalid_signature', eventId: null };
    }

    // Step 3 — Parse the raw payload.
    let parsed: Awaited<ReturnType<typeof provider.parseWebhook>>;
    try {
      parsed = await provider.parseWebhook({
        rawPayload: input.rawBody,
        headers: input.headers,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { outcome: 'parse_error', error: message };
    }

    // Step 4 — Idempotency check (outside the DB transaction to avoid unnecessary locking).
    const existingEvent = await this.eventRepo.findByProviderEventId(
      input.provider,
      parsed.providerEventId,
    );
    if (existingEvent && existingEvent.processingStatus !== 'pending') {
      return { outcome: 'idempotent_replay', eventId: existingEvent.id };
    }

    // Step 5 — Resolve tenantId.
    // For fake_gateway the tenantId is always provided via the route context.
    // For future real providers, we fall back to a global transaction lookup.
    let resolvedTenantId: string | null = input.tenantId ?? null;

    if (
      !resolvedTenantId &&
      parsed.transactionStatus !== 'ignored' &&
      parsed.transactionStatus !== 'pending' &&
      parsed.providerReference
    ) {
      const txGlobal = await this.txRepo.findByProviderReferenceGlobal(
        input.provider,
        parsed.providerReference,
      );
      if (!txGlobal) {
        // Cannot determine tenant — store a minimal event and return ignored.
        // We don't have tenantId for the event row, but the schema allows null.
        try {
          const event = await this.eventRepo.create({
            provider: input.provider,
            providerEventId: parsed.providerEventId,
            providerReference: parsed.providerReference || null,
            eventType: parsed.eventType,
            rawPayload: tryParseJson(input.rawBody),
            signatureValid: true,
            processingStatus: 'failed',
            errorMessage: 'TRANSACTION_NOT_FOUND: no transaction for providerReference',
            tenantId: null,
            processedAt: null,
          });
          return {
            outcome: 'ignored',
            eventId: event.id,
            reason: 'TRANSACTION_NOT_FOUND',
          };
        } catch {
          return { outcome: 'ignored', eventId: null, reason: 'TRANSACTION_NOT_FOUND' };
        }
      }
      resolvedTenantId = txGlobal.tenantId;
    }

    // Step 6 — Process atomically inside a DB transaction.
    return await this.db.transaction(async (dbTx) => {
      // Step 6a — Persist the provider event row before mutating any transaction.
      // This ensures we have an audit record even if the subsequent mutation fails.
      let event: Awaited<ReturnType<typeof this.eventRepo.create>>;
      try {
        event = await this.eventRepo.create(
          {
            provider: input.provider,
            providerEventId: parsed.providerEventId,
            providerReference: parsed.providerReference || null,
            eventType: parsed.eventType,
            rawPayload: tryParseJson(input.rawBody),
            signatureValid: true,
            processingStatus: 'pending',
            tenantId: resolvedTenantId ?? null,
            processedAt: null,
            errorMessage: null,
          },
          dbTx,
        );
      } catch (insertErr: unknown) {
        // The unique constraint on (provider, providerEventId) fires when two
        // concurrent requests race for the same event.  Re-check and replay.
        const recheck = await this.eventRepo.findByProviderEventId(
          input.provider,
          parsed.providerEventId,
          dbTx,
        );
        if (recheck && recheck.processingStatus !== 'pending') {
          return { outcome: 'idempotent_replay', eventId: recheck.id };
        }
        const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
        return { outcome: 'parse_error', error: `Failed to store provider event: ${msg}` };
      }

      // Step 6b — No state mutation for informational / unsupported event types.
      if (parsed.transactionStatus === 'ignored' || parsed.transactionStatus === 'pending') {
        await this.eventRepo.markIgnored(
          event.id,
          `Event type "${parsed.eventType}" does not trigger state mutation (status: ${parsed.transactionStatus})`,
          dbTx,
        );
        return {
          outcome: 'ignored',
          eventId: event.id,
          reason: `Event type: ${parsed.eventType}`,
        };
      }

      // Step 6c — We need tenantId to mutate the transaction.
      if (!resolvedTenantId) {
        await this.eventRepo.markFailed(
          event.id,
          'Cannot resolve tenantId for transaction mutation',
          dbTx,
        );
        return { outcome: 'ignored', eventId: event.id, reason: 'TENANT_NOT_RESOLVED' };
      }

      // Step 6d — Apply the transaction status via the shared helper.
      const applyResult = await this.applyGatewayStatus.execute(
        {
          tenantId: resolvedTenantId,
          provider: input.provider,
          providerReference: parsed.providerReference,
          status: parsed.transactionStatus as 'succeeded' | 'failed',
          failureReason: parsed.failureReason ?? null,
        },
        dbTx,
      );

      if (applyResult.outcome === 'not_found') {
        await this.eventRepo.markFailed(
          event.id,
          `TRANSACTION_NOT_FOUND: no ${input.provider} transaction for reference "${parsed.providerReference}"`,
          dbTx,
        );
        return {
          outcome: 'ignored',
          eventId: event.id,
          reason: 'TRANSACTION_NOT_FOUND',
        };
      }

      if (applyResult.outcome === 'already_terminal') {
        await this.eventRepo.markIgnored(
          event.id,
          `TRANSACTION_ALREADY_TERMINAL: transaction is in state "${applyResult.currentStatus}"`,
          dbTx,
        );
        return {
          outcome: 'ignored',
          eventId: event.id,
          reason: 'TRANSACTION_ALREADY_TERMINAL',
        };
      }

      // Step 6e — succeeded or failed — mark event as processed.
      await this.eventRepo.markProcessed(event.id, { processedAt: new Date() }, dbTx);

      return {
        outcome: 'processed',
        eventId: event.id,
        intent: applyResult.intent,
        transaction: applyResult.transaction,
      };
    });
  }
}

// ── Private helpers ────────────────────────────────────────────────────────────

/**
 * Safely parse a JSON string into an object for storage.
 * Falls back to `{ raw: rawBody }` if parsing fails.
 */
function tryParseJson(rawBody: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { raw: rawBody };
  } catch {
    return { raw: rawBody };
  }
}
