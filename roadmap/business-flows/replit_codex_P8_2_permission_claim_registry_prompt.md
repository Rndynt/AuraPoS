# Replit/Codex Prompt P8.2 — Permission Claim Registry for Order Action Policy

Repository: `Rndynt/AuraPoS`

## Goal

Add a centralized permission-claim / role-permission registry for order action policy enforcement.

P8 added backend order-action policy guards. P8.1 added API direct-bypass tests and a conservative role-to-permission mapping for active cancellation. P8.2 must remove the remaining ad-hoc permission mapping risk by creating a shared permission registry that can be used consistently by:

```txt
- RBAC middleware
- OrdersController policy input mapping
- CanPerformOrderAction / assertCanPerformOrderAction inputs
- future refund/void/delete policy guards
- tests and documentation
```

This is a permission model hardening phase, not a new POS feature phase.

## Read first

```txt
roadmap/business-flows/P8_backend_action_policy_guard_report.md
roadmap/business-flows/P8_1_api_direct_bypass_tests_rbac_report.md
roadmap/business-flows/replit_codex_P8_1_api_direct_bypass_tests_rbac_prompt.md
apps/api/src/http/controllers/OrdersController.ts
apps/api/src/__tests__/order-action-direct-bypass.test.ts
packages/application/business-flows/policies/AssertCanPerformOrderAction.ts
packages/application/business-flows/policies/CanPerformOrderAction.ts
packages/application/business-flows/registry/businessFlowProfiles.ts
apps/api/src/**/auth*
apps/api/src/**/rbac*
apps/api/src/**/middleware*
packages/application/**/auth*
packages/domain/**/auth*
```

Search current role/permission logic:

```bash
rg -n "posRole|authTenantUser|role|roles|permission|permissions|rbac|orders:cancel_active|cancel_active|CANCEL_ACTIVE_ORDER|platform-admin|owner|manager|cashier|kitchen|viewer" apps packages shared
```

## Current problem

P8.1 report says the request context exposes coarse roles, not first-class persisted permission claims. It conservatively maps active cancel like this:

```txt
owner -> orders:cancel_active
manager -> orders:cancel_active
platform-admin -> orders:cancel_active
cashier -> none
kitchen/viewer/missing -> none
```

This is safer than the previous behavior, but it is still embedded as a special-case controller mapping.

P8.2 must centralize this mapping in a registry so backend policy inputs are consistent and future refund/void/delete actions do not invent their own permission rules.

## Scope

Allowed:

```txt
- Add a shared permission registry module.
- Add typed order-action permission constants.
- Add role-to-permission mapping helpers.
- Refactor OrdersController to use the registry instead of local hardcoded mapping.
- Update direct-bypass tests to assert the registry behavior.
- Add pure unit tests for the registry.
- Document limitations if the project still has no persisted permission claims.
- Update P8.2 report, roadmap, and PLANS.
```

Forbidden:

```txt
- Do not add DB schema/migrations for persisted permissions in this phase unless already planned and absolutely required.
- Do not rewrite authentication.
- Do not rewrite Better Auth integration.
- Do not rewrite payment engine or NorthFlow.
- Do not loosen active cancel guard.
- Do not make full payment depend on orders_queue.
- Do not map business type back to paid workflow profiles.
- Do not hardcode plan names.
- Do not reintroduce GenericPOSPage or old frontend shims.
```

## Required implementation

### 1. Add typed permission constants

Create a shared/application-layer permission module, for example:

```txt
packages/application/business-flows/permissions/orderActionPermissions.ts
```

or another existing appropriate location.

Define typed constants such as:

```txt
orders:cancel_draft
orders:cancel_active
orders:void
orders:refund
orders:delete_draft
orders:update_draft
orders:pay_active
orders:partial_payment
orders:split_bill
orders:send_to_kitchen
```

Only expose permissions that match current or planned business-flow actions. If some are future-only, mark them as reserved/future in docs/tests and do not wire them to routes that do not exist yet.

### 2. Add role-to-permission registry

Create a pure mapping function, for example:

```txt
resolveOrderActionPermissionsFromRole(role)
resolveOrderActionPermissionsFromRequestContext(context)
```

Expected current mapping:

```txt
platform-admin -> all current order action permissions that are safe for platform/admin operations
owner -> cancel active, cancel draft, pay active, update draft, current safe tenant owner permissions
manager -> cancel active, cancel draft, pay active, update draft, current safe manager permissions
cashier -> cancel draft if allowed, pay active, update draft only when lifecycle/policy allows; no active cancel
kitchen -> kitchen/status relevant actions only if currently supported; no active cancel/payment admin permissions
viewer -> read-only / no mutation permissions
missing/unknown -> no mutation permissions
```

Be conservative. Do not grant permissions that current routes cannot safely support.

### 3. Replace ad-hoc mapping in OrdersController

Refactor `OrdersController.ts` so active cancel and future policy inputs call the registry helper.

Do not keep duplicate local mapping logic in controller.

The controller should:

```txt
- read req.posRole / req.authTenantUser.role as today;
- resolve permissions through the shared registry;
- pass those permissions into assertCanPerformOrderAction / policy context;
- preserve current P8/P8.1 behavior and error codes.
```

### 4. Keep compatibility with current auth/RBAC

If there is no persisted permission-claim array yet, do not fake one. The registry should clearly document that it is role-derived for now.

If request context already contains explicit permission claims, prefer them or merge them with role-derived permissions according to least-privilege rules, and document the precedence.

### 5. Future refund/void/delete readiness

Refund/void/delete order routes are not currently exposed. Do not add these routes.

But reserve permission constants and report how they should be wired if routes are introduced later:

```txt
orders:void
orders:refund
orders:delete_draft
orders:delete_active or avoid active delete entirely
```

Do not grant future dangerous permissions broadly unless current policy explicitly supports them.

## Required tests

### Registry unit tests

Add pure tests for role-to-permission mapping:

```txt
- owner gets orders:cancel_active
- manager gets orders:cancel_active
- platform-admin gets orders:cancel_active
- cashier does not get orders:cancel_active
- kitchen does not get orders:cancel_active
- viewer does not get mutation permissions
- unknown/missing role gets no mutation permissions
```

Also test future/reserved permissions if included:

```txt
- no role accidentally receives refund/void/delete active permission unless intentionally defined
```

### Controller/direct-bypass tests

Update `apps/api/src/__tests__/order-action-direct-bypass.test.ts` or add new focused tests:

```txt
- active cancel with reason as cashier -> rejected
- active cancel with reason as manager -> allowed
- active cancel with reason as owner -> allowed
- active cancel with reason as platform-admin -> allowed if current auth model supports it
- active cancel with missing role -> rejected
```

Ensure tests prove the controller uses the shared registry, not a local mapping.

### Regression checks

Keep existing P8/P8.1 tests passing:

```txt
- full cash payment without orders_queue remains allowed
- partial payment without entitlement remains rejected
- active/kitchen/fired update bypass remains rejected
```

## Validation commands

Run:

```bash
pnpm --filter @pos/application type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/application test
pnpm --filter @pos/api test
pnpm type-check
```

If frontend is touched, also run:

```bash
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/terminal-web test
```

Run cleanup grep:

```bash
rg -n "orders_queue.*full payment|orders_queue.*recordPayment|recordPayment.*orders_queue|plan.*businessProfile|restaurant_table_service.*businessType|businessType.*restaurant_table_service|GenericPOSPage|features/pos/services|features/pos/mappers" apps packages shared
```

Expected:

```txt
- no full payment dependency on orders_queue;
- no business type mapped to paid workflow profile mode;
- no GenericPOSPage or old frontend compatibility shims;
- order action permissions resolved through registry/helper, not ad-hoc controller mapping.
```

## Required report

Create:

```txt
roadmap/business-flows/P8_2_permission_claim_registry_report.md
```

Report must include:

```txt
1. Summary
2. Files changed
3. Permission constants/registry design
4. Role-to-permission matrix
5. OrdersController refactor summary
6. Test matrix and result
7. Refund/void/delete readiness note
8. Validation output
9. Cleanup grep findings
10. Remaining risks
11. Next recommended phase
```

Update:

```txt
roadmap/business-flows/main.md
PLANS.md
```

if those files are used for phase tracking.

## Completion checklist

- [x] Shared permission constants added.
- [x] Role-to-permission registry/helper added.
- [x] OrdersController uses registry/helper for policy input.
- [x] No duplicate local active-cancel permission mapping remains in controller.
- [x] Registry unit tests added.
- [x] Direct-bypass tests updated for role-derived permissions.
- [x] Full payment without orders_queue still tested/passing.
- [x] Refund/void/delete route readiness documented without inventing routes.
- [x] Validation commands run and documented.
- [x] Cleanup grep documented.
- [x] P8.2 report created.

## Commit

```txt
refactor(api): centralize order action permission mapping
```
