# AuraPoS Post-P8.4B — Fix Basic Stock Runtime Entitlement 403 Prompt

Work in `Rndynt/AuraPoS`.

## Objective

Execute **Post-P8.4B — Fix Basic Stock Runtime Entitlement 403**.

Post-P8.4 was merged, but the production case is still not resolved. This is a blocking production bug.

## Current production evidence

User tested a Basic Starter / starter onboarding tenant where Basic Stock / Stok Dasar is intended to be active by default.

The UI shows product stock tracking is active on products, and the inventory page UI says:

```txt
Stok Dasar aktif. Aktifkan Stok Lanjutan untuk catat tipe mutasi...
```

But the backend still blocks the stock list endpoint:

```txt
[403] Fitur ini memerlukan modul Stok Dasar. Aktifkan dari Marketplace. {
  path: '/inventory/products',
  method: 'GET',
  tenantId: '101a55c4-fabd-4832-afe8-22a1d941ed22',
  error: 'Fitur ini memerlukan modul Stok Dasar. Aktifkan dari Marketplace.'
}
```

The user enabled stock tracking on one product, but `/api/inventory/products` returns 403, so the stock page shows empty:

```txt
Belum ada produk dengan tracking stok aktif. Aktifkan di halaman Produk.
```

This means the product-listing fix from P8.3 is not reached. The entitlement guard blocks first.

## Confirmed code issue to investigate

At the time this prompt is written, `apps/api/src/http/routes/inventory.ts` implements:

```ts
async function isBasicInventoryEnabled(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ enableInventory: tenantModuleConfigs.enableInventory })
    .from(tenantModuleConfigs)
    .where(eq(tenantModuleConfigs.tenantId, tenantId))
    .limit(1);
  return hasBasicStockEntitlement(rows[0]);
}
```

And `apps/api/src/http/helpers/inventoryEntitlement.ts` implements:

```ts
export function hasBasicStockEntitlement(config: InventoryEntitlementConfig | undefined): boolean {
  return config?.enableInventory === true;
}
```

This is too narrow for production because it returns false when:

```txt
- tenant_module_configs row is missing
- tenant_module_configs.enable_inventory is false/stale
- migration 0020 only updated existing config rows and did not insert missing rows
- tenant plan tier value is not exactly 'free' or 'starter'
- Marketplace/feature catalog says Basic Stock is active but tenant_module_configs is not synced
```

Do not assume the fix from P8.4 worked. Reproduce against this production shape.

## Required outcome

For a Basic Starter/onboarding tenant where Basic Stock is part of the starter/default plan, the backend must allow:

```txt
GET /api/inventory/products -> 200
```

And tracked products must appear:

```txt
products.stockTrackingEnabled = true -> appears in stock list, even stock 0/null and no movement yet
```

Advanced stock must remain separately gated.

## Read first

```txt
apps/api/src/http/routes/inventory.ts
apps/api/src/http/helpers/inventoryEntitlement.ts
packages/application/tenants/businessTypeTemplates.ts
packages/application/tenants/registrationService.ts
packages/domain/tenants/types.ts
packages/infrastructure/db/schema/tenants.schema.ts
packages/infrastructure/db/schema/catalog.schema.ts
packages/infrastructure/db/schema/inventory.schema.ts
migrations/0020_basic_stock_default_entitlement.sql
roadmap/refactor/reports/post-p8-4-stock-basic-entitlement-migration-policy-report.md
apps/pos-terminal-web/src/**/inventory*
apps/pos-terminal-web/src/**/stock*
apps/pos-terminal-web/src/**/marketplace*
```

Search first:

```bash
rg -n "enableInventory|enable_inventory|enableInventoryAdvanced|enable_inventory_advanced|tenantModuleConfigs|tenant_module_configs|tenant_features|feature_code|inventory|Stok Dasar|Basic Stock|Marketplace|MODULE_REQUIRED|Fitur ini memerlukan modul Stok Dasar|planTier|plan_tier|starter|free|basic" apps packages migrations roadmap
```

## Strict scope

Do not weaken tenant isolation.

Do not grant Advanced Inventory when only Basic Stock is intended.

Do not bypass entitlement for all tenants.

Do not make `/api/inventory/movements` or `/api/inventory/report` free if they are Advanced Inventory.

Do not hide 403 by returning an empty 200 for unauthorized tenants.

Do not change stock deduction math.

Do not change inventory movement traceability from P8.3.

Do not remove migration 0019 or 0020.

## Root-cause questions to answer in report

You must answer these with code evidence:

```txt
1. Does the tenant have a tenant_module_configs row?
2. If row exists, what is enable_inventory?
3. Does the tenant plan tier use 'free', 'starter', 'basic', 'basic_starter', or another value?
4. Does Marketplace/frontend derive Basic Stock active from a different source than backend?
5. Does onboarding create tenant_module_configs reliably for new tenants?
6. Did migration 0020 insert missing rows or only update existing rows?
7. Why did tenant 101a55c4-fabd-4832-afe8-22a1d941ed22 still get 403?
```

## Required implementation

Implement a robust backend entitlement source of truth for Basic Stock.

Preferred approach:

```txt
1. Create a reusable entitlement resolver/helper, not route-local ad hoc logic.
2. Resolve Basic Stock from tenant module config when present.
3. If tenant_module_configs row is missing for an active free/starter/basic onboarding tenant, auto-heal by creating the config row with enable_inventory = true and enable_inventory_advanced = false.
4. If row exists but Basic Stock is default/free for the tenant's plan/business policy and enable_inventory is false only because of stale pre-P8.4 data, repair/update it to true.
5. Keep explicit disabled state only if the product actually supports user disabling Basic Stock. If Basic Stock is mandatory for starter/onboarding, there should be no disabled state for that plan.
6. Preserve Advanced Inventory as false unless explicitly enabled.
```

If the current product policy is that Basic Stock is always included for all onboarding/basic/free/starter tenants, encode that policy in one place and test it.

Do not let frontend and backend use different entitlement logic.

### Migration/backfill repair

Update or add a new migration after 0020 if needed.

The current `0020_basic_stock_default_entitlement.sql` updates existing rows only:

```sql
UPDATE tenant_module_configs tmc
SET enable_inventory = true
FROM tenants t
WHERE t.id = tmc.tenant_id
  AND t.is_active = true
  AND COALESCE(t.plan_tier, 'free') IN ('free', 'starter')
  AND tmc.enable_inventory IS DISTINCT FROM true;
```

This does not cover missing `tenant_module_configs` rows and may not cover plan tiers such as `basic`, `basic_starter`, or current enum values.

Add a new idempotent migration, for example:

```txt
0021_repair_basic_stock_runtime_entitlement.sql
```

It should:

```txt
- insert tenant_module_configs rows for active onboarding/basic/free/starter tenants that are missing config rows
- set enable_inventory = true for active onboarding/basic/free/starter tenants where Basic Stock is part of product policy
- keep enable_inventory_advanced = false unless already true or explicitly configured
- handle actual plan_tier values present in the code/schema
- never affect inactive tenants unless there is a clear reason
```

Use `ON CONFLICT` if the table has a unique key on tenant_id. Inspect schema first.

### Runtime self-healing

Because production may have stale rows even after deployment, add a safe runtime self-heal on `GET /api/inventory/products` or entitlement resolver:

```txt
- if active tenant is entitled to Basic Stock by plan/onboarding policy but module config row is missing/stale, upsert/repair tenant_module_configs before returning 200
- log a warning once with tenantId and repair action
- keep this idempotent
```

If you decide not to auto-heal at runtime, explain why and provide a deterministic migration-only fix. But because production is already returning 403, runtime self-heal is preferred for resilience.

## Required API behavior

For `GET /api/inventory/products`:

```txt
tenant with Basic Stock policy active -> 200
tracked product appears -> yes
tenant without Basic Stock policy active -> 403
advanced endpoints -> still require Advanced Inventory
```

For the exact production tenant pattern:

```txt
tenantId: 101a55c4-fabd-4832-afe8-22a1d941ed22
existing/new starter tenant
basic stock should be active
```

Backend should stop returning:

```txt
MODULE_REQUIRED / Fitur ini memerlukan modul Stok Dasar
```

## Required tests

Add or update focused tests for:

```txt
1. tenant_module_configs row missing + plan tier starter/free/basic -> GET /inventory/products allowed after self-heal/upsert
2. tenant_module_configs row exists but enable_inventory false/stale + Basic Stock default plan -> allowed and repaired
3. active tracked product appears when stockTrackingEnabled = true and stockQty null
4. active tracked product appears when stockQty = 0
5. tenant that truly lacks Basic Stock policy still gets 403
6. Advanced endpoints still require enable_inventory_advanced true
7. migration 0021 inserts missing tenant_module_configs rows
8. migration 0021 updates stale enable_inventory false rows
9. migration 0021 does not enable Advanced Inventory accidentally
10. frontend/backend entitlement source mismatch is covered by a regression test or documented if not testable
```

If API route tests require a DB, run them with `DATABASE_URL` and document the command.

## Required manual validation

Run locally/staging with a tenant shaped like production:

```txt
1. Active tenant with plan tier used by starter/basic onboarding.
2. tenant_module_configs row missing or enable_inventory=false.
3. Product exists with stockTrackingEnabled=true.
4. Call GET /api/inventory/products.
5. Expect 200, not 403.
6. Product appears in data with stock 0/null normalized.
7. Confirm tenant_module_configs was repaired/upserted.
8. Confirm GET /api/inventory/movements still requires Advanced Inventory if advanced disabled.
```

## Required validation commands

Run:

```bash
pnpm check:boundaries
pnpm --filter @pos/domain type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/terminal-web type-check
pnpm type-check
pnpm run db:check
```

Run focused tests added/updated in this task.

## Documentation output

Create report:

```txt
roadmap/refactor/reports/post-p8-4b-basic-stock-runtime-entitlement-report.md
```

Include:

```md
# Post-P8.4B Basic Stock Runtime Entitlement Report

## Production case

- Tenant id from logs: `101a55c4-fabd-4832-afe8-22a1d941ed22`
- Symptom: `/api/inventory/products` returns 403 MODULE_REQUIRED even though Basic Stock is intended active.
- Root cause:
- Fix:
- Why P8.4 was insufficient:

## Backend entitlement source of truth

- Source(s) used:
- Runtime self-heal behavior:
- Migration/backfill:
- Advanced Inventory separation:

## Tests

- Automated:
- Manual/staging:

## Commands

- `pnpm check:boundaries`:
- `pnpm --filter @pos/domain type-check`:
- `pnpm --filter @pos/application type-check`:
- `pnpm --filter @pos/infrastructure type-check`:
- `pnpm --filter @pos/api type-check`:
- `pnpm --filter @pos/terminal-web type-check`:
- `pnpm type-check`:
- `pnpm run db:check`:

## Final decision

- Production 403 fixed: yes/no
- Basic Starter tracked product visible: yes/no
- Missing config row repaired: yes/no
- Stale enable_inventory=false repaired: yes/no
- Advanced Inventory still gated: yes/no
- Migration generated: yes/no
- DB schema changed: yes/no
- Follow-up required: yes/no
```

## Commit

Use:

```bash
git commit -m "fix(inventory): repair basic stock entitlement at runtime"
```

Then push.

## Final response required

Report:

```txt
Post-P8.4B status:
Commit SHA:
Files changed:
Production 403 root cause:
Why P8.4 failed:
Runtime self-heal added: yes/no
Migration generated: yes/no + file
Tests added/run:
Manual validation result:
Boundary check: pass/fail
Type-check: pass/fail
DB check: pass/fail
Follow-up required: yes/no
```
