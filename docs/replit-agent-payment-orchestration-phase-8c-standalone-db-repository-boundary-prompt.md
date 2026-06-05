# Replit Agent Prompt — Payment Orchestration Phase 8C Standalone DB Schema + Repository Boundary

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Orchestration Phase 8C: Standalone DB Schema + Repository Boundary**.

Phases completed:

```text
8A  — Hybrid standalone scaffold
8A-H — Rename to @northflow/payment-orchestration-*
8B  — Core contract adoption / provider contract adapter
```

Current accepted base:

- `05f98ef7d5528c588112ca363161dd3c294d24a6`

Read first:

- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `docs/reports/payment-orchestration-phase-8a-hardening-report.md`
- `docs/reports/payment-orchestration-phase-8b-core-contract-adoption-report.md`
- `docs/replit-agent-payment-orchestration-phase-8b-core-contract-adoption-prompt.md`
- `docs/reports/payment-engine-phase-7a-hardening-report.md`

---

## Important user context

The app is still in development.

- No production users.
- No production data compatibility requirement.
- Old payment-engine data does not need to be preserved.
- It is acceptable to add a clean standalone schema path without elaborate legacy migration/backfill.
- However, do not break existing embedded AuraPoS payment-engine behavior during this phase.

The selected architecture is Model 3 Hybrid:

```text
@northflow/payment-orchestration-core
@northflow/payment-orchestration-service
@northflow/payment-orchestration-client-sdk
```

Phase 8C is still **not** full standalone service implementation. It only creates DB/schema/repository boundary for the standalone service.

---

## Guardrails

Do not implement unrelated future phases:

- no full `apps/payment-orchestration-service` use-case wiring yet
- no route/controller implementation beyond keeping placeholders unless small health metadata updates are needed
- no AuraPoS SDK consumption yet
- no embedded `/api/payment-engine` route deletion
- no provider-level Xendit refund/cancel
- no Midtrans adapter
- no Stripe adapter
- no scheduled cron/worker layer
- no external provider polling endpoint
- no POS UI changes
- no order adapter
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet/credit
- no platform-managed settlement/payout

Do not intentionally modify legacy order payment flow:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

Existing embedded payment-engine routes must continue to work:

- `/api/payment-engine/...`
- FakeGateway behavior
- Xendit sandbox behavior
- webhook handling
- refund/void/reconciliation behavior

---

## Main goal

Create the standalone payment orchestration persistence boundary:

1. Add standalone-ready DB schema definitions for Northflow Payment Orchestration.
2. Add repository port interfaces in `@northflow/payment-orchestration-core`.
3. Add infrastructure repository skeletons for `apps/payment-orchestration-service`.
4. Add type-safe mapping between DB rows and core contracts.
5. Keep the service skeleton; do not wire real HTTP routes yet.
6. Add tests for schema/repository mapping and uniqueness/idempotency assumptions.
7. Update architecture docs and report.

This phase prepares Phase 8D, where the standalone service will be wired to real use cases and providers.

---

## Naming rules

Use `payment_orchestration_*` for standalone DB tables, not `payment_engine_*`.

Use `merchant_id` as the primary payment owner identity, not AuraPoS `tenant_id`.

Recommended table prefix:

```text
payment_orchestration_merchants
payment_orchestration_provider_accounts
payment_orchestration_intents
payment_orchestration_transactions
payment_orchestration_provider_events
payment_orchestration_idempotency_keys
```

Do not use `@pos/payment-engine-*` names in new standalone code.

---

## Task 1 — Add standalone schema definitions

Inspect existing schema style first, especially:

- `shared/schema.ts`
- existing payment tables in the embedded payment engine
- repository patterns under `packages/infrastructure/repositories/payments`

Add standalone schema definitions in the most appropriate location for this repo.

Preferred approach:

- If `shared/schema.ts` is the central Drizzle schema file, add the new standalone tables there under a clearly separated section:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Northflow Payment Orchestration standalone schema — Phase 8C
// ─────────────────────────────────────────────────────────────────────────────
```

Alternative if the repo supports schema modules:

```text
shared/payment-orchestration-schema.ts
```

and export it from the central schema index. Choose the style that best matches the repo.

Required tables:

### 1. `payment_orchestration_merchants`

Fields:

```text
id text primary key
external_ref text nullable
source_app text nullable
name text not null
legal_name text nullable
status text not null default 'active'
metadata jsonb not null default '{}'
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Indexes/constraints:

```text
unique(source_app, external_ref) where both are not null, if Drizzle/Postgres supports partial unique cleanly
index(status)
```

If partial unique is awkward in current schema style, document limitation and add regular indexes instead.

### 2. `payment_orchestration_provider_accounts`

Fields:

```text
id text primary key
merchant_id text not null references payment_orchestration_merchants(id)
provider text not null
provider_account_ref text nullable
environment text not null // sandbox | test | production
status text not null default 'active'
credentials_ref text nullable
public_config jsonb not null default '{}'
metadata jsonb not null default '{}'
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Indexes/constraints:

```text
index(merchant_id)
unique(merchant_id, provider, environment, provider_account_ref) if practical
```

Important:

- Do not store raw API keys/secrets in this table.
- `credentials_ref` points to env/secret-manager reference only.

### 3. `payment_orchestration_intents`

Fields:

```text
id text primary key
merchant_id text not null references payment_orchestration_merchants(id)
provider_account_id text nullable references payment_orchestration_provider_accounts(id)
source_app text nullable
external_tenant_id text nullable
external_outlet_id text nullable
external_location_id text nullable
external_payable_type text not null
external_payable_id text not null
amount_due integer not null
amount_paid integer not null default 0
amount_refunded integer not null default 0
amount_remaining integer not null
currency text not null default 'IDR'
status text not null
allow_partial boolean not null default false
expires_at timestamp nullable
metadata jsonb not null default '{}'
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Indexes/constraints:

```text
index(merchant_id)
index(source_app, external_tenant_id)
index(external_payable_type, external_payable_id)
unique(merchant_id, source_app, external_payable_type, external_payable_id) if practical
check(amount_due >= 0)
check(amount_paid >= 0)
check(amount_refunded >= 0)
check(amount_remaining >= 0)
```

Status values should align with existing/core intent statuses as much as practical:

```text
requires_payment
partially_paid
paid
overpaid
refunded
voided
expired
cancelled
failed
```

If current code uses a narrower union, do not break it; document the standalone status policy.

### 4. `payment_orchestration_transactions`

Fields:

```text
id text primary key
merchant_id text not null references payment_orchestration_merchants(id)
intent_id text not null references payment_orchestration_intents(id)
provider_account_id text nullable references payment_orchestration_provider_accounts(id)
provider text not null
method text not null
transaction_type text not null
status text not null
direction text not null
amount integer not null
currency text not null default 'IDR'
parent_transaction_id text nullable references payment_orchestration_transactions(id)
provider_reference text nullable
provider_event_id text nullable
provider_payment_url text nullable
provider_qr_string text nullable
failure_reason text nullable
idempotency_key text nullable
metadata jsonb not null default '{}'
raw_provider_response jsonb nullable
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Indexes/constraints:

```text
index(merchant_id)
index(intent_id)
index(provider, provider_reference)
unique(provider, provider_reference) where provider_reference is not null, if practical
unique(merchant_id, idempotency_key) where idempotency_key is not null, if practical
check(amount >= 0)
```

`direction` values:

```text
incoming
outgoing
```

`transaction_type` values:

```text
payment
deposit
refund
void
settlement
adjustment
```

`status` values:

```text
pending
requires_action
succeeded
failed
cancelled
expired
voided
refunded
ignored
```

### 5. `payment_orchestration_provider_events`

Fields:

```text
id text primary key
merchant_id text nullable references payment_orchestration_merchants(id)
provider text not null
provider_event_id text not null
provider_reference text nullable
event_type text not null
processing_status text not null default 'pending'
processing_attempts integer not null default 0
last_error text nullable
raw_headers jsonb not null default '{}'
raw_body jsonb nullable
parsed_payload jsonb nullable
received_at timestamp not null default now()
processed_at timestamp nullable
created_at timestamp not null default now()
updated_at timestamp not null default now()
```

Indexes/constraints:

```text
unique(provider, provider_event_id)
index(merchant_id)
index(provider, provider_reference)
index(processing_status)
index(received_at)
```

Important:

- Real provider webhook does not carry tenant/merchant header.
- `merchant_id` may initially be null, then backfilled after providerReference resolves to a transaction/intent.
- This mirrors the embedded tenant backfill hardening, but standalone uses merchantId.

### 6. `payment_orchestration_idempotency_keys`

Fields:

```text
id text primary key
merchant_id text not null references payment_orchestration_merchants(id)
scope text not null
idempotency_key text not null
request_hash text not null
response_snapshot jsonb nullable
resource_type text nullable
resource_id text nullable
status text not null default 'processing'
created_at timestamp not null default now()
updated_at timestamp not null default now()
expires_at timestamp nullable
```

Indexes/constraints:

```text
unique(merchant_id, scope, idempotency_key)
index(expires_at)
index(status)
```

Purpose:

- Future standalone create intent/payment/refund idempotency.
- Do not wire it into live use cases yet unless trivial and isolated.

---

## Task 2 — Add core repository port interfaces

Add repository interfaces to:

```text
packages/payment-orchestration-core/src/application/ports.ts
```

or split to:

```text
packages/payment-orchestration-core/src/application/repositories.ts
```

and export from `src/index.ts`.

Required interfaces:

```ts
PaymentMerchantRepository
PaymentProviderAccountRepository
PaymentIntentRepository
PaymentTransactionRepository
PaymentProviderEventRepository
PaymentIdempotencyRepository
```

Use standalone naming and core DTOs. Do not reference AuraPoS `tenantId`.

Example shape, adapt to current core contracts:

```ts
export interface PaymentMerchantRepository {
  findById(id: string): Promise<PaymentMerchant | null>;
  findByExternalRef(input: { sourceApp: string; externalRef: string }): Promise<PaymentMerchant | null>;
  create(input: CreatePaymentMerchantInput): Promise<PaymentMerchant>;
  updateStatus(id: string, status: PaymentMerchant['status']): Promise<PaymentMerchant>;
}
```

Payment intent repository should support:

```ts
findById(id)
findByExternalPayable(input)
create(input)
updateTotals(input)
updateStatus(input)
```

Transaction repository should support:

```ts
findById(id)
findByIntentId(intentId)
findByProviderReference(provider, providerReference)
create(input)
updateStatus(input)
sumSucceededRefundsByParent(parentTransactionId)
```

Provider event repository should support:

```ts
reserveEvent(input)
findByProviderEventId(provider, providerEventId)
assignMerchant(eventId, merchantId)
markProcessed(eventId)
markFailed(eventId, error)
findStalePending(input)
```

Idempotency repository should support:

```ts
reserve(input)
find(input)
markCompleted(input)
markFailed(input)
```

Keep interfaces pragmatic. Do not overbuild with every future method.

---

## Task 3 — Add service infrastructure repository skeletons

Inside:

```text
apps/payment-orchestration-service/src/infrastructure/repositories
```

Create repository classes that implement the core ports, but do not wire them into routes yet.

Recommended files:

```text
apps/payment-orchestration-service/src/infrastructure/repositories/DrizzlePaymentMerchantRepository.ts
apps/payment-orchestration-service/src/infrastructure/repositories/DrizzlePaymentProviderAccountRepository.ts
apps/payment-orchestration-service/src/infrastructure/repositories/DrizzlePaymentIntentRepository.ts
apps/payment-orchestration-service/src/infrastructure/repositories/DrizzlePaymentTransactionRepository.ts
apps/payment-orchestration-service/src/infrastructure/repositories/DrizzlePaymentProviderEventRepository.ts
apps/payment-orchestration-service/src/infrastructure/repositories/DrizzlePaymentIdempotencyRepository.ts
apps/payment-orchestration-service/src/infrastructure/repositories/mappers.ts
```

Because Phase 8C is boundary-focused, these can be minimal but should compile.

Acceptable levels:

Option A — Implement basic methods with Drizzle queries if the DB import path is clear and low-risk.

Option B — Create skeleton classes with constructor dependency and methods throwing:

```ts
throw new Error('Not implemented until Phase 8D');
```

but with full interface signatures and mapper functions.

Preference:

- Implement mapping helpers and interfaces fully.
- Implement repository classes as skeletons only if DB integration is not clean yet.
- Do not break `npm run check`.

---

## Task 4 — Add DB row ↔ core DTO mappers

Create mappers for standalone schema rows to core DTOs.

Examples:

```ts
mapMerchantRow(row): PaymentMerchant
mapProviderAccountRow(row): PaymentProviderAccount
mapIntentRow(row): PaymentIntentDTO or PaymentIntent
mapTransactionRow(row): PaymentTransactionDTO or PaymentTransaction
mapProviderEventRow(row): PaymentProviderEventDTO
```

Rules:

- Convert snake_case DB fields to camelCase DTO fields.
- Preserve `merchantId` naming in core DTOs.
- Do not introduce `tenantId` into standalone DTOs.
- Metadata json must default to `{}`.
- Nullable timestamps/fields handled explicitly.

If current core contracts lack DTOs for provider events/idempotency, add minimal exported DTO types.

---

## Task 5 — Add migration/generation notes

If the repo uses Drizzle migration generation, do not attempt to run live DB migrations unless the repo already has a clear migration flow.

Add docs section explaining:

- schema definitions added;
- migration file generated or not generated;
- if not generated, exact command to generate;
- this is dev-only and can be reset.

If a migration file is generated, ensure it only adds new `payment_orchestration_*` tables and does not alter existing embedded payment or legacy order tables.

---

## Task 6 — Add tests

Add tests for schema/repository boundary.

Suggested test file:

```text
apps/payment-orchestration-service/src/__tests__/payment-orchestration-schema-mappers.test.ts
```

or under `apps/api/src/__tests__` if test runner setup is easier, but prefer service package if practical.

Required tests:

1. Merchant row maps to `PaymentMerchant` with `merchantId`/`id` correctly.
2. Provider account row maps without exposing credentials.
3. Intent row maps external refs:
   - `sourceApp`
   - `externalTenantId`
   - `externalOutletId`
   - `externalLocationId`
   - `externalPayableType`
   - `externalPayableId`
4. Transaction row maps provider refs/action fields safely.
5. Provider event row supports nullable `merchantId` before resolution.
6. Idempotency key row maps status/resource snapshot correctly.
7. No mapper output includes AuraPoS `tenantId` field.

If real DB tests are not practical, mapper/unit tests are enough for Phase 8C.

Do not require live DB for these tests.

---

## Task 7 — Update architecture docs

Update:

```text
docs/payment-orchestration-hybrid-standalone-architecture.md
```

Add Phase 8C section:

- standalone schema added;
- `merchantId` primary owner identity;
- `externalTenantId` only source-app reference;
- provider account credentials are references only, no raw secrets;
- service still skeleton;
- embedded `/api/payment-engine/...` remains runtime source of truth;
- Phase 8D will wire service use cases to repositories/providers.

Update next phases table accordingly:

```text
8C — Standalone DB schema + repository boundary
8D — Wire service use cases/controllers/providers
8E — AuraPoS consumes SDK
8F — Remove embedded engine after parity
```

---

## Task 8 — Add report

Create:

```text
docs/reports/payment-orchestration-phase-8c-standalone-db-repository-boundary-report.md
```

Report must include:

- summary;
- files changed;
- tables added;
- repository ports added;
- repository skeletons/mappers added;
- migration status;
- tests added/updated;
- commands run with pass/fail/not-run;
- known limitations;
- explicit confirmation that no existing embedded payment table was modified intentionally;
- explicit confirmation that no legacy order payment flow was intentionally changed;
- explicit confirmation that no real provider behavior changed;
- explicit confirmation that Xendit sandbox adapter remains intact;
- explicit confirmation that FakeGateway remains intact;
- explicit confirmation that provider-level refund/cancel was not implemented;
- explicit confirmation that `apps/payment-orchestration-service` remains skeleton / routes still 501;
- explicit confirmation that embedded `/api/payment-engine/...` remains runtime source of truth.

---

## Commands to run

Run:

```bash
npm run check
```

Run package checks:

```bash
pnpm --filter @northflow/payment-orchestration-core type-check
pnpm --filter @northflow/payment-orchestration-service type-check
pnpm --filter @northflow/payment-orchestration-client-sdk type-check
```

Run new mapper/schema tests:

```bash
npx tsx --tsconfig apps/payment-orchestration-service/tsconfig.json --test apps/payment-orchestration-service/src/__tests__/payment-orchestration-schema-mappers.test.ts
```

If service package test runner cannot resolve workspace aliases, use the existing API test runner but document why.

Run existing contract/provider tests if practical:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-xendit-gateway-integration.test.ts
```

Do not run live provider smoke tests unless explicitly configured.
Do not fake success. If a command cannot run, report the exact reason.

---

## Acceptance criteria

1. Standalone `payment_orchestration_*` schema definitions exist.
2. Schema uses `merchant_id`, not `tenant_id`, as primary owner identity.
3. `external_tenant_id` exists only as source-app reference.
4. Provider account table stores `credentials_ref`, not raw secrets.
5. Core repository port interfaces exist and are exported.
6. Service infrastructure repository skeletons/mappers exist and compile.
7. Mapper tests exist and pass without live DB.
8. No existing embedded payment table is intentionally modified.
9. No provider behavior changes.
10. No standalone route is fully wired yet; service remains skeleton.
11. Existing Phase 8B adapter test still passes.
12. Xendit integration test still passes if practical.
13. Report is created and honest.

---

## Commit

Commit with a clear message, for example:

```text
feat(payment-orchestration): add standalone schema repository boundary
```

Final Replit response must include:

- summary;
- commit SHA;
- files changed;
- tests/checks run;
- known issues;
- confirmation that no provider behavior changed;
- confirmation that service routes remain skeleton/501;
- confirmation that no POS UI/order adapter was implemented;
- confirmation that legacy order payment flow was not intentionally changed.
