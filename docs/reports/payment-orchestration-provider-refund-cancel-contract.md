# Payment Orchestration Provider Refund/Cancel Contract

Date: 2026-06-05

## Scope

Phase 8G/8H defines the provider refund/cancel contract and safety policy. It does not implement real provider refund or cancel money movement.

## Capability Model

Provider capability fields already expose whether runtime operations are safe to call:

- `supportsRefund`
- `supportsCancel`
- `supportsPartialRefund`
- `supportsMultiplePartialRefund`

Phase 8H provider implementations set these conservatively:

- `fake_gateway`: refund/cancel disabled; polling/webhook enabled for dev/test payment status.
- `xendit_sandbox`: refund/cancel disabled; sandbox create-payment, webhook, and polling foundations enabled.

## Proposed Request Shapes

### Provider Refund

```ts
interface ProviderRefundRequest {
  merchantId: string;
  transactionId: string;
  providerAccountId: string;
  amount: number;
  currency: string;
  reason?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown> | null;
}
```

### Provider Cancel/Void

```ts
interface ProviderCancelRequest {
  merchantId: string;
  transactionId: string;
  providerAccountId: string;
  idempotencyKey: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

## Proposed Response Shape

```ts
interface ProviderMutationResult {
  providerReference: string | null;
  providerEventId?: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  rawProviderResponse: Record<string, unknown>;
  failureReason: string | null;
}
```

## Idempotency Policy

- Refund/cancel requests must require an idempotency key.
- The request hash must include merchant, transaction, amount, currency, provider account, and operation type.
- Replays with the same hash return the cached result.
- Replays with a different hash return conflict.
- Failed keys should not be silently reused for money movement; clients must create a new idempotency key.

## Financial Integrity Rules

1. Always scope transaction lookup by `merchantId`.
2. Validate the provider account belongs to the same merchant and provider.
3. Reject refunds above remaining refundable amount.
4. Reject cancel/void when the transaction is already terminal in a non-cancellable status.
5. Create outgoing refund transactions linked by `parentTransactionId`.
6. Update intent totals only after provider success or trusted provider webhook confirms success.
7. Use conditional updates/transactions so concurrent refunds cannot over-refund.
8. Never expose raw credentials in responses or persisted public metadata.

## Provider Event Handling

Provider refund/cancel events should use the same provider-event dedupe table:

- Reserve by `(provider, providerEventId)`.
- Resolve transaction by provider reference and merchant ownership.
- Apply mutation only if the current state is transitionable.
- Mark provider event processed/failed with safe error messages.

## Implemented Now vs Deferred

Implemented now:

- Capability flags for provider runtime selection.
- Status polling foundation for payment transactions.
- Xendit sandbox create-payment and webhook parsing foundations.
- Documentation of refund/cancel request, response, idempotency, and integrity policy.

Deferred:

- Real Xendit refund/cancel calls.
- Refund/cancel HTTP endpoints.
- DB transaction wrapper around provider mutation + outgoing transaction creation.
- Production credential manager.
- Provider-specific refund/cancel webhook reconciliation.
