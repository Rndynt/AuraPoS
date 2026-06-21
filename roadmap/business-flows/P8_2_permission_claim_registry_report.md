# P8.2 Permission Claim Registry Report

Date: 2026-06-21

## 1. Summary

P8.2 centralizes order-action permission constants and role-derived permission resolution in the application layer, then refactors `OrdersController` to use that shared registry for backend policy inputs instead of a controller-local active-cancel mapping.

Implemented:

- Added typed order-action permission constants and a conservative role-to-permission registry.
- Added request-context permission resolution that derives from `req.posRole` / `req.authTenantUser.role` and safely intersects explicit claims when provided.
- Refactored active order cancellation in `OrdersController` to call the shared registry.
- Added pure registry unit tests for role mapping and reserved dangerous permissions.
- Expanded controller/direct-bypass tests for owner, platform-admin, and missing-role active cancellation cases.
- Preserved existing P8/P8.1 behavior for full payments without `orders_queue`, partial payment entitlement rejection, and active/kitchen/fired update bypass rejection.

Not implemented:

- No DB schema/migration for persisted permission claims was added in this phase.
- No refund, void, active-delete, or draft-delete API routes were introduced.
- No authentication or Better Auth rewrite was performed.

## 2. Files changed

| File | Change |
| --- | --- |
| `packages/application/business-flows/permissions/orderActionPermissions.ts` | New centralized permission constants, role registry, request-context resolver, and reserved future permission list. |
| `packages/application/business-flows/index.ts` | Exports the permission registry from the business-flow application public API. |
| `packages/application/business-flows/__tests__/orderActionPermissions.test.ts` | Adds pure tests for role-to-permission behavior and reserved permissions. |
| `packages/application/package.json` | Adds the registry unit test to `@pos/application` test script. |
| `apps/api/src/http/controllers/OrdersController.ts` | Replaces the local active-cancel permission mapping with the shared registry helper. |
| `apps/api/src/__tests__/order-action-direct-bypass.test.ts` | Adds direct-bypass coverage for owner, platform-admin, and missing role active cancellation. |
| `roadmap/business-flows/main.md` | Tracks P8.2 completion in the roadmap. |
| `roadmap/business-flows/replit_codex_P8_2_permission_claim_registry_prompt.md` | Marks the P8.2 completion checklist as implemented/validated. |
| `PLANS.md` | Adds the active execution record and validation log for P8.2. |

## 3. Permission constants/registry design

The registry lives at:

```txt
packages/application/business-flows/permissions/orderActionPermissions.ts
```

It exposes:

- `ORDER_ACTION_PERMISSIONS`
- `OrderActionPermission`
- `OrderActionRole`
- `ROLE_ORDER_ACTION_PERMISSION_REGISTRY`
- `RESERVED_FUTURE_ORDER_ACTION_PERMISSIONS`
- `resolveOrderActionPermissionsFromRole(role)`
- `resolveOrderActionPermissionsFromRequestContext(context)`

Current limitation is explicit in module comments: AuraPoS still does not persist first-class permission claims on tenant users or auth sessions. The registry is therefore role-derived for now.

If explicit permission claims are supplied later through request/session context, the resolver currently uses least-privilege behavior: explicit claims are intersected with the role-derived baseline instead of being unioned into broader access. This avoids accidentally escalating a cashier or unknown role by accepting untrusted ad-hoc claims.

## 4. Role-to-permission matrix

| Role | Current mapped order-action permissions | Active cancel? | Reserved refund/void/delete? |
| --- | --- | --- | --- |
| `platform-admin` | `orders:cancel_draft`, `orders:cancel_active`, `orders:update_draft`, `orders:pay_active`, `orders:partial_payment`, `orders:split_bill`, `orders:send_to_kitchen` | Yes | No |
| `owner` | `orders:cancel_draft`, `orders:cancel_active`, `orders:update_draft`, `orders:pay_active`, `orders:partial_payment`, `orders:split_bill`, `orders:send_to_kitchen` | Yes | No |
| `manager` | `orders:cancel_draft`, `orders:cancel_active`, `orders:update_draft`, `orders:pay_active`, `orders:partial_payment`, `orders:split_bill`, `orders:send_to_kitchen` | Yes | No |
| `cashier` | `orders:cancel_draft`, `orders:update_draft`, `orders:pay_active`, `orders:partial_payment`, `orders:split_bill`, `orders:send_to_kitchen` | No | No |
| `kitchen` | `orders:send_to_kitchen` | No | No |
| `viewer` | none | No | No |
| unknown/missing | none | No | No |

Notes:

- Existing policy/lifecycle checks still determine whether a mapped action is actually allowed for a specific order state.
- Entitlement checks still gate partial payment, split bill, and kitchen-related capabilities where enforced by the business-flow policy.
- Reserved dangerous permissions are intentionally not granted to any role in this phase.

## 5. OrdersController refactor summary

Before P8.2, `OrdersController.ts` had a local helper that mapped `owner`, `manager`, and `platform-admin` to `orders:cancel_active` directly inside the controller.

After P8.2:

- The local helper was removed.
- The controller imports `resolveOrderActionPermissionsFromRequestContext` from `@pos/application/business-flows`.
- Active cancellation policy input now resolves actor permissions through the shared registry using current request role context.
- Existing active-cancel reason and policy behavior remains unchanged: cashier/missing role are rejected; manager/owner/platform-admin are allowed when policy/lifecycle checks pass.

## 6. Test matrix and result

| Area | Case | Result |
| --- | --- | --- |
| Registry unit | owner gets `orders:cancel_active` | Passed |
| Registry unit | manager gets `orders:cancel_active` | Passed |
| Registry unit | platform-admin gets `orders:cancel_active` | Passed |
| Registry unit | cashier does not get `orders:cancel_active` | Passed |
| Registry unit | kitchen does not get `orders:cancel_active` | Passed |
| Registry unit | viewer gets no mutation permissions | Passed |
| Registry unit | unknown/missing role gets no mutation permissions | Passed |
| Registry unit | no role receives reserved refund/void/delete permissions | Passed |
| Registry unit | explicit claims are intersected with role baseline | Passed |
| Controller/direct-bypass | active cancel with reason as cashier rejected | Passed |
| Controller/direct-bypass | active cancel with reason as manager allowed | Passed |
| Controller/direct-bypass | active cancel with reason as owner allowed | Passed |
| Controller/direct-bypass | active cancel with reason as platform-admin allowed | Passed |
| Controller/direct-bypass | active cancel with missing role rejected | Passed |
| Regression | full cash payment without `orders_queue` allowed | Passed |
| Regression | partial payment without entitlement rejected | Passed |
| Regression | active/kitchen/fired update bypass rejected | Passed |

## 7. Refund/void/delete readiness note

P8.2 reserves permission constants for future dangerous actions:

- `orders:void`
- `orders:void_item`
- `orders:refund`
- `orders:delete_draft`
- `orders:delete_active`

No refund/void/delete routes were added. If future routes are introduced, they should:

1. Use the shared registry/helper for actor permission input.
2. Require explicit reason where policy says the action is unsafe.
3. Validate tenant ownership before mutation.
4. Preserve payment/order integrity through the appropriate transaction boundary.
5. Add direct-bypass tests in the same style as `order-action-direct-bypass.test.ts`.
6. Avoid active delete entirely unless a stricter policy and audit trail are designed.

## 8. Validation output

Commands run:

```bash
pnpm --filter @pos/application type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/application test
pnpm --filter @pos/api test
pnpm type-check
rg -n "orders_queue.*full payment|orders_queue.*recordPayment|recordPayment.*orders_queue|plan.*businessProfile|restaurant_table_service.*businessType|businessType.*restaurant_table_service|GenericPOSPage|features/pos/services|features/pos/mappers" apps packages shared || true
```

Results:

- `@pos/application` type-check: passed.
- `@pos/api` type-check: passed.
- `@pos/application` tests: passed, including the new registry unit suite.
- `@pos/api` tests: passed, including expanded direct-bypass coverage.
- Root `pnpm type-check`: passed.
- Cleanup grep: no matches.

## 9. Cleanup grep findings

Cleanup grep found no matches for the required forbidden/regression patterns, confirming:

- no full payment dependency on `orders_queue` was introduced;
- no `recordPayment` dependency on `orders_queue` was introduced;
- no business type was mapped back to paid workflow profile mode;
- no `GenericPOSPage` or old frontend compatibility shim reference was reintroduced.

A separate code search confirmed there is no controller-local active-cancel role mapping left in `OrdersController`; the controller now resolves permissions through the shared helper.

## 10. Remaining risks

1. Permission claims are still role-derived, not persisted first-class claims.
2. The explicit-claim merge strategy is conservative intersection; if product requirements later need additive fine-grained claims, the source must be trusted and tested before changing precedence.
3. Future refund/void/delete policy guards still need dedicated route-level design, audit logging, transactions, and direct-bypass tests.
4. RBAC middleware still uses role hierarchy for route gates; it can now import the registry in a future phase, but no middleware rewrite was performed in P8.2.

## 11. Next recommended phase

P8.3 should introduce a trusted permission-claim source or middleware adapter that can populate explicit permission claims from a persisted RBAC model, then migrate route guards and future refund/void/delete policy inputs to that source without loosening current role-derived safety.
