import type { Database } from '@pos/infrastructure/database';
import type { IPaymentProviderEventRepository } from '@pos/infrastructure/repositories/payments/PaymentProviderEventRepository';
import type { IPaymentTransactionRepository } from '@pos/infrastructure/repositories/payments/PaymentTransactionRepository';
import type { PaymentProviderRegistry } from './PaymentProviderRegistry';
import type { ApplyGatewayTransactionStatus } from './ApplyGatewayTransactionStatus';

export interface ReprocessStaleProviderEventsInput {
  /**
   * Events created more than this many minutes ago are considered stale.
   * Must be positive. Recommended minimum: 5 minutes to avoid touching fresh events.
   */
  cutoffMinutes: number;
  /**
   * Optional provider filter — only reprocess events for this provider.
   */
  provider?: string;
  /**
   * Maximum number of stale events to select (default 50).
   */
  batchSize?: number;
  /**
   * When true, no mutations are made. The output describes what would happen.
   */
  dryRun: boolean;
}

export interface StaleEventResult {
  eventId: string;
  provider: string;
  providerEventId: string;
  providerReference: string | null;
  eventType: string;
  signatureValid: boolean;
  createdAt: Date;
  ageMinutes: number;
  /**
   * Outcome of the reprocessing attempt.
   * Only set when dryRun=false.
   */
  outcome?:
    | 'reprocessed'
    | 'ignored_terminal'
    | 'ignored_event_type'
    | 'skipped_invalid_sig'
    | 'unsupported_provider'
    | 'failed';
  error?: string;
}

export interface ReprocessStaleProviderEventsOutput {
  dryRun: boolean;
  cutoffMinutes: number;
  totalFound: number;
  reprocessed: number;
  ignored: number;
  skipped: number;
  failed: number;
  events: StaleEventResult[];
}

/**
 * ReprocessStaleProviderEvents — Phase 5 reconciliation use case.
 *
 * Finds provider events stuck in `processingStatus='pending'` for longer than
 * cutoffMinutes and attempts to reprocess them using the stored rawPayload.
 *
 * Events get stuck when the DB transaction that updates their status rolls back
 * after the event row has already been committed (see Phase 3 hardening report).
 *
 * Safety rules enforced:
 * - signatureValid=false events are NEVER used to mutate money movement.
 * - Unsupported providers are reported safely without aborting the batch.
 * - Events whose target transaction is already terminal are ignored gracefully.
 * - One failed event does not abort the rest of the batch.
 * - Fresh events (created after cutoffDate) are never selected.
 * - dryRun=true never mutates anything — it only lists what would be reprocessed.
 */
export class ReprocessStaleProviderEvents {
  constructor(
    private readonly db: Database,
    private readonly eventRepo: IPaymentProviderEventRepository,
    private readonly txRepo: IPaymentTransactionRepository,
    private readonly registry: PaymentProviderRegistry,
    private readonly applyGatewayStatus: ApplyGatewayTransactionStatus,
  ) {}

  async execute(
    input: ReprocessStaleProviderEventsInput,
  ): Promise<ReprocessStaleProviderEventsOutput> {
    const cutoffDate = new Date(Date.now() - input.cutoffMinutes * 60 * 1000);
    const limit = input.batchSize ?? 50;
    const now = new Date();

    const staleEvents = await this.eventRepo.listStalePendingEvents(cutoffDate, {
      provider: input.provider,
      limit,
    });

    const results: StaleEventResult[] = [];
    let reprocessed = 0;
    let ignored = 0;
    let skipped = 0;
    let failed = 0;

    for (const event of staleEvents) {
      const ageMs = now.getTime() - new Date(event.createdAt).getTime();
      const ageMinutes = Math.floor(ageMs / 60_000);

      const base: StaleEventResult = {
        eventId: event.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        providerReference: event.providerReference ?? null,
        eventType: event.eventType,
        signatureValid: event.signatureValid,
        createdAt: new Date(event.createdAt),
        ageMinutes,
      };

      // dry run — just describe, no mutations
      if (input.dryRun) {
        results.push(base);
        continue;
      }

      // Invalid-signature audit events must never produce money movement.
      if (!event.signatureValid) {
        results.push({ ...base, outcome: 'skipped_invalid_sig' });
        skipped++;
        continue;
      }

      // Provider must be registered.
      if (!this.registry.has(event.provider)) {
        results.push({
          ...base,
          outcome: 'unsupported_provider',
          error: `Provider "${event.provider}" is not registered`,
        });
        skipped++;
        continue;
      }

      const provider = this.registry.get(event.provider);

      try {
        // Re-parse the stored rawPayload through the provider's parser.
        // We serialize the stored jsonb back to a string for compatibility
        // with provider.parseWebhook (which expects a raw body string).
        const rawPayloadStr = JSON.stringify(event.rawPayload ?? {});
        let parsed: Awaited<ReturnType<typeof provider.parseWebhook>>;
        try {
          parsed = await provider.parseWebhook({
            rawPayload: rawPayloadStr,
            headers: {},
          });
        } catch (parseErr: any) {
          await this.eventRepo.markFailed(
            event.id,
            `REPROCESS_PARSE_ERROR: ${parseErr?.message ?? String(parseErr)}`,
          );
          results.push({
            ...base,
            outcome: 'failed',
            error: `Parse error: ${parseErr?.message ?? String(parseErr)}`,
          });
          failed++;
          continue;
        }

        // Ignored or pending event types do not mutate transaction state.
        if (parsed.transactionStatus === 'ignored' || parsed.transactionStatus === 'pending') {
          await this.eventRepo.markIgnored(
            event.id,
            `REPROCESS_IGNORED: event type "${parsed.eventType}" does not trigger state mutation`,
          );
          results.push({ ...base, outcome: 'ignored_event_type' });
          ignored++;
          continue;
        }

        // Resolve tenantId from the event row, or fall back to a global TX lookup.
        let tenantId: string | null = event.tenantId ?? null;
        if (!tenantId && parsed.providerReference) {
          const txGlobal = await this.txRepo.findByProviderReferenceGlobal(
            event.provider,
            parsed.providerReference,
          );
          tenantId = txGlobal?.tenantId ?? null;
        }

        if (!tenantId) {
          await this.eventRepo.markFailed(
            event.id,
            'REPROCESS_TENANT_NOT_RESOLVED: cannot resolve tenantId',
          );
          results.push({
            ...base,
            outcome: 'failed',
            error: 'Cannot resolve tenantId for transaction mutation',
          });
          failed++;
          continue;
        }

        const resolvedTenantId = tenantId;

        // Apply the gateway transaction status inside a DB transaction.
        const applyResult = await this.db.transaction(async (dbTx) => {
          const result = await this.applyGatewayStatus.execute(
            {
              tenantId: resolvedTenantId,
              provider: event.provider,
              providerReference: parsed.providerReference,
              status: parsed.transactionStatus as 'succeeded' | 'failed',
              failureReason: parsed.failureReason ?? null,
            },
            dbTx,
          );

          if (result.outcome === 'already_terminal') {
            await this.eventRepo.markIgnored(
              event.id,
              `REPROCESS_TERMINAL: transaction is already in state "${result.currentStatus}"`,
              dbTx,
            );
          } else if (result.outcome === 'not_found') {
            await this.eventRepo.markFailed(
              event.id,
              `REPROCESS_TX_NOT_FOUND: no ${event.provider} transaction for reference "${parsed.providerReference}"`,
              dbTx,
            );
          } else {
            // succeeded or failed outcome from apply
            await this.eventRepo.markProcessed(event.id, { processedAt: new Date() }, dbTx);
          }

          return result;
        });

        if (applyResult.outcome === 'already_terminal') {
          results.push({ ...base, outcome: 'ignored_terminal' });
          ignored++;
        } else if (applyResult.outcome === 'not_found') {
          results.push({
            ...base,
            outcome: 'failed',
            error: `No ${event.provider} transaction for reference "${parsed.providerReference}"`,
          });
          failed++;
        } else {
          results.push({ ...base, outcome: 'reprocessed' });
          reprocessed++;
        }
      } catch (err: any) {
        // One failed event must not abort the whole batch.
        try {
          await this.eventRepo.markFailed(
            event.id,
            `REPROCESS_ERROR: ${err?.message ?? String(err)}`,
          );
        } catch {
          // best-effort — swallow secondary failure
        }
        results.push({
          ...base,
          outcome: 'failed',
          error: err?.message ?? String(err),
        });
        failed++;
      }
    }

    return {
      dryRun: input.dryRun,
      cutoffMinutes: input.cutoffMinutes,
      totalFound: staleEvents.length,
      reprocessed,
      ignored,
      skipped,
      failed,
      events: results,
    };
  }
}
