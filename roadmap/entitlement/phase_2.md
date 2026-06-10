# Entitlement Phase 2 — Remove Active Legacy References

## Context

Phase 1 created the new entitlement foundation:

```txt
packages/application/entitlements/entitlementCatalog.ts
packages/application/entitlements/entitlementEngine.ts
tenant_entitlements table
```

Phase 1B corrected the SOT scope so `entitlementCatalog.ts` contains only real commercial tenant entitlements, not base POS/order/catalog/payment primitives.

However, Phase 1B report still recorded active legacy references outside the SOT path:

```txt
tenantFeatures
tenant_features
tenantModuleConfigs
tenant_module_configs
enableInventory
enableInventoryAdvanced
```

These must be cleaned. Do not leave old tables, old flags, old wrappers, or old hardcode active.

## Objective

Execute **Entitlement Phase 2 — Remove Active Legacy References**.

Goal:

```txt
1. Fully remove active runtime/code references to tenant_features.
2. Fully remove active runtime/code references to tenant_module_configs.
3. Fully remove active runtime/code references to enableInventory / enableInventoryAdvanced commercial gating.
4. Ensure all commercial access checks use entitlementEngine + tenant_entitlements + entitlementCatalog only.
5. Ensure plan/business/marketplace/registration data comes only from entitlementCatalog.ts.
6. Keep SOT commercial-only from Phase 1B.
```

## Non-negotiable rules

Do not recreate legacy compatibility mapping.

Do not restore `tenant_features`.

Do not restore `tenant_module_configs`.

Do not add projection tables.

Do not add runtime self-heal.

Do not add resolver repair logic.

Do not put base POS operations back into entitlement catalog.

Do not split inventory back into granular commercial entitlements.

Do not add catalog/order/payment/base receipt as commercial entitlements.

Do not duplicate SOT in other files.

Do not hide old references by renaming variable names only while still preserving old behavior.

Do not keep wrappers with independent hardcoded feature/module config.

## Read first

```txt
roadmap/entitlement/phase_1.md
roadmap/entitlement/phase_1_report.md
roadmap/entitlement/phase_1b.md
roadmap/entitlement/phase_1b_report.md
packages/application/entitlements/entitlementCatalog.ts
packages/application/entitlements/entitlementEngine.ts
packages/infrastructure/db/schema/tenants.schema.ts
migrations/0022_single_tenant_entitlements.sql
```

## Required audit commands

Run these before editing:

```bash
rg -n "tenantFeatures|tenant_features|tenantModuleConfigs|tenant_module_configs|enableInventory|enableInventoryAdvanced|resolveBasicStockEntitlement|repairBasicStockEntitlement|BASIC_STOCK_DEFAULT_PLAN_TIERS" apps packages shared migrations docs roadmap

rg -n "planFeatureMap|PLAN_FEATURE_MAP|businessTypeTemplates|BUSINESS_TYPE_TEMPLATES|featureCatalog|moduleConfig|enable_inventory|enable_inventory_advanced" apps packages shared migrations docs roadmap

rg -n "orders_open_order|orders_cancel|orders_void|orders_refund|catalog_products|catalog_categories|catalog_variants|catalog_options|catalog_sku|catalog_barcode|payments_cash|payments_manual_qris|payments_manual_bank_transfer|receipt_standard|receipt_reprint|inventory_stock_adjustment|inventory_stock_movement_history|inventory_stock_opname|inventory_stock_transfer|inventory_low_stock_alert|inventory_reports|hardware_receipt_printer|hardware_cash_drawer" apps packages shared migrations docs roadmap
```

Classify every match into:

```txt
active runtime code
active schema/migration
active test
active docs/report historical reference
```

Only historical docs/report references may remain.

## Scope boundary

This phase is cleanup/refactor, not new product design.

Do not change pricing unless required to remove old hardcode.

Do not change the final Phase 1B commercial entitlement list unless a test proves a typo/missing key prevents current app behavior.

The allowed commercial entitlement list remains:

```txt
inventory_basic_stock
inventory_advanced_stock
payments_partial_payment
payments_multi_payment
payments_split_payment
receipt_compact
orders_queue
restaurant_table_service
restaurant_kitchen_ops
reports_advanced
reports_export
multi_location
hardware_label_printer
hardware_barcode_scanner
integrations_payment_gateway
integrations_accounting
integrations_webhook
integrations_api_access
```

## Part A — Remove schema exports for old tables

Inspect:

```txt
packages/infrastructure/db/schema/tenants.schema.ts
packages/infrastructure/db/schema/index.ts
```

Remove active Drizzle schema definitions for:

```txt
tenantFeatures
tenantModuleConfigs
```

Remove associated insert/select schemas and exported types:

```txt
insertTenantFeatureSchema
selectTenantFeatureSchema
TenantFeature
InsertTenantFeature
insertTenantModuleConfigSchema
selectTenantModuleConfigSchema
TenantModuleConfig
InsertTenantModuleConfig
```

Keep:

```txt
tenants
businessTypes
tenantEntitlements
```

If `tenantEntitlements` was added in another schema file, keep only that new table and ensure it is exported from schema barrel.

## Part B — Remove old table usage from API/backend

Find and remove imports of:

```txt
tenantFeatures
tenantModuleConfigs
```

Replace with entitlement engine usage.

Allowed API guard pattern:

```ts
await requireTenantEntitlement({
  tenantId: req.tenantId!,
  entitlementCode: "inventory_basic_stock",
});
```

Or equivalent that calls the shared entitlement engine.

Disallowed patterns:

```ts
tenantModuleConfigs.enableInventory
tenantModuleConfigs.enableInventoryAdvanced
tenantFeatures.featureCode
if (enableInventory) {}
if (enableInventoryAdvanced) {}
```

Routes that must be verified:

```txt
apps/api/src/http/routes/inventory.ts
apps/api/src/http/controllers/TenantsController.ts
apps/api/src/services/registrationService.ts
apps/api/src/routes.ts
apps/api/src/middleware/**
apps/api/src/services/**
```

If a route needs access gating, use entitlement code.

If a route is base functionality, remove commercial entitlement gating.

## Part C — Remove old wrappers / hardcode generators

The following files must not remain as independent SOT:

```txt
apps/api/src/constants/planFeatureMap.ts
packages/application/tenants/businessTypeTemplates.ts
featureCatalog.ts if present
```

Preferred Phase 2 approach:

```txt
Delete planFeatureMap.ts if all imports can be migrated safely.
Delete businessTypeTemplates.ts if all imports can be migrated safely.
```

If deletion causes a huge unrelated cascade, they may temporarily remain as thin wrappers only if:

```txt
1. They import from entitlementCatalog.ts.
2. They contain no independent hardcoded plan/feature/module list.
3. They are clearly marked @deprecated and point to entitlementCatalog.ts.
4. They are listed in phase_2_report.md as Phase 3 removal blockers.
```

But there must be no duplicate SOT data.

## Part D — Registration cleanup

Registration must use only:

```txt
ENTITLEMENT_CATALOG.businessTypes
ENTITLEMENT_CATALOG.plans
entitlementEngine helpers
```

Registration must not insert:

```txt
tenant_features
tenant_module_configs
```

Registration must only create:

```txt
tenants
outlets
order types/catalog seed/default business setup
```

Plan default and business type default entitlements are computed at runtime from SOT.

Do not persist plan-default or business-default entitlements into DB.

## Part E — Tenant/admin/marketplace cleanup

Any tenant profile/me endpoint that previously returned:

```txt
moduleConfig
features from tenant_features
```

must now return effective entitlement data from the entitlement engine.

Preferred API response shape:

```json
{
  "tenant": {
    "id": "...",
    "planTier": "starter",
    "businessType": "RETAIL_MINIMARKET"
  },
  "entitlements": {
    "inventory_basic_stock": true,
    "inventory_advanced_stock": false,
    "orders_queue": false
  },
  "plans": {},
  "offers": {}
}
```

Frontend must not rely on `moduleConfig.enable_inventory` or old `tenant_features`.

Marketplace must read from:

```txt
ENTITLEMENT_CATALOG.plans
ENTITLEMENT_CATALOG.entitlements
ENTITLEMENT_CATALOG.offers
ENTITLEMENT_CATALOG.businessTypes[*].recommendedEntitlements
```

No hardcoded feature catalog may remain active.

## Part F — Seeds/test fixture cleanup

Remove old seed references to:

```txt
tenant_features
tenant_module_configs
enable_inventory
enable_inventory_advanced
enableInventory
enableInventoryAdvanced
```

Seed tenants should only set:

```txt
planTier
businessType
```

If a test needs an active purchased addon, seed `tenant_entitlements`.

If a test needs default plan/business entitlement, do not seed DB entitlement rows; assert engine derives it from SOT.

## Part G — Migration cleanup

Confirm current migration state:

```txt
0022_single_tenant_entitlements.sql creates tenant_entitlements and drops old tables.
```

If `0022` still keeps old tables or is incomplete, fix it.

If later migrations still reference dropped tables, update or remove those references.

No migration after Phase 2 may recreate:

```txt
tenant_features
tenant_module_configs
```

## Part H — Tests to add/update

Required tests:

```txt
1. No active schema export for tenantFeatures / tenantModuleConfigs.
2. No active API import of tenantFeatures / tenantModuleConfigs.
3. Registration does not insert tenant_features or tenant_module_configs.
4. New tenant gets inventory_basic_stock through SOT/effective entitlement, without DB grant row.
5. Purchased addon grant in tenant_entitlements grants access.
6. Expired addon grant does not grant access.
7. Cancelled addon grant does not grant access.
8. Inventory stock list requires inventory_basic_stock.
9. Inventory movement/history/report requires inventory_advanced_stock.
10. Base catalog routes are not commercially entitlement-gated.
11. Base order lifecycle routes are not commercially entitlement-gated.
12. Marketplace offer list comes from entitlementCatalog.ts.
13. planFeatureMap.ts either deleted or generated from SOT only.
14. businessTypeTemplates.ts either deleted or generated from SOT only.
```

Add a grep/audit test if practical to prevent reintroducing:

```txt
tenantModuleConfigs
tenantFeatures
enableInventory
enableInventoryAdvanced
resolveBasicStockEntitlement
```

in active app/package source.

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

Run focused entitlement/API/registration/marketplace tests.

If full API tests require `DATABASE_URL`, run with DB env or document exact limitation.

## Required report

Create:

```txt
roadmap/entitlement/phase_2_report.md
```

Report must include:

```md
# Entitlement Phase 2 Report

## Summary

## Removed legacy tables/code

## Schema changes

- tenant_features active schema removed: yes/no
- tenant_module_configs active schema removed: yes/no
- tenant_entitlements retained: yes/no

## SOT status

- entitlementCatalog.ts only SOT: yes/no
- planFeatureMap.ts removed or generated wrapper:
- businessTypeTemplates.ts removed or generated wrapper:
- featureCatalog hardcode removed: yes/no

## Runtime access checks

- inventory basic:
- inventory advanced:
- tenant profile/me:
- marketplace:
- registration:

## Audit results

Include summarized output for:

```bash
rg -n "tenantFeatures|tenant_features|tenantModuleConfigs|tenant_module_configs|enableInventory|enableInventoryAdvanced|resolveBasicStockEntitlement|repairBasicStockEntitlement|BASIC_STOCK_DEFAULT_PLAN_TIERS" apps packages shared migrations docs roadmap
```

Classify remaining matches:

```txt
historical docs only
active code remaining
migration history only
test-only proof of absence
```

## Tests

## Validation commands

## Remaining blockers

## Final decision

- Active tenant_features removed: yes/no
- Active tenant_module_configs removed: yes/no
- Runtime self-heal removed: yes/no
- SOT-only plan/business/marketplace config: yes/no
- API guards use entitlement engine: yes/no
- Registration uses SOT only: yes/no
- Ready for Phase 3: yes/no
```

## Commit

Use commit message:

```bash
git commit -m "refactor(entitlement): remove legacy feature and module references"
```

Then push.

## Final response required

Return:

```txt
Entitlement Phase 2 status:
Commit SHA:
Files changed:
tenant_features active references removed: yes/no
tenant_module_configs active references removed: yes/no
SOT-only config: yes/no
Registration cleanup: yes/no
API guards cleanup: yes/no
Marketplace cleanup: yes/no
Tests added/run:
Commands run:
Remaining blockers:
```
