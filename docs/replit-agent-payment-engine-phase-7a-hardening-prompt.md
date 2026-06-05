# Replit Agent Prompt — Payment Engine Phase 7A Hardening

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 7A Hardening** for the Xendit sandbox adapter.

Important:

- Do not implement Phase 7B provider-level refund yet.
- Do not implement Midtrans or Stripe.
- Do not implement production Xendit enablement.
- Do not implement scheduled cron/job layer.
- Do not implement POS UI/order adapter.

Reviewed Phase 7A commit:

- `04925152d4e1c16cef2ec7e6e7c2e4e9b566b49b`

Read first:

- `docs/reports/payment-engine-phase-7a-xendit-sandbox-report.md`
- `docs/payment-engine-xendit-sandbox-smoke.md`
- `docs/replit-agent-payment-engine-phase-7a-xendit-sandbox-prompt.md`
- `docs/reports/payment-engine-phase-6-6-dev-ux-smoke-report.md`

## Guardrails

Do not intentionally change legacy order payment behavior:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

Do not implement future phases:

- no provider-level Xendit refund/cancel API
- no Midtrans adapter
- no Stripe adapter
- no production Xendit credentials/support
- no scheduled cron/worker layer
- no external provider polling endpoint
- no POS UI changes
- no order adapter
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet or credit
- no standalone extraction
- no platform-managed settlement/payout

## Main goal

Fix the required Phase 7A integration blockers so `xendit_sandbox` can actually be used through the existing Payment Engine API and real provider webhooks remain recoverable by tenant-scoped reconciliation.

Required fixes:

1. Allow `xendit_sandbox` in `CreateGatewayPayment` gateway-provider policy when the provider is registered/enabled.
2. Fix `xendit-sandbox-smoke.ts` route/body/auth mismatch.
3. Fix `docs/payment-engine-xendit-sandbox-smoke.md` route/body/auth mismatch.
4. Backfill `payment_provider_events.tenantId` after webhook tenant resolution from provider reference.
5. Improve Xendit `reference_id` so multiple attempts per intent do not reuse only `paymentIntentId`.
6. Add integration-level tests proving `CreateGatewayPayment` can use `xendit_sandbox` when registered.
7. Add/update report.

---

## Task 1 — Fix CreateGatewayPayment provider policy

Current blocker:

`CreateGatewayPayment` still has:

```ts
const ALLOWED_GATEWAY_PROVIDERS = new Set<string>(['fake_gateway']);
```

Therefore `provider='xendit_sandbox'` fails before it reaches `XenditProvider`, even when the provider is registered in the registry.

Required behavior:

- `fake_gateway` must remain allowed.
- `xendit_sandbox` must be allowed only when registered/configured.
- Do not allow `manual` through gateway payment flow unless current behavior already requires it.
- Do not hard-enable production providers.
- Keep a safe error when provider is unknown/unregistered.

Preferred implementation:

- Replace static whitelist with a provider policy helper that checks registry membership and provider code.
- Minimal acceptable policy:
  - allow `fake_gateway` always if registered;
  - allow `xendit_sandbox` if registered;
  - reject `manual` for gateway payments;
  - reject unknown providers.

Example intent, not exact required code:

```ts
const provider = this.providerRegistry.get(input.provider);
if (input.provider === 'manual') throw UNSUPPORTED_PROVIDER;
if (!['fake_gateway', 'xendit_sandbox'].includes(input.provider)) throw UNSUPPORTED_PROVIDER;
```

Better if registry exposes `has(providerCode)` or `list()` cleanly. Do not break existing registry tests.

Acceptance tests:

1. `fake_gateway` still works.
2. `xendit_sandbox` works when registered.
3. `xendit_sandbox` returns unsupported/clear error when not registered.
4. `manual` is not accepted by gateway payment flow.
5. Unknown provider is rejected safely.

---

## Task 2 — Add integration-level CreateGatewayPayment Xendit test

Add or update tests to prove the Xendit adapter is reachable through the actual use case path, not only isolated provider tests.

Suggested test file:

- `apps/api/src/__tests__/payment-xendit-gateway-integration.test.ts`

Or extend existing Xendit provider tests if cleaner.

Use mocked HTTP only. No real Xendit network call.

Test should construct:

- `PaymentProviderRegistry`
- `FakeGatewayProvider`
- `XenditProvider` with mock fetch
- `CreateGatewayPayment`
- fake or DB-backed repositories consistent with existing payment tests

Required tests:

1. `CreateGatewayPayment` with `provider='xendit_sandbox'` and mocked `REQUIRES_ACTION` Xendit response creates a `requires_action` transaction.
2. Response includes `providerReference` from `payment_request_id`.
3. Response includes `providerActions` mapped to descriptor `WEB_URL` or `QR_STRING`.
4. `providerPaymentUrl` or `providerQrString` is derived from actions.
5. `fake_gateway` path still passes existing regression.
6. If `xendit_sandbox` is not registered, the use case returns a controlled unsupported-provider error.

Do not rely only on `XenditProvider.createPayment()` unit tests.

---

## Task 3 — Fix Xendit smoke script route/body/auth

Current issues in:

- `apps/api/src/scripts/payment-engine/xendit-sandbox-smoke.ts`

Problems:

- create intent body uses camelCase/wrong fields: `payableType`, `payableId`, `amount`.
- correct controller fields are snake_case: `payable_type`, `payable_id`, `amount_due`.
- gateway endpoint uses singular `/gateway-payment`.
- correct route is plural `/gateway-payments`.
- normal payment-engine routes require operator auth or dev service token; script only sends `x-tenant-id`.

Required changes:

- Require `PAYMENT_ENGINE_SERVICE_TOKEN` with minimum length 32 chars.
- Send header:

```text
x-payment-engine-service-token: $PAYMENT_ENGINE_SERVICE_TOKEN
```

for normal payment-engine routes.

- Keep webhook route docs separate: webhook uses `x-callback-token`, not service token.
- Use correct create intent body:

```json
{
  "payable_type": "order",
  "payable_id": "smoke-order-...",
  "amount_due": 10000,
  "currency": "IDR",
  "allow_partial": false,
  "metadata": { "source": "xendit-sandbox-smoke" }
}
```

- Use correct gateway endpoint:

```text
POST /api/payment-engine/intents/:id/gateway-payments
```

- Unwrap API response correctly according to existing `sendSuccess` response shape if needed. If existing controller returns `{ success, data }`, script must read `data`. If it returns raw result, script should handle both safely but document the actual behavior.

Acceptance:

- Script no longer uses wrong field names.
- Script no longer uses singular gateway route.
- Script sends service token for protected routes.
- Script refuses production.
- Script refuses to run without Xendit sandbox env and service token.

---

## Task 4 — Fix Xendit sandbox smoke docs

Update:

- `docs/payment-engine-xendit-sandbox-smoke.md`

Required corrections:

- Add `PAYMENT_ENGINE_SERVICE_TOKEN` to prerequisites.
- All normal payment-engine curl examples must include:

```bash
-H "x-payment-engine-service-token: $PAYMENT_ENGINE_SERVICE_TOKEN"
-H "x-tenant-id: demo-tenant"
```

- Create intent example must use snake_case fields:

```json
{
  "payable_type": "order",
  "payable_id": "test-order-001",
  "amount_due": 100000,
  "currency": "IDR",
  "allow_partial": false
}
```

- Gateway payment route must be plural:

```text
/api/payment-engine/intents/${INTENT_ID}/gateway-payments
```

- Clarify webhook endpoint does NOT use service token. It uses:

```text
x-callback-token: $XENDIT_WEBHOOK_TOKEN_SANDBOX
```

- Update expected response examples to match actual API response envelope/field naming.

---

## Task 5 — Backfill provider event tenantId after webhook tenant resolution

Current issue:

Real provider webhooks do not carry `x-tenant-id`, which is correct. `HandlePaymentProviderWebhook` initially reserves/inserts provider event with:

```ts
tenantId: input.tenantId ?? null
```

Then it resolves tenant from provider reference / transaction row. However the existing `payment_provider_events` row remains `tenantId = null`.

This breaks tenant-scoped stale recovery because Phase 5 intentionally excludes null-tenant events from tenant-manager reconciliation.

Required behavior:

- After parsing webhook and resolving transaction/tenant from `providerReference`, update the existing provider event row to the resolved tenant id if it is currently null.
- Do this before applying transaction mutation when possible.
- Keep it inside the same DB transaction if the handler uses one around event processing.
- Do not require `x-tenant-id` on real provider webhook.
- Do not trust tenant id from request header over resolved transaction if both exist and conflict. If conflict occurs, fail safely or ignore header and use transaction tenant. Document policy.

Suggested repository method:

```ts
assignTenant(id: string, tenantId: string, tx?: any): Promise<PaymentProviderEvent>
```

Rules:

- Only assign when tenantId is null or already equal to resolved tenantId.
- If event has a different tenantId, throw/mark failed with clear tenant mismatch error.
- Do not allow cross-tenant mutation.

Acceptance tests:

1. Xendit webhook without tenant header resolves transaction tenant and updates provider event tenantId.
2. Provider event tenantId remains unchanged if already same tenant.
3. Conflicting tenant header/event tenant is rejected safely.
4. Stale pending event with resolved tenant can be found by tenant-scoped reconciliation.
5. FakeGateway webhook behavior remains unchanged.

---

## Task 6 — Improve Xendit `reference_id` for multiple attempts

Current issue:

`XenditProvider.createPayment()` sets:

```ts
reference_id = `aurapos-${paymentIntentId}`
```

This can collide when the same payment intent has multiple gateway attempts.

Required behavior:

- Include a per-attempt unique component in Xendit `reference_id`.
- Preferred source order:
  1. explicit provider request reference from input metadata if added by `CreateGatewayPayment`;
  2. idempotency key if safely available;
  3. generated unique suffix.

Do not expose secrets or PII.

Acceptable implementation for Phase 7A:

- `CreateGatewayPayment` generates a `providerRequestId` before calling provider, for example:

```ts
const providerRequestId = `aurapos-${paymentIntentId}-${idempotencyKey ?? crypto.randomUUID()}`;
```

- Pass it into provider via metadata:

```ts
metadata: { ...input.metadata, provider_request_id: providerRequestId }
```

- XenditProvider uses `metadata.provider_request_id` as `reference_id` if present, otherwise falls back to a generated unique safe value.

If changing provider input type is cleaner, do it carefully and keep FakeGateway compatibility.

Acceptance tests:

1. Two Xendit payment attempts for same intent use different `reference_id` when idempotency keys differ.
2. Same idempotency key replay does not create a second provider call or conflicting reference.
3. Xendit request body includes the per-attempt reference.
4. Existing FakeGateway tests still pass.

---

## Task 7 — Review Xendit status and event policy consistency

Keep Phase 7A policy unless there is an obvious bug:

- create-payment `CANCELED`/`EXPIRED` -> internal provider result `failed`.
- webhook `payment_request.expiry` -> `ignored` currently.

This inconsistency is documented, but verify it is intentional. If you keep it, report it clearly as Phase 7A limitation.

Do not add DB enum/status changes in this hardening phase.

---

## Task 8 — Update report

Create:

- `docs/reports/payment-engine-phase-7a-hardening-report.md`

Update original Phase 7A report if useful.

Hardening report must include:

- summary;
- files changed;
- gateway provider policy fix;
- Xendit smoke script route/body/auth fix;
- Xendit docs route/body/auth fix;
- provider event tenant backfill design;
- Xendit reference_id multi-attempt design;
- integration tests added/updated;
- commands run;
- known limitations;
- explicit confirmation that Xendit remains sandbox-only;
- explicit confirmation that no production credentials/support were added;
- explicit confirmation that provider-level refund/cancel was not implemented;
- explicit confirmation that scheduled cron/job layer was not implemented;
- explicit confirmation that POS UI/order adapter was not implemented;
- explicit confirmation that legacy order payment flow was not intentionally changed;
- explicit confirmation that FakeGateway remains unchanged/working.

---

## Commands to run

Run available checks:

- `npm run check`
- Xendit provider tests with the correct tsconfig invocation:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-xendit-provider.test.ts
```

- New Xendit gateway integration tests.
- Provider contract tests if practical.
- Phase 6.5/6.6 FakeGateway tests if practical.
- Phase 1–6.6 payment engine regression tests if practical.

Do not run live Xendit network tests unless explicitly configured with sandbox env. If not run, report as not run and explain prerequisites.

## Commit

Commit with a clear message, for example:

`fix(payment-engine): harden xendit sandbox gateway integration`

Final Replit response must include summary, commit SHA, files changed, tests/checks run, known issues, and confirmation that legacy order payment flow was not intentionally changed.
