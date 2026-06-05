# Payment Orchestration Phase 8G Boundary Audit

Date: 2026-06-05

## Scope

Audited standalone extraction candidates:

- `packages/payment-orchestration-core`
- `packages/payment-orchestration-client-sdk`
- `apps/payment-orchestration-service`

Also inspected temporary schema/migration coupling:

- `shared/schema.ts`
- `migrations/0022_payment_orchestration_standalone.sql`

## Method

- Static source import scan for forbidden runtime dependencies.
- Package dependency review through `package.json` files.
- Targeted source inspection of provider registry, runtime providers, use cases, HTTP routes, DB repositories, and schema mappers.
- Added an automated boundary-purity test that scans standalone package/service source for forbidden imports.

## Audit Results

| Package/service | Forbidden imports found | Allowed workspace imports | External dependencies | Extraction blockers | Fixes made | Remaining deferred items |
|---|---|---|---|---|---|---|
| `packages/payment-orchestration-core` | None. No `@pos/*`, `apps/api`, frontend, or embedded payment-provider imports found. | Internal relative imports only. | TypeScript only through workspace tooling. | None at source boundary level. | Provider runtime contract remains framework-agnostic; no AuraPoS runtime import was added. | Publish/package metadata freeze remains future work. |
| `packages/payment-orchestration-client-sdk` | None. No `@pos/*`, `apps/api`, frontend, or embedded runtime imports found. | Internal relative imports only. | Fetch-compatible runtime, TypeScript tooling. | None at source boundary level. | No code leak found. | API/error contract freeze remains Phase 8J. |
| `apps/payment-orchestration-service` | No forbidden AuraPoS runtime imports. It imports `@northflow/payment-orchestration-core` and temporary `shared/schema.ts` Drizzle tables. | `@northflow/payment-orchestration-core`; local service modules; temporary relative import to `shared/schema.ts`. | `express`, `drizzle-orm` through shared DB layer, Node `crypto`. | `shared/schema.ts` monorepo schema ownership blocks direct extraction until schema/migrations move to standalone ownership. Default Xendit HTTP client is intentionally unconfigured unless injected/configured. | Added standalone provider contract, Xendit sandbox provider, provider registry entry, status refresh use case/route, and boundary-purity test. | Move `payment_orchestration_*` schema/migrations to standalone package/service; add production credential manager and real Xendit runtime wiring outside sandbox. |

## Forbidden Coupling Checklist

| Coupling type | Result |
|---|---|
| `@pos/*` imports | None found in audited standalone source. |
| `apps/api` imports | None found in audited standalone source. Tests live under `apps/api/src/__tests__` by current repo convention, but runtime packages do not import `apps/api`. |
| AuraPoS tenant/session/order imports | None found in audited standalone source. Public runtime contracts use `merchantId`; some compatibility fields such as `externalTenantId` remain external-reference metadata, not ownership scoping. |
| Legacy payment-engine imports | None found in audited standalone source. |
| Frontend/UI imports | None found. |
| AuraPoS API container assumptions | None found. Service has its own container and service-token middleware. |
| Shared schema coupling | Present and documented as the main extraction blocker. |

## External Dependencies

- `@northflow/payment-orchestration-core`: service runtime contracts and repository/domain types.
- `express`: standalone HTTP service.
- `drizzle-orm` via repository implementations against `shared/schema.ts`.
- Node built-ins: `crypto`, `Buffer`, environment variables for secret references.

## Fixes Made in Phase 8G/8H

- Moved provider runtime shape into `apps/payment-orchestration-service/src/infrastructure/providers/StandalonePaymentProvider.ts`.
- Added `xendit_sandbox` standalone provider isolated from embedded AuraPoS provider runtime.
- Added provider registry coverage for `fake_gateway` and `xendit_sandbox` in non-production.
- Added automated boundary-purity import scan test.
- Added status refresh foundation without adding a scheduler/worker.

## Remaining Extraction Blockers

1. `payment_orchestration_*` Drizzle tables are still declared in `shared/schema.ts`.
2. Migration `0022_payment_orchestration_standalone.sql` is still owned by the AuraPoS root migrations folder.
3. Xendit sandbox runtime has an injectable HTTP client and tests, but default runtime HTTP client is intentionally unconfigured until deployment/credential policy is finalized.
4. Provider refund/cancel remains contract/design only; no real money movement implemented.

## Decision Impact

Boundary source purity is acceptable except for the documented schema/migration ownership blocker. The readiness decision therefore depends on whether runtime tests pass and whether deferred schema extraction is acceptable for this phase.
