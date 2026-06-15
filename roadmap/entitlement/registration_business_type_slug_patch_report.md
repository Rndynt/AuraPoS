# Registration Business Type & Slug Patch — Report

**Date:** 2026-06-15  
**Status:** ✅ Complete

---

## Problem

Registration failed with a PostgreSQL FK error:

```
Key (business_type)=(CAFE_RESTAURANT) is not present in table "business_types"
```

The `tenants.business_type` column has an FK to `business_types.code`, but the
`business_types` reference rows were never seeded in the live DB (only in the
manual `seed.ts` script). Any attempt to register a tenant would fail.

Additionally, the registration form required a URL slug from the user, adding
unnecessary complexity to onboarding.

---

## Root Cause

`business_types` is a reference/lookup table. Its rows exist only after running
`pnpm db:seed` manually. The migration runner (`migrationRunner.ts`) runs SQL
files from `migrations/` on startup but none of them seeded `business_types`.

---

## Changes Made

### 1. `migrations/0023_seed_business_types.sql` — NEW

Idempotent upsert of all 5 business types from the ENTITLEMENT_CATALOG SOT.
Applied via the existing migration runner on next startup. Safe to re-apply.

```sql
INSERT INTO business_types (code, name, description, is_active) VALUES
  ('CAFE_RESTAURANT', ...)
  ('RETAIL_MINIMARKET', ...)
  ('LAUNDRY', ...)
  ('SERVICE_APPOINTMENT', ...)
  ('DIGITAL_PPOB', ...)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, ...;
```

Applied manually for immediate fix:
```
psql $DATABASE_URL -f migrations/0023_seed_business_types.sql
→ INSERT 0 5
```

Verified in DB:
```
code                 | name
---------------------+-----------------------
CAFE_RESTAURANT      | Café & Restaurant
DIGITAL_PPOB         | Digital & PPOB
LAUNDRY              | Laundry
RETAIL_MINIMARKET    | Retail & Minimarket
SERVICE_APPOINTMENT  | Service & Appointment
```

### 2. `apps/api/src/services/registrationService.ts`

- `RegisterTenantOwnerInput.slug` changed to `slug?: string` (optional)
- Exported `generateSlugFromBusinessName(name: string): string` — lowercase,
  trim, replace non-alphanumeric with hyphens, collapse, strip leading/trailing,
  cap 28 chars, fallback for too-short names
- In `registerTenantOwner`: `const slug = input.slug?.trim() || generateSlugFromBusinessName(input.businessName)`
- Error code for invalid business type changed from `'REGISTRATION_FAILED'` to
  `'INVALID_BUSINESS_TYPE'` for clearer error responses
- No change to outlet slug (always `'main'`), no tenant_entitlements rows,
  no tenant_features or tenant_module_configs

### 3. `apps/api/src/http/routes/registration.ts`

- Removed `slug` from `requiredFields` validation
- Added `resolveUniqueSlug(base, checkExists)` — tries base slug, then `-2`
  through `-99`, then timestamp fragment fallback
- Imported `generateSlugFromBusinessName` from service
- Route logic:
  - If slug provided by user → lowercase + SLUG_REGEX + reserved + uniqueness check (existing behavior)
  - If slug omitted → `generateSlugFromBusinessName(businessName)` + `resolveUniqueSlug()` to guarantee uniqueness

### 4. `apps/pos-terminal-web/src/pages/register-tenant.tsx`

- **Removed** slug input field and real-time slug availability checker
- **Added** business type selector (radio-style buttons with emoji icons) in step 1
- Step 1 now only requires `businessName` + `businessType` selection
- Step 2 shows `businessName` summary card at the top
- Done step shows generated tenant URL
- All interactive elements have `data-testid` attributes

### 5. `apps/api/src/__tests__/registration-service.test.ts`

Added tests:
- `generateSlugFromBusinessName` pure unit test suite (6 tests)
- `registration succeeds when slug is omitted — auto-generates slug from businessName`
- `generated slug from businessName is stored in tenant row`
- `default tenant entitlements derived from SOT, not tenant_entitlements rows`
- `no tenant_features or tenant_module_configs tables are written`

### 6. `apps/api/src/__tests__/registration-route-e2e.test.ts`

- Updated `'returns 400 when slug is missing'` → now tests that **slug omission returns 201**
- Added `describe('Slug auto-generation — slug omitted')` suite:
  - registration succeeds when slug omitted
  - generated slug from businessName stored in response
  - duplicate businessName → unique slug with `-2` suffix
  - slug not in missing fields list
- Added `'returns 400 when businessName is missing'` (businessName is now the key required field)
- Added `'slug is not required — omitting slug succeeds'` to required fields section
- Retained: all 5 business types accepted, businessType passed to service

---

## Test Results

```
registration-service.test.ts
  generateSlugFromBusinessName — pure unit tests  ✔ 6/6
  registerTenantOwner — SOT entitlement onboarding  ✔ 10/10
  Total: 16 pass, 0 fail

registration-route-e2e.test.ts
  POST /api/register E2E                  ✔ 2/2
  Slug normalisation — route layer        ✔ 5/5
  Slug auto-generation — slug omitted     ✔ 4/4
  Business type handling — route layer    ✔ 2/2
  Required field validation — route layer ✔ 4/4
  Total: 17 pass, 0 fail
```

---

## Type Checks

```
pnpm --filter @pos/api type-check         ✅ no errors
pnpm --filter @pos/application type-check ✅ no errors
pnpm --filter @pos/infrastructure type-check ✅ no errors
pnpm --filter @pos/terminal-web type-check  ✅ no errors
pnpm type-check                           ✅ 10/10 tasks successful
pnpm run db:check                         ✅ Everything's fine 🐶🔥
```

---

## Invariants Preserved

| Constraint | Status |
|---|---|
| No tenant_entitlements rows inserted on registration | ✅ |
| No tenant_features or tenant_module_configs reintroduced | ✅ |
| Default outlet always `Cabang Utama` slug `main` (not tenant slug) | ✅ |
| tenant.slug unique and non-null | ✅ |
| Uniqueness retry loop prevents collisions | ✅ |
| All 5 business types register successfully | ✅ |
| SOT entitlements derived at runtime only | ✅ |
| FK error returns RegistrationError (400) not raw 500 | ✅ |

---

## Multi-Outlet Rule

- `tenant.slug` identifies the tenant/business/subdomain
- Default outlet slug is always `'main'` (not derived from tenant slug)
- Never reused tenant slug as outlet slug

---

## Remaining Blockers

None. Registration FK error is fixed, slug is auto-generated for new tenants,
frontend no longer exposes slug to users.
