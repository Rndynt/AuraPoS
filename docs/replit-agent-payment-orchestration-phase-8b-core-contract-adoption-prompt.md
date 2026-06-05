# Replit Agent Prompt — Payment Orchestration Phase 8B Core Contract Adoption

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Orchestration Phase 8B: Core Contract Adoption / Provider Contract Migration**.

Phase 8A created and hardened the hybrid standalone scaffold:

```text
packages/payment-orchestration-core
apps/payment-orchestration-service
packages/payment-orchestration-client-sdk
```

Package namespace:

```text
@northflow/payment-orchestration-core
@northflow/payment-orchestration-service
@northflow/payment-orchestration-client-sdk
```

Phase 8B must **not** move the whole payment system to standalone yet. This phase only makes existing embedded provider contracts and the new core package converge safely.

Current accepted base:

- `cbfd7b3c4d0671a9d9d8553589aef05c79bd78fa`

Read first:

- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `docs/reports/payment-orchestration-phase-8a-hardening-report.md`
- `docs/replit-agent-payment-orchestration-phase-8a-hardening-prompt.md`
- `docs/reports/payment-engine-phase-7a-xendit-sandbox-report.md`
- `docs/reports/payment-engine-phase-7a-hardening-report.md`

---

## Guardrails

Do not implement unrelated future phases:

- no standalone DB schema yet
- no real payment-orchestration-service implementation yet
- no DB repository migration yet
- no AuraPoS SDK consumption yet
- no embedded route deletion
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
- FakeGateway E2E
- Xendit sandbox gateway integration
- webhook handling
- refund/void/reconciliation behavior

---

## Main goal

Adopt `@northflow/payment-orchestration-core` contracts in a controlled way, starting with the safest boundary: provider actions, provider capabilities, and client naming.

This phase should:

1. Rename the new SDK public class and errors from `PaymentEngine*` to `PaymentOrchestration*`.
2. Keep temporary backwards-compatible aliases only where useful.
3. Move or re-export provider action/capability contracts from the new core package as the canonical standalone contract.
4. Create adapter/mapping helpers between embedded payment provider types and core provider types.
5. Make FakeGateway and Xendit provider outputs type-compatible with core provider action/capability shapes without changing runtime behavior.
6. Add tests proving the mappings do not change provider behavior.
7. Update docs and report.

This phase must remain contract/adaptor-focused.

---

## Task 1 — Rename SDK public class and errors

Current issue:

The new client SDK is now named:

```text
@northflow/payment-orchestration-client-sdk
```

but the exported class is still:

```ts
PaymentEngineClient
PaymentEngineClientError
PaymentEngineNetworkError
PaymentEngineClientConfig
```

Required:

Rename primary public names to:

```ts
PaymentOrchestrationClient
PaymentOrchestrationClientError
PaymentOrchestrationNetworkError
PaymentOrchestrationClientConfig
```

Files likely involved:

```text
packages/payment-orchestration-client-sdk/src/client.ts
packages/payment-orchestration-client-sdk/src/errors.ts
packages/payment-orchestration-client-sdk/src/types.ts
packages/payment-orchestration-client-sdk/src/index.ts
```

Recommended compatibility during monorepo transition:

```ts
export { PaymentOrchestrationClient as PaymentEngineClient };
export { PaymentOrchestrationClientError as PaymentEngineClientError };
export { PaymentOrchestrationNetworkError as PaymentEngineNetworkError };
export type { PaymentOrchestrationClientConfig as PaymentEngineClientConfig };
```

Because this is dev-only, full rename is acceptable, but aliases are useful to prevent later agent confusion. If aliases are retained, mark them as deprecated in comments.

Acceptance:

- Primary examples use `PaymentOrchestrationClient`.
- `PaymentEngineClient` is not the primary documented class anymore.
- Type-check passes.
- Existing SDK method paths remain unchanged.

---

## Task 2 — Make core provider contracts canonical

Inspect existing embedded provider types. They are likely in:

```text
packages/domain/payments/provider.ts
packages/application/payments/PaymentProviderRegistry.ts
packages/infrastructure/payments/providers/FakeGatewayProvider.ts
packages/infrastructure/payments/providers/XenditProvider.ts
```

The standalone core already has:

```text
packages/payment-orchestration-core/src/providers/providerActions.ts
packages/payment-orchestration-core/src/providers/providerCapabilities.ts
```

Phase 8B target:

- `@northflow/payment-orchestration-core` should become the canonical shape for:
  - provider action type
  - action descriptor
  - provider capabilities
- Do not break embedded provider runtime behavior.
- Avoid mass file moves.
- Prefer mapping/adapters first.

Required:

1. Compare embedded provider action/capability types with core types.
2. If core type lacks fields that embedded providers already use, extend core type safely.
3. Do not remove existing embedded types if too risky.
4. Add explicit mapping helpers so embedded provider output can be converted to core DTO shape.

Suggested new file:

```text
packages/application/payments/PaymentProviderCoreAdapter.ts
```

or better if the repo has a cleaner location:

```text
packages/application/payments/adapters/PaymentProviderCoreAdapter.ts
```

Potential helpers:

```ts
import type {
  PaymentProviderAction as CorePaymentProviderAction,
  PaymentProviderCapabilities as CorePaymentProviderCapabilities,
} from '@northflow/payment-orchestration-core';

export function toCoreProviderAction(action: EmbeddedProviderAction): CorePaymentProviderAction
export function toCoreProviderActions(actions: EmbeddedProviderAction[]): CorePaymentProviderAction[]
export function toCoreProviderCapabilities(capabilities: EmbeddedProviderCapabilities): CorePaymentProviderCapabilities
```

If import via package name is not available in current tsconfig, add a path alias only for `@northflow/payment-orchestration-core`. Do not break existing `@pos/*` aliases.

Acceptance:

- Core provider action/capability shape can represent all currently emitted FakeGateway/Xendit actions.
- No runtime behavior changes in existing API response.
- No broad provider rewrites.

---

## Task 3 — Type-compatible provider outputs without runtime behavior changes

Update embedded providers and/or use-case output typing minimally so provider action/capability values are compatible with core contracts.

Important providers:

```text
packages/infrastructure/payments/providers/FakeGatewayProvider.ts
packages/infrastructure/payments/providers/XenditProvider.ts
packages/infrastructure/payments/providers/ManualProvider.ts
```

Do NOT change actual behavior:

- FakeGateway scenarios unchanged.
- Xendit sandbox request/response mapping unchanged.
- provider codes unchanged:
  - `fake_gateway`
  - `xendit_sandbox`
  - `manual`
- webhook verification/parsing unchanged.
- provider actions descriptors unchanged.

Allowed changes:

- Type imports.
- Adapter mapping functions.
- Narrow comments/JSDoc.
- Extra compile-time tests.

Not allowed:

- changing action descriptor strings
- changing provider status mapping
- changing webhook behavior
- changing `CreateGatewayPayment` settlement behavior
- changing idempotency behavior
- changing DB schema

---

## Task 4 — Add contract compatibility tests

Add tests that prove embedded provider outputs can be mapped to core contracts.

Suggested test file:

```text
apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts
```

Required coverage:

1. FakeGateway QRIS action maps to core `present_qr` + `QR_STRING`.
2. FakeGateway VA action maps to core `display_code` + `VA_NUMBER`.
3. FakeGateway redirect action maps to core `redirect_customer` + `WEB_URL`.
4. Xendit redirect action maps to core `redirect_customer` + `WEB_URL`.
5. Xendit QR action maps to core `present_qr` + `QR_STRING`.
6. Xendit VA action maps to core `display_code` + `VA_NUMBER`.
7. Provider capability mapping preserves existing booleans for FakeGateway.
8. Provider capability mapping preserves existing booleans for Xendit sandbox.
9. Existing FakeGateway E2E tests still pass if practical.
10. Existing Xendit gateway integration tests still pass.

Use mocked provider responses only. Do not call real Xendit network.

---

## Task 5 — Update `payment-orchestration-core` exports if needed

If adapter/tests need provider contract names that are missing from core exports, update:

```text
packages/payment-orchestration-core/src/index.ts
packages/payment-orchestration-core/src/providers/providerActions.ts
packages/payment-orchestration-core/src/providers/providerCapabilities.ts
```

Keep these names clear and standalone:

```ts
PaymentProviderAction
PaymentProviderActionType
PaymentProviderActionDescriptor
PaymentProviderCapabilities
```

Do not rename these to `PaymentEngine*`.

If additional provider result contract is needed, add cautiously, e.g.:

```text
packages/payment-orchestration-core/src/providers/providerResults.ts
```

Only add if necessary. Do not overbuild.

---

## Task 6 — Update docs

Update:

```text
docs/payment-orchestration-hybrid-standalone-architecture.md
```

Add Phase 8B section explaining:

- Phase 8A created scaffold.
- Phase 8B adopts core provider contracts.
- Runtime traffic still stays in embedded AuraPoS API.
- `@northflow/payment-orchestration-core` is becoming canonical for provider action/capability contracts.
- SDK primary class is now `PaymentOrchestrationClient`.
- `PaymentEngineClient` alias, if kept, is deprecated.
- No DB schema migration yet.
- No standalone service real use cases yet.

Also update any SDK usage examples to use:

```ts
import { PaymentOrchestrationClient } from '@northflow/payment-orchestration-client-sdk';
```

instead of `PaymentEngineClient`.

---

## Task 7 — Report

Create:

```text
docs/reports/payment-orchestration-phase-8b-core-contract-adoption-report.md
```

Report must include:

- summary;
- files changed;
- SDK rename summary;
- deprecated aliases, if kept;
- core provider contract adoption details;
- provider adapter/mapping design;
- tests added/updated;
- commands run with pass/fail/not-run;
- known limitations;
- explicit confirmation that no DB schema was added;
- explicit confirmation that standalone service remains skeleton / no real use cases wired;
- explicit confirmation that no real provider behavior changed;
- explicit confirmation that Xendit sandbox adapter behavior remains intact;
- explicit confirmation that FakeGateway behavior remains intact;
- explicit confirmation that provider-level refund/cancel was not implemented;
- explicit confirmation that POS UI/order adapter was not implemented;
- explicit confirmation that legacy order payment flow was not intentionally changed;
- explicit confirmation that embedded `/api/payment-engine/...` routes remain the runtime source of truth.

---

## Task 8 — Commands to run

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

Run relevant tests:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-xendit-gateway-integration.test.ts
```

If FakeGateway E2E test is available and practical, run it too.

Do not run live provider smoke tests unless explicitly configured.
Do not fake success. If a command cannot run, report the exact reason.

---

## Acceptance criteria

1. SDK primary class is `PaymentOrchestrationClient`.
2. SDK primary error names use `PaymentOrchestration*`.
3. `PaymentEngine*` SDK names are either removed or explicitly marked deprecated aliases.
4. Core provider action/capability contracts can represent FakeGateway and Xendit outputs.
5. Adapter/mapping helpers exist between embedded provider contract and core provider contract.
6. Contract compatibility tests exist and pass.
7. Existing Xendit sandbox integration test still passes.
8. FakeGateway behavior remains unchanged.
9. No DB schema migration is added.
10. `apps/payment-orchestration-service` remains skeleton only.
11. Embedded `/api/payment-engine/...` routes remain operational.
12. Report is created and honest about commands/checks.

---

## Commit

Commit with a clear message, for example:

```text
refactor(payment-orchestration): adopt core provider contracts
```

Final Replit response must include:

- summary;
- commit SHA;
- files changed;
- tests/checks run;
- known issues;
- confirmation that no provider behavior changed;
- confirmation that no DB schema/service implementation was added;
- confirmation that no POS UI/order adapter was implemented;
- confirmation that legacy order payment flow was not intentionally changed.
