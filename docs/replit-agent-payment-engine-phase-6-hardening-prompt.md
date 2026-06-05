# Replit Agent Prompt — Payment Engine Phase 6 Hardening

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 6 Hardening**. Do not implement real Midtrans/Xendit/Stripe adapter yet.

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/reports/payment-engine-phase-6-provider-contract-report.md`
- `docs/replit-agent-payment-engine-phase-6-provider-contract-prompt.md`

Reviewed Phase 6 commit:

- `d0c35e968d2c347c76f1715e6bf684ca5795bb3a`

## Guardrails

Do not intentionally change legacy order payment behavior:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

Do not implement future phases:

- no real Midtrans/Xendit/Stripe API call
- no real provider credentials
- no real provider webhook signature implementation except fake provider
- no real provider refund/cancel API
- no order adapter
- no POS UI changes
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet or credit
- no standalone extraction

## Main goal

Harden Phase 6 before any real provider sandbox adapter.

Required fixes:

1. Fix immediate-success lock-order risk in `CreateGatewayPayment`.
2. Add machine-readable `descriptor` to provider actions.
3. Expand `ProviderCapabilities` matrix.
4. Change `ProviderAccountConfig` to avoid raw credentials in domain contract.
5. Update stale FakeGateway cancel/refund messages.
6. Add explicit audit confirmations to Phase 6 report.
7. Add/update tests.

---

## Task 1 — Fix immediate-success lock ordering

Current issue:

`CreateGatewayPayment` locks `payment_intents` first, creates a tx, then calls `ApplyGatewayTransactionStatus`, which locks `payment_transactions` then `payment_intents` again. Normal settlement flows lock `payment_transactions -> payment_intents`, while immediate success currently does `payment_intents -> payment_transactions -> payment_intents`.

Even if the immediate tx is new, this mixed lock-order pattern is a bad precedent before real providers.

Required:

- Do not call `ApplyGatewayTransactionStatus` from inside `CreateGatewayPayment` after the intent is already locked.
- For provider `status === 'succeeded'`, handle the newly created transaction directly inside `CreateGatewayPayment` using the already-locked intent.
- Create the transaction as `succeeded` directly, or create and update without locking by provider reference.
- Create the default allocation once.
- Recalculate/update the intent within the same DB transaction.
- Avoid duplicate settlement logic where possible, but do not reintroduce reversed lock ordering.

Recommended implementation:

- Inject `PaymentAllocationRepository` and `RecalculatePaymentIntent`, or add a small helper that assumes the intent is already locked and the tx was just created.
- The helper must not lock `payment_transactions -> payment_intents` again.
- Update comments to clearly state:
  - normal settlement flows lock `transaction -> intent`;
  - create-payment immediate-success flow owns a newly created tx and already holds the intent lock;
  - therefore it applies settlement directly without cross-flow lock ordering.

Acceptance tests:

- immediate_success creates a succeeded transaction.
- immediate_success creates exactly one allocation.
- immediate_success recalculates intent to paid when amount covers remaining.
- immediate_success does not call `ApplyGatewayTransactionStatus`.
- missing immediate-success dependencies produce clear error if direct settlement helper dependencies are not configured.
- existing pending/default gateway tests still pass.

---

## Task 2 — Add machine-readable ProviderAction descriptor

Current issue:

`ProviderAction` has `type`, `label`, `value`, `expiresAt`, but no stable machine-readable descriptor. UI/adapters cannot reliably distinguish `display_code` as VA number vs payment code without parsing labels.

Required:

Add descriptor field:

```ts
type ProviderActionDescriptor =
  | 'WEB_URL'
  | 'QR_STRING'
  | 'VA_NUMBER'
  | 'PAYMENT_CODE'
  | 'NONE';
```

Recommended action shape:

```ts
interface ProviderAction {
  type: 'redirect_customer' | 'present_qr' | 'display_code' | 'none';
  descriptor: ProviderActionDescriptor;
  label: string;
  value?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}
```

Notes:

- You may keep existing `type: 'redirect'` temporarily only if tests/backward compatibility require it, but preferred canonical type is `redirect_customer`.
- If you keep both, document alias behavior clearly.
- Every FakeGateway action must include descriptor.

Acceptance tests:

- redirect action has descriptor `WEB_URL`.
- qris action has descriptor `QR_STRING`.
- va action has descriptor `VA_NUMBER`.
- payment_code action has descriptor `PAYMENT_CODE`.
- immediate_success / immediate_failure use no action or `none` action consistently as documented.

---

## Task 3 — Expand ProviderCapabilities matrix

Current issue:

`ProviderCapabilities` is too minimal. It only has `canCancel`, `canRefund`, `supportsWebhook`, `supportsPolling`, `supportedScenarios?`.

Required: add these fields without breaking old tests:

```ts
supportsRedirect: boolean;
supportsQr: boolean;
supportsVa: boolean;
supportsPaymentCode: boolean;
supportsPartialRefund: boolean;
supportsMultiplePartialRefund: boolean;
canReturnImmediateSuccess: boolean;
canReturnImmediateFailure: boolean;
```

Keep old fields if already used:

- `canCancel`
- `canRefund`
- `supportsWebhook`
- `supportsPolling`
- `supportedScenarios?`

Set values:

- FakeGateway:
  - supportsRedirect true
  - supportsQr true
  - supportsVa true
  - supportsPaymentCode true
  - canReturnImmediateSuccess true
  - canReturnImmediateFailure true
  - canCancel false
  - canRefund false
  - supportsPartialRefund false
  - supportsMultiplePartialRefund false
  - supportsWebhook true
  - supportsPolling false
- ManualProvider:
  - all external/gateway action capabilities false
  - canReturnImmediateSuccess true is acceptable because manual provider succeeds synchronously
  - supportsWebhook false

Add tests for capability matrix.

---

## Task 4 — Fix ProviderAccountConfig secrets model

Current issue:

`ProviderAccountConfig` includes:

```ts
credentials: Record<string, string>
```

This encourages passing raw secrets through the domain contract.

Required:

Change domain config to use secret references, not raw credentials:

```ts
interface ProviderAccountConfig {
  provider: string; // or providerCode, keep consistent with repo naming
  tenantId?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production' | 'test';
  credentialsRef?: string;
  publicConfig?: Record<string, unknown>;
  capabilitiesOverride?: Partial<ProviderCapabilities>;
  metadata?: Record<string, unknown>;
}
```

Rules:

- Do not add DB table yet.
- Do not store real API keys.
- Do not put raw `credentials` in domain type.
- If infrastructure adapters need raw secrets later, that should be infrastructure-only runtime config, not the domain account descriptor.

Update tests and report.

---

## Task 5 — Update stale FakeGateway cancel/refund messages

Current issue:

FakeGateway cancel/refund messages still say `Implement in Phase 4` or `planned for Phase 4`, even though Phase 4 already exists as internal refund/void lifecycle.

Required:

Update messages/comments:

- FakeGateway provider-level cancel/refund API remains unsupported.
- Internal void/refund lifecycle exists in Phase 4 via `VoidPaymentTransaction` and `RefundPaymentTransaction`.
- Real provider cancel/refund API will be implemented in future real-provider adapter phase.

Add/adjust tests if any assert those messages.

---

## Task 6 — Report hardening and audit confirmation

Create:

- `docs/reports/payment-engine-phase-6-hardening-report.md`

Update original Phase 6 report if helpful.

Report must include:

- summary;
- files changed;
- immediate-success lock-order fix;
- provider action descriptor model;
- expanded capabilities matrix;
- ProviderAccountConfig credentialsRef change;
- FakeGateway message cleanup;
- tests added/updated;
- commands run;
- known limitations;
- explicit confirmation: FakeGateway is not a Midtrans/Xendit emulator;
- explicit confirmation: no real gateway adapter/API/credential implemented;
- explicit confirmation: legacy order payment flow was not intentionally changed;
- explicit confirmation: future phases were not implemented.

---

## Task 7 — Tests and commands

Add/update tests for:

1. immediate_success direct settlement without calling `ApplyGatewayTransactionStatus`;
2. immediate_success creates exactly one allocation and marks intent paid;
3. failed provider result creates failed transaction and no allocation;
4. all provider actions include machine-readable descriptor;
5. expanded capabilities on FakeGateway;
6. expanded capabilities on ManualProvider;
7. ProviderAccountConfig has `credentialsRef` and no raw `credentials` field in tests/types;
8. FakeGateway cancel/refund messages are no longer stale;
9. Phase 1-5 regression tests still pass if practical;
10. Phase 6 provider contract tests still pass.

Run available checks:

- `npm run check`
- provider contract tests
- Phase 1-5 payment engine regression tests if practical
- TypeScript check

If a command fails, report the exact relevant error summary.

## Commit

Commit with a clear message, for example:

`fix(payment-engine): harden provider contract and immediate settlement`

Final Replit response must include summary, commit SHA, files changed, tests/checks run, known issues, and confirmation that legacy order payment flow was not intentionally changed.
