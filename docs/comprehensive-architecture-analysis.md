# Comprehensive POS Architecture Analysis

## Executive Summary

This document provides an in-depth analysis of the current POS (Point of Sale) system architecture, identifying the current state, architectural patterns, domain boundaries, and a detailed migration plan to a modern pnpm/TurboRepo monorepo structure.

**Analysis Date:** November 17, 2025  
**Current Version:** 1.0.0  
**Target Architecture:** pnpm + TurboRepo Monorepo with NestJS Backend

---

## 1. Current Architecture Overview

### 1.1 Runtime Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Port 5000 (Single)                    │
├─────────────────────────────────────────────────────────┤
│  Express Server (server/index.ts)                       │
│  ├─ Vite Dev Server (Development)                       │
│  │  └─ React Frontend (client/)                         │
│  ├─ Static Files (Production)                           │
│  └─ API Routes (via apps/api/)                          │
│     ├─ Tenant Middleware                                │
│     ├─ /api/catalog                                     │
│     ├─ /api/orders                                      │
│     └─ /api/tenants                                     │
└─────────────────────────────────────────────────────────┘
         │
         ├─> Neon PostgreSQL (@neondatabase/serverless)
         └─> Future: AuthCore Integration
```

**Key Findings:**
- ✅ Single unified server on port 5000 (Replit requirement)
- ✅ Vite HMR in development, static serving in production
- ⚠️ Transitional structure: `server/` delegates to `apps/api/`
- ❌ Database URL not configured (causing runtime errors)
- ❌ Dual app structure (`apps/api/` and `apps/web/`) not fully utilized

### 1.2 Current Folder Structure

```
/
├── apps/
│   ├── api/                    # Structured API (partially used)
│   │   └── src/
│   │       ├── http/
│   │       │   ├── controllers/  # TenantsController, CatalogController, OrdersController
│   │       │   ├── middleware/   # tenantMiddleware, errorHandler
│   │       │   └── routes/       # Route aggregation
│   │       ├── modules/          # Empty (future NestJS modules)
│   │       ├── app.ts           # Express app factory (not used)
│   │       └── container.ts     # DI container (not used)
│   └── web/                    # Next.js (minimal implementation)
│       └── src/modules/pos/
│
├── client/                     # ACTIVE: Vite + React POS Terminal
│   ├── src/
│   │   ├── components/
│   │   │   ├── pos/           # CartPanel, ProductCard, Sidebar, etc.
│   │   │   └── ui/            # 40+ shadcn components
│   │   ├── hooks/
│   │   │   ├── api/           # useProducts, useOrders, useTenantFeatures
│   │   │   └── useCart.ts     # Cart state management
│   │   ├── lib/
│   │   │   ├── api/hooks.ts   # TanStack Query setup
│   │   │   └── mockData.ts    # 8 sample products
│   │   └── pages/
│   │       ├── pos.tsx        # Main POS interface
│   │       └── home.tsx
│   └── index.html
│
├── packages/                   # DDD Layers (Well-Structured)
│   ├── application/           # @pos/application
│   │   ├── catalog/          # GetProducts, GetProductById, CheckProductAvailability
│   │   ├── orders/           # CreateOrder, RecordPayment, CalculateOrderPricing
│   │   └── tenants/          # GetActiveFeaturesForTenant, CheckFeatureAccess
│   │
│   ├── domain/               # @pos/domain
│   │   ├── catalog/         # Product, ProductVariant, ProductOptionGroup types
│   │   ├── orders/          # Order, OrderItem, OrderPayment types
│   │   ├── pricing/         # Pricing rules and calculations
│   │   └── tenants/         # Tenant, TenantFeature types
│   │
│   ├── infrastructure/       # @pos/infrastructure
│   │   ├── repositories/
│   │   │   ├── BaseRepository.ts      # Tenant filtering, error handling
│   │   │   ├── catalog/               # ProductRepository, ProductOptionRepository
│   │   │   ├── orders/                # OrderRepository, OrderItemRepository
│   │   │   └── tenants/               # TenantRepository, TenantFeatureRepository
│   │   └── database.ts                # Drizzle + Neon setup
│   │
│   ├── core/                # @pos/core
│   │   ├── types.ts        # Shared domain types
│   │   └── tenant.ts       # Tenant context
│   │
│   └── features/           # @pos/features
│       └── index.ts        # Feature flag helpers
│
├── server/                 # ACTIVE: Express Server Entry Point
│   ├── index.ts           # Main server (delegates to apps/api)
│   ├── routes.ts          # Route registration (bridges to apps/api)
│   ├── vite.ts            # Vite integration
│   ├── storage.ts         # In-memory storage (unused)
│   └── seed.ts            # Database seeding
│
├── shared/
│   └── schema.ts          # Drizzle ORM schemas
│
└── migrations/            # Drizzle migrations
    └── 0000_conscious_invisible_woman.sql
```

---

## 2. Backend Structure Analysis

### 2.1 Tenant Handling (Multi-Tenancy)

**Implementation Status:** ✅ Well-Implemented

**Current Flow:**
1. **Request Ingress** → `tenantMiddleware` extracts tenant ID from:
   - `x-tenant-id` header (primary)
   - `tenant_id` query parameter (fallback)

2. **Validation** → Optional database lookup:
   ```typescript
   // Check tenant exists and is active
   SELECT * FROM tenants WHERE id = ? LIMIT 1
   ```
   - In DEV: Logs warning and continues if tenant not found
   - In PROD: Throws error if tenant not found

3. **Context Injection** → `req.tenantId` available to all downstream handlers

4. **Repository Filtering** → All queries automatically scoped:
   ```typescript
   // BaseRepository.ts
   protected tenantFilter(tenantId: string): SQL {
     return eq((this.table as any).tenantId, tenantId);
   }
   
   // Example usage in ProductRepository
   .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
   ```

**Strengths:**
- ✅ Consistent tenant filtering across all repositories
- ✅ Graceful degradation in development mode
- ✅ Proper error handling and access control

**Issues Found:**
- ❌ Frontend uses hardcoded `CURRENT_TENANT_ID = "demo-tenant"`
- ❌ No AuthCore integration yet (manual tenant header required)
- ⚠️ Database validation fails (DATABASE_URL not set)

### 2.2 Domain-Driven Design Implementation

**Bounded Contexts Identified:**

#### 2.2.1 Catalog Context
**Entities:**
- `Product` - Base product with name, price, category
- `ProductVariant` - Size/type variations (e.g., Small, Medium, Large)
- `ProductOptionGroup` - Modifier groups (e.g., Sugar Level, Add-ons)
- `ProductOption` - Individual options within a group

**Use Cases:**
- `GetProducts(tenantId, filters)` - List products with filtering
- `GetProductById(id, tenantId)` - Single product retrieval
- `CheckProductAvailability(productId, tenantId)` - Stock validation

**Repository:**
- `ProductRepository` - CRUD with tenant isolation
- `ProductOptionGroupRepository` - Modifier management
- `ProductOptionRepository` - Option management

**Current Issues:**
- ⚠️ Product variants are simple (only price_delta)
- ❌ Multi-modifier system planned but not implemented
- ❌ Inventory tracking exists but not enforced

#### 2.2.2 Ordering Context
**Entities:**
- `Order` - Order header with status, totals, payment info
- `OrderItem` - Individual line items with quantity
- `OrderItemModifier` - Selected options per item
- `OrderPayment` - Payment records (supports partial payments)
- `KitchenTicket` - Printed order for kitchen

**Use Cases:**
- `CreateOrder(orderData, tenantId)` - Create new order
- `CalculateOrderPricing(items)` - Calculate taxes, service charge
- `RecordPayment(orderId, payment, tenantId)` - Record payment
- `CreateKitchenTicket(orderId, tenantId)` - Generate kitchen order

**Repository:**
- `OrderRepository` - Complex queries with item/payment joins
- `OrderItemRepository` - Line item management
- `OrderPaymentRepository` - Payment tracking
- `KitchenTicketRepository` - Ticket generation

**Current Issues:**
- ✅ Partial payment support implemented
- ⚠️ Kitchen ticket creation exists but needs printer integration
- ❌ Order status workflow not fully defined

#### 2.2.3 Tenant Context
**Entities:**
- `Tenant` - Organization/business account
- `TenantFeature` - Feature flag assignments with expiry

**Use Cases:**
- `GetActiveFeaturesForTenant(tenantId)` - List active features
- `CheckFeatureAccess(tenantId, featureCode)` - Validate feature access

**Repository:**
- `TenantRepository` - Tenant CRUD
- `TenantFeatureRepository` - Feature entitlement management

**Feature Catalog (9 Total):**
1. `product_variants` - Size/variant selection (ACTIVE)
2. `kitchen_ticket` - Kitchen order printing (ACTIVE)
3. `compact_receipt` - Compact receipt format
4. `remove_watermark` - White-label branding
5. `partial_payment` - Down payment support
6. `queue_number` - Queue management
7. `report_history_12mo` - Extended reporting (subscription)
8. `unlimited_products` - Remove product limits (subscription)
9. `multi_device_pos` - Multi-terminal support (subscription)

**Current Issues:**
- ✅ Feature flags working correctly
- ❌ No subscription/billing integration
- ❌ Feature expiry checked but not enforced in UI

#### 2.2.4 Pricing Context
**Domain Services:**
- Tax calculation (10%)
- Service charge calculation (5%)
- Variant price delta application
- Future: Discount rules, promotions

**Current Issues:**
- ⚠️ Pricing logic split between frontend (useCart.ts) and backend
- ❌ No centralized pricing service
- ❌ Tax/service rates hardcoded

### 2.3 API Layer Structure

**Endpoint Inventory:**

```
GET  /api/health                    # Health check
GET  /api/catalog/products          # List products
GET  /api/catalog/products/:id      # Get product
GET  /api/orders                    # List orders
POST /api/orders                    # Create order
GET  /api/orders/:id                # Get order
POST /api/orders/:id/payments       # Record payment
GET  /api/tenants/features          # Get active features
```

**Controller Pattern:**
```typescript
// Example: CatalogController.ts
export async function getProducts(req: Request, res: Response) {
  const { tenantId } = req;
  const useCase = new GetProducts(productRepository);
  const result = await useCase.execute(tenantId, filters);
  res.json({ success: true, data: result });
}
```

**Strengths:**
- ✅ Clean separation of concerns (Controller → UseCase → Repository)
- ✅ Consistent error handling via errorHandler middleware
- ✅ Type-safe with TypeScript

**Issues:**
- ⚠️ Controllers in `apps/api/` but server entry in `server/`
- ⚠️ DI container defined but not used
- ❌ No API versioning
- ❌ No rate limiting or caching

---

## 3. Frontend Architecture Analysis

### 3.1 UI/UX Flow

**Main Route:** `/pos`

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  Desktop (3-Column)                                      │
│  ┌──┬─────────────────────────────┬──────────────────┐  │
│  │  │  Product Grid               │  Cart Panel      │  │
│  │S │  ┌────┐ ┌────┐ ┌────┐       │  ┌────────────┐ │  │
│  │i │  │Prod│ │Prod│ │Prod│       │  │ Item 1     │ │  │
│  │d │  └────┘ └────┘ └────┘       │  │ Item 2     │ │  │
│  │e │  ┌────┐ ┌────┐ ┌────┐       │  └────────────┘ │  │
│  │b │  │Prod│ │Prod│ │Prod│       │  Subtotal       │  │
│  │a │  └────┘ └────┘ └────┘       │  Tax/Service    │  │
│  │r │  Categories                  │  Total          │  │
│  │  │  [Popular] [Food] [Drinks]  │  [Checkout]     │  │
│  └──┴─────────────────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Mobile (Single Column + Drawer)                         │
│  ┌─────────────────────────────────┐                     │
│  │  Sidebar (Collapsible)          │                     │
│  │  Product Grid                   │                     │
│  │  ┌────┐ ┌────┐                  │                     │
│  │  │Prod│ │Prod│                  │                     │
│  │  └────┘ └────┘                  │                     │
│  │  ┌────┐ ┌────┐                  │                     │
│  │  │Prod│ │Prod│                  │                     │
│  │  └────┘ └────┘                  │                     │
│  └─────────────────────────────────┘                     │
│         [🛒 2 items - Rp 50.000]   ← Floating Cart       │
│  ┌─────────────────────────────────┐                     │
│  │  Bottom Drawer (Cart)           │ ← Swipe Up          │
│  │  ┌────────────┐                 │                     │
│  │  │ Item 1     │                 │                     │
│  │  │ Item 2     │                 │                     │
│  │  └────────────┘                 │                     │
│  └─────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 State Management

**Cart State (useCart.ts):**
```typescript
interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  price: number;        // base + variant delta
}

// Cart Operations
addItem(product, variant) → Updates cart state
updateQuantity(productId, variantId, quantity)
removeItem(productId, variantId)
clearCart()

// Calculations
subtotal = sum(item.price * item.quantity)
tax = subtotal * 0.10
serviceCharge = subtotal * 0.05
total = subtotal + tax + serviceCharge
```

**Feature State (useFeatures.ts):**
```typescript
// Fetches active features via TanStack Query
const { data: features } = useQuery({
  queryKey: ['/api/tenants/features'],
  // Returns: TenantFeature[]
});

// Helper hooks
const hasVariants = useFeatureAccess('product_variants');
const hasKitchen = useFeatureAccess('kitchen_ticket');
```

**Issues:**
- ✅ Clean separation of concerns
- ✅ TanStack Query for server state
- ⚠️ Cart state is local only (no persistence)
- ❌ No order submission flow implemented
- ❌ Pricing calculation duplicated in frontend

### 3.3 Component Architecture

**Total Components:** 40+ shadcn/ui + 10+ custom POS components

**Key Custom Components:**
1. `ProductCard.tsx` / `ProductCardV2.tsx` - Product display with variants
2. `CartPanel.tsx` - Desktop cart sidebar
3. `MobileCartDrawer.tsx` - Mobile cart drawer (Vaul)
4. `VariantSelector.tsx` - Variant selection dialog
5. `ProductOptionsDialog.tsx` - Future: Multi-option selection
6. `PartialPaymentDialog.tsx` - Down payment UI
7. `Sidebar.tsx` - Category navigation

**Design System:**
- shadcn/ui components (Radix UI primitives)
- Tailwind CSS with custom design tokens
- Lucide React icons
- Responsive breakpoints: mobile (<768px), tablet, desktop

**Issues:**
- ✅ Consistent design system
- ✅ Accessible (Radix UI)
- ⚠️ Two versions of ProductCard (v1 and v2)
- ⚠️ ProductOptionsDialog exists but not wired up
- ❌ No loading states for API calls
- ❌ No error boundaries

---

## 4. Data Model Analysis

### 4.1 Database Schema (shared/schema.ts)

**Tables:**
```sql
-- Core Entities
tenants              (id, name, slug, is_active)
products             (id, tenant_id, name, category, price, variants, stock)
product_option_groups (id, tenant_id, product_id, name, selection_type, min, max)
product_options      (id, group_id, name, price_delta, inventory_sku)

orders               (id, tenant_id, order_number, status, payment_status, totals)
order_items          (id, order_id, product_id, variant_id, quantity, price)
order_item_modifiers (id, order_item_id, option_id, price_delta)
order_payments       (id, order_id, amount, payment_method, transaction_id)

kitchen_tickets      (id, order_id, tenant_id, ticket_number, status, printed_at)

tenant_features      (id, tenant_id, feature_code, is_active, expires_at)
```

**Relationships:**
```
Tenant 1→N Products
Tenant 1→N Orders
Tenant 1→N TenantFeatures

Product 1→N ProductOptionGroups
ProductOptionGroup 1→N ProductOptions

Order 1→N OrderItems
Order 1→N OrderPayments
Order 1→1 KitchenTicket

OrderItem 1→N OrderItemModifiers
```

**Key Design Decisions:**
- ✅ Tenant ID on all core entities (proper multi-tenancy)
- ✅ Soft delete pattern (is_active flags)
- ✅ Audit timestamps (created_at, updated_at)
- ✅ Flexible variant system (JSON + dedicated tables)
- ⚠️ Product variants stored as JSON array (current)
- ⚠️ Product options as separate tables (future)

### 4.2 Type System

**Domain Types (packages/domain/):**
```typescript
// catalog/types.ts
type Product = {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  price: number;
  variants?: ProductVariant[];
  stock?: number;
  isActive: boolean;
}

type ProductOptionGroup = {
  id: string;
  productId: string;
  name: string;
  selectionType: 'single' | 'multiple';
  min: number;
  max: number;
  options: ProductOption[];
}

// orders/types.ts
type Order = {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: 'draft' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  paidAmount: number;
  totalAmount: number;
  items: OrderItem[];
}
```

**Strengths:**
- ✅ Clear type hierarchy
- ✅ Domain types independent of database schema
- ✅ Proper encapsulation

**Issues:**
- ⚠️ Some type duplication between `packages/core/types.ts` and `packages/domain/*`
- ❌ No runtime validation (Zod schemas missing)

---

## 5. Critical Issues & Bugs

### 5.1 Runtime Errors

**❌ Database Connection Error:**
```
[DEV] Database validation failed - continuing anyway: 
TypeError: Cannot read properties of null (reading 'map')
```
**Root Cause:** `DATABASE_URL` environment variable not set  
**Impact:** All API endpoints return 500 errors  
**Fix Required:** Set up Replit PostgreSQL integration

**❌ API 500 Errors:**
```
GET /api/tenants/features 500 in 151ms
GET /api/catalog/products 500 in 108ms
```
**Root Cause:** Database query failures propagating to API  
**Impact:** Frontend cannot fetch data, shows errors  
**Fix Required:** Database setup + error handling improvement

### 5.2 Architectural Issues

**⚠️ Dual Server Structure:**
- `server/index.ts` imports from `apps/api/`
- `apps/api/src/app.ts` exists but not used directly
- Confusing for developers, unclear which is canonical

**⚠️ Incomplete Migration:**
- `apps/web/` (Next.js) exists but minimal
- `client/` is the active frontend
- Unclear migration path

**⚠️ In-Memory Storage Unused:**
- `server/storage.ts` defines storage interface
- Never used in routes
- Creates confusion

### 5.3 Feature Gaps

**❌ Multi-Variant System Not Implemented:**
- Database schema ready (`product_option_groups`, `product_options`)
- UI component exists (`ProductOptionsDialog`)
- No wiring between them
- Cart doesn't support modifiers yet

**❌ Order Submission Flow Incomplete:**
- Cart state exists
- CreateOrder use case exists
- No "Checkout" button implementation
- No order confirmation UI

**❌ AuthCore Integration Missing:**
- Tenant ID hardcoded in frontend
- No user authentication
- No session management

**❌ Kitchen Ticket Printing:**
- Database entities exist
- CreateKitchenTicket use case exists
- No printer integration
- No print queue UI

### 5.4 Code Quality Issues

**⚠️ Mock Data Still Present:**
```typescript
// client/src/lib/mockData.ts
export const PRODUCTS: Product[] = [/* 8 sample products */];
```
- Needs cleanup after API integration

**⚠️ Hardcoded Constants:**
```typescript
const CURRENT_TENANT_ID = "demo-tenant";
const TAX_RATE = 0.10;
const SERVICE_RATE = 0.05;
```
- Should be configuration

**⚠️ Duplicate Components:**
- `ProductCard.tsx` and `ProductCardV2.tsx`
- `CartItem.tsx` in both `components/examples/` and `components/pos/`

---

## 6. Migration Plan to pnpm/TurboRepo Monorepo

### 6.1 Target Structure

```
/
├── .gitignore
├── package.json                  # Root package (pnpm workspaces)
├── pnpm-workspace.yaml          # Workspace configuration
├── turbo.json                   # TurboRepo configuration
├── tsconfig.json                # Base TypeScript config
│
├── apps/
│   ├── pos-terminal-web/        # 🆕 Vite + React PWA (from client/)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── web/                     # ✅ Next.js (marketing/admin)
│   │   ├── app/
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                     # ♻️ NestJS Backend (consolidate server/)
│       ├── src/
│       │   ├── main.ts          # 🆕 NestJS bootstrap
│       │   ├── modules/
│       │   │   ├── catalog/
│       │   │   ├── orders/
│       │   │   └── tenants/
│       │   └── common/
│       │       ├── middleware/
│       │       └── filters/
│       ├── package.json
│       └── nest-cli.json
│
├── packages/
│   ├── ui/                      # 🆕 Shared UI Components
│   │   ├── src/
│   │   │   ├── components/      # shadcn components
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── application/             # ✅ Keep - Use Cases
│   │   ├── catalog/
│   │   ├── orders/
│   │   ├── tenants/
│   │   └── package.json
│   │
│   ├── domain/                  # ✅ Keep - Domain Models
│   │   ├── catalog/
│   │   ├── orders/
│   │   ├── tenants/
│   │   ├── pricing/
│   │   └── package.json
│   │
│   ├── infrastructure/          # ✅ Keep - Repositories
│   │   ├── repositories/
│   │   ├── database.ts
│   │   └── package.json
│   │
│   ├── core/                    # ✅ Keep - Core Types
│   │   ├── types.ts
│   │   ├── tenant.ts
│   │   └── package.json
│   │
│   └── features/                # ✅ Keep - Feature Flags
│       ├── index.ts
│       └── package.json
│
├── shared/                      # Keep temporarily
│   └── schema.ts                # Move to @pos/infrastructure later
│
└── docs/
    ├── architecture/
    ├── api/
    └── guides/
```

### 6.2 Migration Steps

#### Phase 1: Foundation Setup

**Step 1.1: Initialize pnpm**
```bash
# Install pnpm globally
npm install -g pnpm

# Initialize pnpm workspace
pnpm init
```

**Step 1.2: Create pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Step 1.3: Create turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

#### Phase 2: Restructure Apps

**Step 2.1: Move client/ → apps/pos-terminal-web/**
```bash
mkdir -p apps/pos-terminal-web
mv client/* apps/pos-terminal-web/
```

Update `apps/pos-terminal-web/package.json`:
```json
{
  "name": "@pos/terminal-web",
  "dependencies": {
    "@pos/ui": "workspace:*",
    "@pos/core": "workspace:*",
    "@pos/domain": "workspace:*"
  }
}
```

Update import paths:
```typescript
// Before
import { Button } from '@/components/ui/button';

// After
import { Button } from '@pos/ui';
```

**Step 2.2: Consolidate server/ → apps/api/**

Move Express routes to NestJS modules:
```bash
# Create NestJS structure
mkdir -p apps/api/src/modules/{catalog,orders,tenants}
```

Create `apps/api/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(5000, '0.0.0.0');
}
bootstrap();
```

Migrate controllers:
```typescript
// apps/api/src/modules/catalog/catalog.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { GetProducts } from '@pos/application/catalog';

@Controller('catalog')
export class CatalogController {
  @Get('products')
  async getProducts(@TenantId() tenantId: string) {
    const useCase = new GetProducts(this.productRepository);
    return useCase.execute(tenantId);
  }
}
```

**Step 2.3: Extract Shared UI → packages/ui/**
```bash
mkdir -p packages/ui/src
cp -r client/src/components/ui packages/ui/src/components
cp -r client/src/hooks packages/ui/src/hooks
```

Create `packages/ui/package.json`:
```json
{
  "name": "@pos/ui",
  "main": "./src/index.ts",
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.ts"
  },
  "dependencies": {
    "@radix-ui/react-*": "latest",
    "tailwindcss": "latest"
  }
}
```

#### Phase 3: Update Dependencies

**Step 3.1: Update all package.json files**
```bash
# In each package
pnpm install
```

**Step 3.2: Update TypeScript configs**
Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "paths": {
      "@pos/ui": ["./packages/ui/src"],
      "@pos/ui/*": ["./packages/ui/src/*"],
      "@pos/core": ["./packages/core"],
      "@pos/domain": ["./packages/domain"],
      "@pos/application": ["./packages/application"],
      "@pos/infrastructure": ["./packages/infrastructure"]
    }
  }
}
```

**Step 3.3: Update build scripts**
Root `package.json`:
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "type-check": "turbo run type-check"
  }
}
```

#### Phase 4: Update Imports

**Step 4.1: Create migration script**
```javascript
// migrate-imports.js
const fs = require('fs');
const glob = require('glob');

const replacements = [
  { from: '@/components/ui/', to: '@pos/ui/components/' },
  { from: '@/hooks/', to: '@pos/ui/hooks/' },
  { from: 'packages/core', to: '@pos/core' },
  { from: 'packages/domain', to: '@pos/domain' },
];

glob('apps/**/*.{ts,tsx}', (err, files) => {
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(({ from, to }) => {
      content = content.replace(new RegExp(from, 'g'), to);
    });
    fs.writeFileSync(file, content);
  });
});
```

#### Phase 5: Update Workflows

**Step 5.1: Update Replit workflow**
```bash
# .replit
run = "pnpm dev"

[nix]
channel = "stable-24_05"

[deployment]
run = ["pnpm", "build", "&&", "pnpm", "start"]
build = ["pnpm", "install", "&&", "pnpm", "build"]
```

**Step 5.2: Update package.json scripts**
```json
{
  "scripts": {
    "dev": "turbo run dev --filter=@pos/terminal-web --filter=@pos/api",
    "build": "turbo run build",
    "start": "node apps/api/dist/main.js"
  }
}
```

### 6.3 Testing Strategy

**Unit Tests:**
```typescript
// packages/application/__tests__/GetProducts.test.ts
describe('GetProducts', () => {
  it('should filter by tenant', async () => {
    const useCase = new GetProducts(mockRepo);
    const result = await useCase.execute('tenant-1');
    expect(result.every(p => p.tenantId === 'tenant-1')).toBe(true);
  });
});
```

**Integration Tests:**
```typescript
// apps/api/test/catalog.e2e.spec.ts
describe('CatalogController (e2e)', () => {
  it('/api/catalog/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/catalog/products')
      .set('x-tenant-id', 'demo-tenant')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });
});
```

---

## 7. Recommendations

### 7.1 Immediate Priorities (Week 1)

1. **Database Setup** ⚠️ CRITICAL
   - Configure Replit PostgreSQL
   - Run migrations
   - Seed sample data

2. **Fix Runtime Errors** ⚠️ HIGH
   - Resolve 500 errors on API endpoints
   - Add proper error handling
   - Implement error boundaries in frontend

3. **Complete Migration Plan** 📋 HIGH
   - Set up pnpm workspace
   - Create TurboRepo config
   - Begin app restructuring

### 7.2 Short-term (Month 1)

1. **Implement Multi-Variant System**
   - Wire ProductOptionsDialog
   - Update cart to support modifiers
   - Update order creation

2. **Complete Order Flow**
   - Implement checkout
   - Add order confirmation
   - Create receipt printing

3. **AuthCore Integration**
   - Add user authentication
   - Remove hardcoded tenant ID
   - Implement session management

### 7.3 Medium-term (Quarter 1)

1. **NestJS Migration**
   - Complete backend migration to NestJS
   - Implement GraphQL API
   - Add caching layer

2. **PWA Features**
   - Service worker
   - Offline mode
   - Add to home screen

3. **Kitchen Display System**
   - Real-time order updates
   - Kitchen ticket printing
   - Order status workflow

### 7.4 Long-term (Year 1)

1. **Microservices Evolution**
   - Extract bounded contexts to separate services
   - Implement event bus (NATS/Kafka)
   - Add API gateway

2. **Advanced Features**
   - Inventory management
   - Employee management
   - Analytics dashboard
   - Multi-location support

3. **Monetization**
   - Subscription billing
   - Feature marketplace
   - API for third-party integrations

---

## 8. Conclusion

The POS system demonstrates a solid foundation with well-structured Domain-Driven Design layers and clear separation of concerns. The main challenges are:

1. **Incomplete migration** from monolithic to modular structure
2. **Database configuration** issues blocking API functionality
3. **Missing implementations** of planned features (multi-variants, checkout)

The migration to pnpm/TurboRepo will provide:
- ✅ Clear ownership boundaries for each app/package
- ✅ Efficient dependency management
- ✅ Scalable build system
- ✅ Path to NestJS and microservices

**Estimated Migration Timeline:**
- Phase 1-2 (Foundation + Restructure): 2-3 days
- Phase 3-4 (Dependencies + Imports): 1-2 days
- Phase 5 (Testing + Validation): 1-2 days
- **Total: 4-7 days**

**Success Criteria:**
- ✅ All apps build successfully
- ✅ Development server runs on port 5000
- ✅ All existing functionality preserved
- ✅ Import paths working correctly
- ✅ Tests passing
- ✅ Documentation updated

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Author:** Replit Agent - Architecture Analysis
