# P8.3 Trusted Permission Claim Source + Middleware Adapter Report

Date: 2026-06-21

## 1. Summary

P8.3 introduces an API-layer trusted order-action permission context adapter and wires active order cancellation policy inputs through request-level effective permissions instead of resolving scattered role strings inside `OrdersController`.

Implemented:

- Added `TrustedOrderActionPermissionContext` with role-derived, explicit, effective, and source fields.
- Added `resolveTrustedOrderActionPermissionContext`, `attachOrderActionPermissionContext`, and `getOrderActionPermissionContext` in the API auth layer.
- Wired RBAC role middleware to populate `req.orderActionPermissionContext` immediately after authenticated role resolution.
- Refactored `OrdersController.cancelOrder` to consume `req.orderActionPermissionContext.effectivePermissions` via the adapter helper.
- Added API adapter tests for role-derived active cancellation, least-privilege explicit-claim intersection, and reserved refund/void/delete permissions.
- Preserved P8/P8.1/P8.2 direct-bypass behavior and validation results.

Not implemented:

- No persisted permission-claim DB schema/migration was added because the current Better Auth user model exposes tenant and role fields, not a first-class permission-claim table or session claim source.
- No broad RBAC route rewrite was performed; route guards remain role-hierarchy gates, while order-action policy inputs now have a shared request permission context.
- No refund/void/delete routes or payment engine changes were introduced.

## 2. Files changed

| File | Change |
| --- | --- |
| `apps/api/src/http/auth/orderActionPermissionContext.ts` | New typed trusted permission context adapter, request augmentation, middleware, and lazy accessor. |
| `apps/api/src/http/middleware/rbac.ts` | Added `platform-admin` to the POS role hierarchy and attached order-action permission context after authenticated role resolution. |
| `apps/api/src/http/middleware/tenant.ts` | Extended `authTenantUser` request shape to allow future trusted permission claims without trusting client-sent arrays today. |
| `apps/api/src/http/controllers/OrdersController.ts` | Active cancel now reads effective permissions from the trusted request context helper. |
| `apps/api/src/__tests__/order-action-permission-context.test.ts` | Added adapter tests for role matrix, reserved permissions, and explicit-claim intersection. |
| `roadmap/business-flows/main.md` | Added P8.3 completion status and report pointer. |
| `roadmap/business-flows/replit_codex_P8_3_trusted_permission_claim_source_prompt.md` | Marked the P8.3 checklist as implemented/validated. |
| `PLANS.md` | Added/updated P8.3 execution plan and validation log. |

## 3. Permission context design

The request-level shape is:

```ts
type TrustedOrderActionPermissionContext = {
  role: string | null;
  roleDerivedPermissions: OrderActionPermission[];
  explicitPermissions: OrderActionPermission[];
  effectivePermissions: OrderActionPermission[];
  source: 'role-derived' | 'explicit-claims' | 'role-explicit-intersection';
};
```

Current behavior:

- `role` is selected from `req.posRole` first, then `req.authTenantUser.role`.
- `roleDerivedPermissions` comes from the P8.2 application registry via `resolveOrderActionPermissionsFromRole`.
- `explicitPermissions` is normalized to known order-action permissions only, but no current route supplies trusted persisted explicit claims.
- `effectivePermissions` comes from `resolveOrderActionPermissionsFromRequestContext`, preserving P8.2 least-privilege intersection behavior.
- `source` is `role-derived` when there are no explicit claims and `role-explicit-intersection` when claims are present.

The `explicit-claims` source is reserved in the type for a future truly trusted persisted/session-backed claim source; P8.3 does not activate additive explicit-claim trust.

## 4. Middleware/adapter placement

The adapter lives in:

```txt
apps/api/src/http/auth/orderActionPermissionContext.ts
```

RBAC middleware now attaches the permission context after successfully resolving the authenticated tenant-scoped role:

- `attachRole` populates `req.posRole`, then calls `attachOrderActionPermissionContext`.
- `requireRole(...)` populates `req.posRole`, then calls `attachOrderActionPermissionContext`.
- `getOrderActionPermissionContext(req)` lazily computes the same trusted context for controller tests or routes that invoke controllers directly without the RBAC middleware stack.

This placement keeps the order-action permission context behind trusted server-side auth/RBAC role resolution. It does not read arbitrary client-supplied permission arrays.

## 5. Permission source and trust model

Current trusted sources:

1. Better Auth session user id.
2. Server DB lookup of the `user` row to obtain `tenant_id` and `role`.
3. Tenant middleware / RBAC middleware verification that the user belongs to the resolved tenant, except `platform-admin` tenant override paths already handled by existing tenant auth guard behavior.
4. P8.2 application-layer role-to-order-action permission registry.

Current untrusted/not available sources:

- There is no persisted tenant-user permission claim table in the current implementation.
- There is no signed/session-level explicit permission claim array being loaded by RBAC.
- Client-sent permission arrays remain untrusted and are not consumed by route middleware.

Future persisted claims should be loaded server-side in the same role/tenant-auth path, for example from an audited tenant-user permission assignment table or a signed Better Auth session extension. Before changing effective permission behavior from intersection to union/additive claims, the future implementation must validate:

- tenant ownership of the claim source;
- user/account active status;
- claim provenance and freshness;
- role/claim conflict behavior;
- auditability for sensitive refund/void/delete permissions;
- direct-bypass regression tests for every guarded route.

Intersection is safer than union today because it prevents an untrusted/ad-hoc claim array from escalating a cashier or missing role into `orders:cancel_active`.

## 6. Role/claim/effective permission matrix

| Role/source | Role-derived active cancel? | Explicit `orders:cancel_active` effective today? | Reserved refund/void/delete by default? | Source |
| --- | --- | --- | --- | --- |
| `platform-admin` | Yes | Yes, if explicitly present, because it intersects with role baseline | No | `role-derived` or `role-explicit-intersection` |
| `owner` | Yes | Yes, if explicitly present, because it intersects with role baseline | No | `role-derived` or `role-explicit-intersection` |
| `manager` | Yes | Yes, if explicitly present, because it intersects with role baseline | No | `role-derived` or `role-explicit-intersection` |
| `cashier` | No | No, removed by intersection | No | `role-derived` or `role-explicit-intersection` |
| `kitchen` | No | No, removed by intersection | No | `role-derived` or `role-explicit-intersection` |
| `viewer` | No | No, removed by intersection | No | `role-derived` or `role-explicit-intersection` |
| missing/unknown | No | No, removed by empty role baseline | No | `role-derived` or `role-explicit-intersection` |

## 7. OrdersController refactor summary

Before P8.3, `OrdersController.cancelOrder` called the P8.2 request-context resolver directly with `req.posRole` / `req.authTenantUser`.

After P8.3:

- `OrdersController.cancelOrder` calls `getOrderActionPermissionContext(req).effectivePermissions`.
- The controller no longer manually resolves role strings or explicit-claim merge behavior.
- The effective permission context can be populated once by middleware and reused by future order-action guards.
- Existing active-cancel behavior is preserved: cashier and missing role are rejected; manager, owner, and platform-admin are allowed when lifecycle policy and reason requirements pass.

## 8. Route RBAC integration audit

Current route role gates in `apps/api/src/http/routes/orders.ts` remain coarse role gates:

| Route | Current gate | Permission context status |
| --- | --- | --- |
| `POST /api/orders/create-and-pay` | `requireCashier` | RBAC attaches context after auth; controller does not yet consume order-action permissions here. |
| `POST /api/orders` | `requireCashier` | RBAC attaches context; no P8.3 policy input change. |
| `PATCH /api/orders/:id` | `requireCashier` | RBAC attaches context; update lifecycle guard remains in application/use case policy path. |
| `PATCH /api/orders/:id/status` | `requireKitchen` | RBAC attaches context; status transition rules remain in existing controller/use-case path. |
| `POST /api/orders/:id/confirm` | `requireCashier` | RBAC attaches context; no P8.3 policy input change. |
| `POST /api/orders/:id/complete` | `requireCashier` | RBAC attaches context; no P8.3 policy input change. |
| `POST /api/orders/:id/cancel` | `requireCashier` | RBAC attaches context; active cancel consumes effective permissions from the adapter. |
| `POST /api/orders/:id/payments` | `requireCashier` | RBAC attaches context; payment policy currently uses lifecycle/entitlement context, not actor order-action permissions. |
| `POST /api/orders/:id/kitchen-ticket` | `requireCashier` + `requireEntitlement('restaurant_kitchen_ops')` | RBAC attaches context before entitlement guard; no P8.3 policy input change. |

Route ordering constraints:

- `tenantMiddleware` must run before RBAC so RBAC can compare session user tenant to `req.tenantId`.
- RBAC must run before controllers that require `req.posRole` or `req.orderActionPermissionContext`.
- Direct controller tests remain safe because `getOrderActionPermissionContext(req)` lazily computes from test-seeded request roles.

Routes that remain role-gated only:

- Most catalog, inventory, terminal, sync, and order routes still use `requireManager`, `requireCashier`, `requireKitchen`, or entitlement gates without fine-grained order-action permission checks.
- This is acceptable for P8.3 because broad RBAC rewrite was explicitly out of scope; future refund/void/delete routes should use this adapter from the start.

## 9. Test matrix and result

| Area | Case | Result |
| --- | --- | --- |
| Adapter | owner gets `orders:cancel_active` | Passed |
| Adapter | manager gets `orders:cancel_active` | Passed |
| Adapter | platform-admin gets `orders:cancel_active` | Passed |
| Adapter | cashier excludes `orders:cancel_active` | Passed |
| Adapter | kitchen/viewer/missing exclude `orders:cancel_active` | Passed |
| Adapter | reserved refund/void/delete are not included by default | Passed |
| Adapter | explicit claims intersect with role-derived baseline | Passed |
| Controller/direct-bypass | active cancel with reason as cashier rejected | Passed |
| Controller/direct-bypass | active cancel with reason as manager allowed | Passed |
| Controller/direct-bypass | active cancel with reason as owner allowed | Passed |
| Controller/direct-bypass | active cancel with reason as platform-admin allowed | Passed |
| Controller/direct-bypass | active cancel with missing role rejected | Passed |
| Regression | full payment without `orders_queue` allowed | Passed |
| Regression | partial payment without entitlement rejected | Passed |
| Regression | active/kitchen/fired update bypass rejected | Passed |
| Registry | P8.2 registry tests remain passing | Passed |

## 10. Validation output

Commands run:

```bash
pnpm --filter @pos/api test:file src/__tests__/order-action-permission-context.test.ts
pnpm --filter @pos/api type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/application test
pnpm --filter @pos/api test
pnpm type-check
rg -n "orders_queue.*full payment|orders_queue.*recordPayment|recordPayment.*orders_queue|plan.*businessProfile|restaurant_table_service.*businessType|businessType.*restaurant_table_service|GenericPOSPage|features/pos/services|features/pos/mappers" apps packages shared || true
rg -n "owner.*orders:cancel_active|manager.*orders:cancel_active|platform-admin.*orders:cancel_active|cancel_active.*owner|cancel_active.*manager|cancel_active.*platform-admin" apps/api/src/http/controllers || true
```

Results:

- `@pos/api` adapter test file: passed.
- `@pos/api` type-check: passed.
- `@pos/application` type-check: passed.
- `@pos/application` tests: passed.
- `@pos/api` tests: passed, including the new adapter tests and existing direct-bypass suite.
- Root `pnpm type-check`: passed all 10 Turbo package tasks.
- Cleanup grep: no matches.
- Controller-local mapping grep: no matches.

## 11. Cleanup grep findings

The required cleanup grep returned no matches, confirming:

- no full-payment dependency on `orders_queue` was introduced;
- no `recordPayment` dependency on `orders_queue` was introduced;
- no business type was mapped back to paid workflow profile mode;
- no `GenericPOSPage` or old frontend compatibility shims were reintroduced.

The controller-local active-cancel mapping grep also returned no matches, confirming `OrdersController` does not contain local `owner`/`manager`/`platform-admin` to `orders:cancel_active` mapping logic.

## 12. Remaining risks

1. Permission claims are still role-derived because there is no persisted first-class permission claim source yet.
2. `explicit-claims` remains a reserved source label, not an active additive trust mode.
3. RBAC route gates still use role hierarchy; only the order-action permission context bridge was added in P8.3.
4. Payment/refund/void/delete policy inputs should consume this adapter when those routes or use cases are introduced.
5. Existing development `x-pos-role` override remains non-production only and still depends on authenticated tenant validation before role override is accepted.

## 13. Next recommended phase

P8.4 should design a real persisted permission-claim source for tenant users and sensitive order/payment operations, including:

- schema or existing-pattern audit for tenant-user permission assignments;
- server-side claim loading in RBAC/session middleware;
- audit log design for refund/void/delete permissions;
- direct-bypass tests proving additive explicit claims cannot cross tenants or bypass role/account state;
- migration path for replacing coarse role-only route gates where safe.
