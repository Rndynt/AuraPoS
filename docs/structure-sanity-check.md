# AuraPoS Monorepo Structure Sanity Check Report

**Date:** November 18, 2025  
**Status:** ⚠️ CRITICAL ISSUES FOUND  
**Reviewer:** Replit Agent

---

## Executive Summary

The AuraPoS monorepo has the **correct directory structure** in place with all required packages and apps. However, **critical workspace import issues** were discovered that violate DDD architecture principles. The `apps/api` is using relative path imports instead of workspace imports, which breaks the intended separation of concerns and makes the codebase harder to maintain.

Additionally, **legacy code and unused files** were identified that should be removed to keep the codebase clean.

---

## 1. Directory Structure Verification ✅

### ✅ All Required Directories Exist

The monorepo follows the expected DDD structure:

```
AuraPoS/
├── apps/
│   ├── api/                    ✅ Express backend API
│   ├── pos-terminal-web/       ✅ POS terminal (Vite + React)
│   └── web/                    ⚠️ LEGACY - Unused Next.js app
├── packages/
│   ├── domain/                 ✅ Domain models and types
│   ├── application/            ✅ Use cases / application logic
│   ├── infrastructure/         ✅ Repositories and database
│   ├── core/                   ✅ Core shared utilities
│   └── features/               ✅ Feature flags and configs
└── shared/
    └── schema.ts               ✅ Shared Drizzle schema
```

### Package Contents

#### `packages/domain/` ✅
- **Purpose:** Domain models and business types
- **Contents:**
  - `catalog/` - Product catalog domain types
  - `orders/` - Order domain types
  - `pricing/` - Pricing domain types
  - `tenants/` - Tenant domain types
- **Status:** Properly organized

#### `packages/application/` ✅
- **Purpose:** Use cases and application logic
- **Contents:**
  - `catalog/` - GetProducts, GetProductById, CheckProductAvailability
  - `orders/` - CreateOrder, RecordPayment, CreateKitchenTicket
  - `tenants/` - GetActiveFeaturesForTenant, CheckFeatureAccess
- **Status:** Properly organized with correct workspace imports (`@pos/domain/*`)

#### `packages/infrastructure/` ✅
- **Purpose:** Database access and repositories
- **Contents:**
  - `repositories/catalog/` - Product repositories
  - `repositories/orders/` - Order repositories
  - `repositories/tenants/` - Tenant repositories
  - `database.ts` - Database connection
- **Status:** Properly organized

#### `packages/core/` ✅
- **Purpose:** Core shared utilities
- **Contents:**
  - `tenant.ts` - Tenant utilities
  - `pricing.ts` - Pricing logic
  - `types.ts` - Shared types
- **Status:** Minimal but functional

#### `packages/features/` ✅
- **Purpose:** Feature flags and feature management
- **Status:** Package exists but minimal implementation

---

## 2. Workspace Configuration ✅

### `pnpm-workspace.yaml` ✅

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Status:** ✅ Correct workspace definition

### `package.json` (Root) ✅

- **Package Manager:** `pnpm@8.15.0` ✅
- **Workspace Scripts:** Turbo configured for `dev`, `build`, `type-check` ✅
- **Dependencies:** All shared dependencies properly defined ✅

### Package-specific `package.json` Files ✅

#### `apps/api/package.json` ✅

```json
{
  "dependencies": {
    "@pos/core": "workspace:*",
    "@pos/domain": "workspace:*",
    "@pos/application": "workspace:*",
    "@pos/infrastructure": "workspace:*",
    "@pos/features": "workspace:*"
  }
}
```

**Status:** ✅ All workspace dependencies correctly declared

#### `apps/pos-terminal-web/package.json` ⚠️

**Status:** ⚠️ **Missing workspace dependencies** - Does not declare any `@pos/*` dependencies despite using them

#### `apps/web/package.json` 🗑️

**Status:** 🗑️ **LEGACY** - Next.js app with no implementation

---

## 3. TypeScript Configuration ✅

### `tsconfig.json` ✅

```json
{
  "paths": {
    "@/*": ["./client/src/*"],
    "@shared/*": ["./shared/*"],
    "@pos/core/*": ["./packages/core/*"],
    "@pos/domain/*": ["./packages/domain/*"],
    "@pos/application/*": ["./packages/application/*"],
    "@pos/infrastructure/*": ["./packages/infrastructure/*"],
    "@pos/features/*": ["./packages/features/*"]
  }
}
```

**Status:** ✅ All workspace path aliases correctly configured

### `tsconfig.base.json` ✅

Similar path configuration with additional settings for shared compilation.

**Status:** ✅ Proper base configuration

---

## 4. Critical Issues: Workspace Import Violations ⚠️

### 🚨 CRITICAL: `apps/api` Using Relative Imports

**Issue:** The API application is **NOT using workspace imports** despite having them configured in `package.json` and `tsconfig.json`.

#### Examples from `apps/api/src/container.ts`:

```typescript
// ❌ WRONG: Using relative paths
import { db } from '../../../packages/infrastructure/database';
import { ProductRepository } from '../../../packages/infrastructure/repositories/catalog/ProductRepository';
import { GetProducts } from '../../../packages/application/catalog/GetProducts';

// ✅ CORRECT: Should use workspace imports
import { db } from '@pos/infrastructure';
import { ProductRepository } from '@pos/infrastructure/repositories/catalog';
import { GetProducts } from '@pos/application/catalog';
```

#### Files with incorrect imports:
- `apps/api/src/container.ts` - **8 relative imports to packages**
- `apps/api/src/vite.ts` - Relative imports
- `apps/api/src/seed.ts` - Relative imports
- All controller files use relative imports via container

**Impact:**
- ❌ Violates DDD architecture principles
- ❌ Makes refactoring difficult
- ❌ Breaks encapsulation of package boundaries
- ❌ TypeScript path resolution issues
- ❌ Harder to move packages or restructure

### ⚠️ WARNING: `apps/pos-terminal-web` Minimal Workspace Usage

**Issue:** The POS terminal app uses workspace imports in only 3 files:
- `apps/pos-terminal-web/src/lib/tenant.ts` - Uses `@pos/core/tenant` ✅
- `apps/pos-terminal-web/src/hooks/useCart.ts` - Minimal usage
- `apps/pos-terminal-web/src/components/examples/CartPanel.tsx` - Example file

**Missing:**
- Should use `@pos/domain/*` types throughout the app
- Should potentially use `@pos/application/*` for API interactions
- Package.json doesn't declare `@pos/*` dependencies

---

## 5. Legacy and Unused Files 🗑️

### 🗑️ Legacy App: `apps/web/`

**Location:** `apps/web/`

**Description:** Next.js application with minimal setup

**Evidence:**
- Package.json exists with Next.js dependencies
- Module structure exists: `src/modules/pos/` with empty subdirectories
- No actual implementation code
- Not referenced in root scripts or turbo.json meaningfully
- Search shows NO export/import statements in src/

**Recommendation:** **DELETE ENTIRE `apps/web/` DIRECTORY**

```bash
rm -rf apps/web/
```

**Impact:** Low risk - app is unused

### 🗑️ Example Components: `apps/pos-terminal-web/src/components/examples/`

**Location:** `apps/pos-terminal-web/src/components/examples/`

**Files (6 total):**
```
├── CartItem.tsx
├── CartPanel.tsx
├── ProductArea.tsx
├── ProductCard.tsx
├── Sidebar.tsx
└── VariantSelector.tsx
```

**Evidence:**
- Duplicate implementations of actual components in `components/pos/`
- Used during initial development for testing/examples
- Not imported by production code
- Take up ~6 files of technical debt

**Recommendation:** **DELETE `apps/pos-terminal-web/src/components/examples/` DIRECTORY**

```bash
rm -rf apps/pos-terminal-web/src/components/examples/
```

**Impact:** Low risk - these are example/demo files

### 📝 TODO Markers Found

#### `packages/core/tenant.ts`

```typescript
// TODO: integrate AuthCore later (read tenant_id from JWT)
export const CURRENT_TENANT_ID = "demo-tenant";
```

**Status:** Known technical debt - authentication integration pending

**Recommendation:** Track in project roadmap, not urgent

---

## 6. Analysis: Import Patterns

### ✅ GOOD Examples (from `packages/application/`)

```typescript
// packages/application/catalog/GetProducts.ts
import type { Product, ProductOptionGroup, ProductOption } from '@pos/domain/catalog/types';
```

**Why Good:**
- Uses workspace import `@pos/domain/*`
- Clean dependency on domain types
- Follows DDD architecture

### ✅ GOOD Examples (from `packages/infrastructure/`)

```typescript
// packages/infrastructure/repositories/catalog/ProductRepository.ts
import { Database } from '../../database';  // ✅ OK - internal to package
import { products, productOptionGroups } from '../../../../shared/schema'; // ⚠️ Could use @shared/*
import type { Product } from '../../../domain/catalog/types'; // ❌ Should use @pos/domain/*
```

**Mixed:** Internal package imports are acceptable, but cross-package should use workspace imports

### ❌ BAD Examples (from `apps/api/`)

```typescript
// apps/api/src/container.ts
import { db } from '../../../packages/infrastructure/database';
import { ProductRepository } from '../../../packages/infrastructure/repositories/catalog/ProductRepository';
```

**Why Bad:**
- Relative path hell (`../../../`)
- Bypasses workspace configuration
- Fragile to directory restructuring

---

## 7. Recommendations

### 🔥 URGENT: Fix Workspace Imports in `apps/api`

**Priority:** HIGH  
**Effort:** Medium  
**Impact:** High

**Action Items:**

1. **Update all imports in `apps/api/src/container.ts`:**
   ```typescript
   // Before
   import { db } from '../../../packages/infrastructure/database';
   
   // After
   import { db } from '@pos/infrastructure';
   ```

2. **Create barrel exports** in packages for cleaner imports:
   ```typescript
   // packages/infrastructure/index.ts
   export * from './database';
   export * from './repositories';
   ```

3. **Verify apps/api/tsconfig.json** extends root config properly

4. **Test build** after changes to ensure no regressions

### 🗑️ CLEANUP: Remove Legacy Files

**Priority:** MEDIUM  
**Effort:** Low  
**Impact:** Medium (code hygiene)

**Action Items:**

1. **Remove `apps/web/`:**
   ```bash
   rm -rf apps/web/
   ```
   
2. **Remove example components:**
   ```bash
   rm -rf apps/pos-terminal-web/src/components/examples/
   ```

3. **Update `.gitignore`** if needed

4. **Update documentation** to reflect removed apps

### 📦 IMPROVE: Complete Workspace Dependencies

**Priority:** MEDIUM  
**Effort:** Low  
**Impact:** Medium

**Action Items:**

1. **Add workspace deps to `apps/pos-terminal-web/package.json`:**
   ```json
   {
     "dependencies": {
       "@pos/core": "workspace:*",
       "@pos/domain": "workspace:*"
     }
   }
   ```

2. **Audit frontend imports** and convert to workspace imports where appropriate

### 📚 DOCUMENTATION: Update Architecture Docs

**Priority:** LOW  
**Effort:** Low  
**Impact:** Medium

**Action Items:**

1. Document the approved import patterns
2. Add examples of correct vs incorrect imports
3. Create a "Package Import Guidelines" document
4. Update onboarding documentation

---

## 8. Import Pattern Standards

### ✅ Approved Patterns

| From | To | Pattern | Example |
|------|-----|---------|---------|
| apps/* | packages/* | Workspace import | `import { X } from '@pos/domain'` |
| apps/* | shared/* | Workspace import | `import { schema } from '@shared/schema'` |
| packages/* | packages/* | Workspace import | `import { X } from '@pos/domain'` |
| packages/* | shared/* | Workspace import | `import { schema } from '@shared/schema'` |
| Within package | Same package | Relative OK | `import { X } from './utils'` |

### ❌ Prohibited Patterns

| Pattern | Why Bad | Fix |
|---------|---------|-----|
| `../../../packages/` | Bypasses workspace | Use `@pos/*` |
| Cross-package relative | Fragile | Use `@pos/*` |
| No package.json deps | Missing contract | Add to package.json |

---

## 9. Compliance Scorecard

| Category | Status | Score |
|----------|--------|-------|
| Directory Structure | ✅ Excellent | 10/10 |
| Workspace Configuration | ✅ Good | 9/10 |
| TypeScript Paths | ✅ Excellent | 10/10 |
| API Import Patterns | ❌ Poor | 2/10 |
| Frontend Import Patterns | ⚠️ Fair | 6/10 |
| Package Boundaries | ⚠️ Fair | 6/10 |
| Code Cleanliness | ⚠️ Fair | 6/10 |
| **OVERALL** | ⚠️ **Needs Work** | **7/10** |

---

## 10. Next Steps

### Immediate (This Sprint)
1. ✅ Review this report with team
2. 🔥 Fix all `apps/api` workspace imports
3. 🗑️ Remove `apps/web/` legacy app
4. 🗑️ Remove example components directory

### Short Term (Next Sprint)
1. Add workspace dependencies to `apps/pos-terminal-web/package.json`
2. Create barrel exports in all packages
3. Audit and fix remaining import issues
4. Add ESLint rules to enforce workspace imports

### Long Term (Future Sprints)
1. Document import standards
2. Add pre-commit hooks to catch violations
3. Consider monorepo tooling improvements
4. Integrate AuthCore (resolve TODO in tenant.ts)

---

## Appendix A: File Inventory

### Apps
- `apps/api/` - 19 files (main backend)
- `apps/pos-terminal-web/` - 78 files (main frontend)
- `apps/web/` - 4 files (UNUSED - DELETE)

### Packages
- `packages/domain/` - 8 files
- `packages/application/` - 11 files
- `packages/infrastructure/` - 11 files
- `packages/core/` - 4 files
- `packages/features/` - 2 files

### Shared
- `shared/schema.ts` - 368 lines (Drizzle schema)

### Total Active Code Files: ~132 files
### Legacy Files to Remove: ~10 files

---

## Appendix B: Dependency Graph

```
apps/api
  └─> @pos/infrastructure
      └─> @pos/domain
          └─> shared/schema
  └─> @pos/application
      └─> @pos/domain
  └─> @pos/core
  └─> @pos/features

apps/pos-terminal-web
  └─> @pos/core (minimal)

packages/infrastructure
  └─> @pos/domain
  └─> shared/schema

packages/application
  └─> @pos/domain
```

**Note:** This represents the INTENDED dependency graph. Currently `apps/api` uses relative paths instead of workspace imports.

---

## Conclusion

The AuraPoS monorepo has a **solid foundation** with the correct DDD structure and workspace configuration. However, **critical import violations** in the API application must be fixed to maintain architectural integrity. Removing legacy files will improve code hygiene and reduce confusion.

**Recommended Action:** Prioritize fixing the `apps/api` imports in the next development sprint to ensure the codebase follows DDD principles correctly.

---

**Report Generated:** November 18, 2025  
**Tool:** Replit Agent  
**Confidence Level:** High (based on comprehensive file analysis)
