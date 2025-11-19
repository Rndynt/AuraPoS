# docs/aura-pos-tasklist-en.md
# AuraPoS – Domain-Based Task Checklist (EN)

> Priority: Café / Restaurant first.  
> Architecture: DDD (domain / application / infrastructure / apps/api / apps/pos-terminal-web).  
> Constraints:
> - Orders must **not** have hard foreign-key dependencies to tables, kitchen, DP, or other vertical-specific tables.
> - Business type (vertical) drives which modules/domains are loaded per tenant.
> - Authentication (AuthCore) implemented last; for now users are seeded and hardcoded from one place.
> - External payment gateways are implemented last; for now we use internal “mark as paid / partial” only.
> - Loyalty module is designed and listed, but implemented later.

---

## 0. Foundation & Cleanup

### 0.1 Repo & DDD structure sanity check

- [ ] Confirm monorepo layout:
  - [ ] `apps/api` – Express backend
  - [ ] `apps/pos-terminal-web` – POS terminal web (Vite + React)
  - [ ] `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/core`, `packages/features`, `shared/`
- [ ] Ensure all imports use workspace paths (`@pos/domain`, `@pos/application`, etc.).
- [ ] Remove or clearly mark legacy / unused files (if any) so Replit agent doesn’t touch them.

### 0.2 Shared core utilities

- [x] In `@pos/core` define shared constants & types:
  - [x] `BusinessType` enum/union (e.g. `CAFE_RESTAURANT`, `RETAIL_MINIMARKET`, `LAUNDRY`, `SERVICE_APPOINTMENT`, `DIGITAL_PPOB`).
  - [x] `OrderStatus`, `PaymentStatus`, `OrderTypeCode` central enums.
  - [x] `FeatureCode` enum (sync with `tenant_features.feature_code` and `FEATURE_CODES`).

---

## 1. Tenant & Business Type Domain

### 1.1 Domain model

- [x] In `@pos/domain/tenants`:
  - [x] Add `BusinessType` model/type.
  - [x] Extend `Tenant` with:
    - [x] `business_type: BusinessType`
    - [x] `settings: Record<string, any>` (JSON config per tenant, business-type specific).
  - [x] Add `TenantModuleConfig` type to represent which modules are enabled for a tenant:
    - [x] Flags such as `enable_table_management`, `enable_kitchen_ticket`, `enable_loyalty`, `enable_delivery`, etc.

### 1.2 Database schema & migrations

- [x] ~~Add `business_types` master table~~ (skipped - using BusinessType enum in code):
  - Business types defined in `@pos/core/constants.ts` as string union type.
- [x] Update `tenants` table:
  - [x] Add `business_type` (varchar enum-like string).
  - [x] Add `settings` JSONB column (nullable).
- [x] Add `tenant_module_configs` table (column-based approach):
  - [x] `tenant_id` (PK, FK to tenants)
  - [x] Boolean columns for each module: `enable_table_management`, `enable_kitchen_ticket`, `enable_loyalty`, `enable_delivery`, `enable_inventory`, `enable_appointments`, `enable_multi_location`
  - [x] `config` JSONB for module-specific settings
  - [x] `updated_at` timestamp
  - [x] Migration created: `migrations/0001_loose_frank_castle.sql`
  - [x] Repository implemented: `TenantModuleConfigRepository` with type-safe mappers

### 1.3 Application layer use cases

- [x] `CreateTenant` use case (implemented in `packages/application/tenants/CreateTenant.ts`):
  - [x] Input includes `business_type`.
  - [x] Creates tenant + default `tenant_features` + default `tenant_order_types` based on business type template.
  - [x] Initializes `tenant_module_configs` with sensible defaults from template.
  - [x] Validates input, checks slug uniqueness, handles errors gracefully.
  - [x] Returns created tenant profile.
- [x] `GetTenantProfile` use case (implemented in `packages/application/tenants/GetTenantProfile.ts`):
  - [x] Returns tenant + enabled features + enabled modules for a given tenant id.
  - [x] Parallel loads features and module config for performance.
  - [x] Clear error handling for missing tenant.

### 1.4 Business-type templates

- [x] Define in `@pos/application/tenants` (implemented in `businessTypeTemplates.ts`):
  - [x] `BusinessTypeTemplate` mapping for all 5 business types:
    - [x] CAFE_RESTAURANT: Default order types = `DINE_IN`, `TAKE_AWAY`, `DELIVERY`. Modules: table_management, kitchen_ticket, delivery enabled.
    - [x] RETAIL_MINIMARKET: Default order type = `WALK_IN`. Modules: inventory, loyalty enabled.
    - [x] LAUNDRY: Default order types = `WALK_IN`, `DELIVERY`. Modules: loyalty, delivery, label_printer enabled.
    - [x] SERVICE_APPOINTMENT: Default order type = `WALK_IN`. Modules: appointments, loyalty enabled.
    - [x] DIGITAL_PPOB: Default order type = `WALK_IN`. Modules: multi_location, payment_gateway enabled.
  - [x] Each template includes default feature codes with source=plan_default.
  - [x] Helper function `getBusinessTypeTemplate(businessType)` to fetch template.
- [x] Wire `CreateTenant` to use templates above.

### 1.5 API / backend wiring

- [x] Add `/api/tenants/register` (implemented in `apps/api/src/http/controllers/TenantsController.ts`):
  - [x] Accepts `business_type`, basic tenant info.
  - [x] Calls `CreateTenant`.
  - [x] Returns tenant and enabled modules/features.
  - [x] Input validation using Zod schema with business type enum.
  - [x] Proper error handling using asyncHandler middleware.
  - [x] Returns complete persisted profile with real IDs and timestamps.
- [x] Created `/api/tenants/profile` endpoint (extends functionality):
  - [x] Returns complete tenant profile (tenant + features + moduleConfig) for front-end.
  - [x] Wired with `GetTenantProfile` use case via DI container.

### 1.6 Frontend integration (POS terminal)

- [x] In `apps/pos-terminal-web` (implemented):
  - [x] Add hook `useTenantProfile()` which:
    - [x] Fetches tenant profile + module flags from `/api/tenants/profile`.
    - [x] Implemented in `apps/pos-terminal-web/src/hooks/api/useTenantProfile.ts`.
  - [x] Extended `TenantContext` to store `business_type` and module map:
    - [x] Added `business_type`, `moduleConfig`, `isLoading`, `error` to context.
    - [x] Implemented `hasModule(moduleName: string)` helper function.
    - [x] Preserved existing `tenantId` functionality (backward compatible).
    - [x] Updated in `apps/pos-terminal-web/src/context/TenantContext.tsx`.
  - [x] Created usage documentation with examples:
    - [x] Documentation in `apps/pos-terminal-web/src/hooks/README.md`.
    - [x] Examples for showing/hiding table management screens (café/restaurant only).
    - [x] Examples for showing/hiding delivery address fields if enabled.
    - [x] Examples for showing/hiding loyalty UI based on module flags.

---

## 2. Catalog Domain (Products, Variants, Options)

> Goal: Catalog works for all verticals, but café/restaurant use-case first.

### 2.1 Domain refinement

- [ ] In `@pos/domain/catalog`:
  - [ ] Ensure `Product` is neutral (no direct dependency on tables, kitchen, etc.).
  - [ ] Extend metadata field(s) to support different business types:
    - [ ] `metadata.service_duration_minutes` (for appointments).
    - [ ] `metadata.weight_based` / `weight_unit` (for laundry).
    - [ ] `metadata.sku_type` for PPOB vs physical goods.
- [ ] Finalize multi-modifier model:
  - [ ] `ProductOptionGroup` with `selectionType`, `min`, `max`.
  - [ ] `ProductOption` with `price_delta`, optional `inventory_sku`.

### 2.2 Infrastructure & repository

- [ ] Ensure repositories in `@pos/infrastructure/repositories/catalog`:
  - [ ] Read/write data for products, option groups, options.
  - [ ] Always scope by `tenant_id`.
  - [ ] Support filtering by `business_type` or categories.

### 2.3 Application use cases

- [ ] `GetProductsForTenant`:
  - [ ] Accepts `tenant_id`, optional filters.
  - [ ] Returns products including option groups/options.
- [ ] `CreateOrUpdateProduct`:
  - [ ] Handles product + variants + option groups in one operation.
- [ ] (Later) `BulkImportProducts` for retail/minimarket.

### 2.4 POS UI integration

- [ ] Update `ProductCard` & `ProductOptionsDialog` to:
  - [ ] Support multi-modifier selection (checkbox/stepper for add-ons).
  - [ ] Validate `min`/`max` rules before adding to cart.
- [ ] Ensure café flow works:
  - [ ] Size (Small/Medium/Large).
  - [ ] Add-ons (extra shot, toppings, etc.).

---

## 3. Ordering Domain (Generic, No Hard Table Dependency)

> Core rule: Orders are generic.  
> Tables, kitchen, DP, loyalty, etc. are **separate modules** that reference orders, not the other way around (except optional neutral fields like `table_number`).

### 3.1 Domain model

- [ ] In `@pos/domain/orders` ensure `Order`:
  - [ ] Has `order_type_id` / `order_type_code` (DINE_IN, TAKE_AWAY, DELIVERY, WALK_IN, etc.).
  - [ ] Has `status: 'draft' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'`.
  - [ ] Has `payment_status: 'unpaid' | 'partial' | 'paid'`.
  - [ ] Has `table_number?: string` (plain text, no FK to tables).
  - [ ] Has generic `metadata?: Record<string, any>` for business-specific extra fields.
- [ ] Keep `KitchenTicket` as separate entity referencing `order_id` (already existing).
- [ ] Keep `OrderPayment` separate (no external gateway coupling).

### 3.2 Draft vs immediate payment flows

- [ ] In `CreateOrder` use case:
  - [ ] Create orders with `status = 'draft'` by default.
  - [ ] Allow both:
    - [ ] Draft with table: DINE_IN + `table_number`.
    - [ ] Draft takeaway: TAKE_AWAY without `table_number`.
  - [ ] `payment_status` initially `unpaid`.
- [ ] Add `ConfirmOrder` use case:
  - [ ] Moves `status` from `draft` → `confirmed`.
  - [ ] Used when order is sent to kitchen or locked.
- [ ] Add `CompleteOrder` / `CancelOrder` use cases:
  - [ ] Complete: only allowed if fully paid OR allowed by configuration.
  - [ ] Cancel: update status, do not require payment.

### 3.3 Order querying & listing

- [ ] Add `ListOpenOrders` use case:
  - [ ] Returns orders with status in `['draft', 'confirmed', 'preparing', 'ready']`.
  - [ ] Filter by order type (DINE_IN / TAKE_AWAY) and optionally by `table_number`.
- [ ] Add `ListOrderHistory` use case:
  - [ ] Paged list for completed/cancelled orders for reporting.

### 3.4 API endpoints

- [ ] `/api/orders`:
  - [ ] `POST` – create draft order (cart→order).
  - [ ] `GET` – list orders with filters.
- [ ] `/api/orders/:id/confirm` – confirm order.
- [ ] `/api/orders/:id/complete` – complete order.
- [ ] `/api/orders/:id/cancel` – cancel order.

### 3.5 POS UI

- [ ] Add “Order list” view in POS terminal:
  - [ ] Tab / filter for:
    - [ ] Dine-in drafts (with table).
    - [ ] Takeaway drafts.
    - [ ] Ready for payment (status + totals).
- [ ] When creating order from cart:
  - [ ] Show dialog:
    - [ ] Choose `order_type` (Dine In / Take Away / Delivery).
    - [ ] If Dine In and table management enabled → select table.
    - [ ] If no table management → free-text `table_number` input.
    - [ ] Option to immediately “Mark as paid” or leave as draft.

---

## 4. Table & Seating Management Domain (Café/Restaurant Only)

> Implemented as separate module. Orders do not depend on tables with hard FK.

### 4.1 Domain model

- [ ] New `@pos/domain/seating` (or `tables`) package:
  - [ ] `Table` entity:
    - [ ] `id`, `tenant_id`, `name/number`, `area` (e.g. indoor/outdoor), `capacity`, `status`.
  - [ ] `TableStatus` enum: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `DIRTY`, `INACTIVE`.
  - [ ] `TableSession` entity:
    - [ ] `id`, `tenant_id`, `table_id`, `order_id`, `started_at`, `closed_at`, `status`.
    - [ ] Links an order with a table, but `orders` table itself is unchanged (only optional `table_number` field).

### 4.2 Database schema

- [ ] `tables` table.
- [ ] `table_sessions` table (references `orders.id` but optional from the `Order` side).

### 4.3 Application use cases

- [ ] `CreateTable`, `UpdateTable`, `ListTables`.
- [ ] `OpenTableSession`:
  - [ ] Creates new session for a table and associates with an order (dine-in).
- [ ] `MoveTableSession`:
  - [ ] Move session from one table to another.
- [ ] `CloseTableSession`:
  - [ ] Mark session as closed when order is completed.

### 4.4 POS UI

- [ ] “Table view” page for café tenants:
  - [ ] Grid layout of tables with colors based on status.
  - [ ] Click table:
    - [ ] See current order if occupied.
    - [ ] Create new order if available.

---

## 5. Kitchen & Fulfillment Domain

### 5.1 Domain & use cases

- [ ] Ensure `CreateKitchenTicket` use case is wired:
  - [ ] Triggered when order is confirmed or when operator explicitly sends to kitchen.
- [ ] Add `UpdateKitchenTicketStatus` use case:
  - [ ] `pending` → `preparing` → `ready` → `delivered`.

### 5.2 Database & repositories

- [ ] Ensure `kitchen_tickets` table is used via repository.
- [ ] No hard dependency from orders; only `kitchen_tickets.order_id`.

### 5.3 POS / kitchen UI

- [ ] Basic “kitchen screen” (could be simple web page):
  - [ ] List of tickets with items, table number, notes.
  - [ ] Buttons to update status.

---

## 6. Payment Domain (Internal First, Gateway Later)

> For now: internal `order_payments` + simple buttons.  
> Later: integrate Midtrans or others.

### 6.1 Domain model review

- [ ] In `@pos/domain/orders` confirm `OrderPayment` entity has:
  - [ ] `order_id`, `amount`, `payment_method`, `payment_status`, `transaction_ref`, `notes`, `paid_at`.

### 6.2 Internal payment flows

- [ ] Ensure `RecordPayment` use case:
  - [ ] Supports partial payments.
  - [ ] Updates `order.payment_status` (`unpaid` / `partial` / `paid`) and `paid_amount`.
- [ ] Add `VoidPayment` / `RefundPayment` use case (internal):
  - [ ] For now just record a negative payment or separate record, no gateway.

### 6.3 API endpoints

- [ ] `/api/orders/:id/payments`:
  - [ ] `POST` – record payment.
  - [ ] Optionally `DELETE` or `POST /void` for refunds.

### 6.4 POS UI

- [ ] “Payment dialog”:
  - [ ] Input amount, choose method (cash, card, ewallet, other).
  - [ ] Show remaining balance and new status.
- [ ] Quick buttons:
  - [ ] “Mark as fully paid”.
  - [ ] “Mark DP (partial payment)” (uses `RecordPayment` with partial amount).

### 6.5 Phase 2 – External gateway (later)

- [ ] Design abstraction in `@pos/application/payments`:
  - [ ] Payment provider interface so Midtrans / others can plug in.
- [ ] Integrate with external gateway only after core flows stable.

---

## 7. Authentication & User Domain (AuthCore Last)

> For now: users are seeded and “hardcoded from one place”.  
> AuthCore integration happens after all POS flows are stable.

### 7.1 Domain & schema

- [ ] New `@pos/domain/users`:
  - [ ] `User` entity: `id`, `name`, `email`, `role`, `metadata`.
  - [ ] `TenantUser` mapping: `tenant_id`, `user_id`, roles (`POS_CASHIER`, `POS_ADMIN`, etc.).
- [ ] Database tables:
  - [ ] `users`
  - [ ] `tenant_users`

### 7.2 Seeder & hardcoded context

- [ ] Seeder:
  - [ ] Create at least:
    - [ ] 1 café tenant with a few users.
    - [ ] 1 non-café tenant (e.g. minimarket) with users.
- [ ] Create simple “auth stub” middleware in `apps/api`:
  - [ ] Reads `x-user-id` and `x-tenant-id` headers OR uses a single hardcoded pair.
  - [ ] Validates user exists & belongs to tenant.
  - [ ] Injects `req.user` and `req.tenantId`.
- [ ] Maintain this stub in **one** place, so replacing with AuthCore later is easy.

### 7.3 AuthCore integration (later)

- [ ] Replace stub with AuthCore SDK:
  - [ ] Map AuthCore user → `users` / `tenant_users`.
  - [ ] Map AuthCore tenant/org → `tenants`.
- [ ] Ensure token parsing populates the same request context as the stub.

---

## 8. Loyalty Domain (Later, but already designed)

### 8.1 Domain design

- [ ] In `@pos/domain/loyalty`:
  - [ ] `LoyaltyAccount`: `id`, `tenant_id`, `customer_id` or `phone`, `points_balance`.
  - [ ] `LoyaltyTransaction`: point earning/redemption history.
  - [ ] `LoyaltyRule`: simple rules (e.g. 1 point per X currency).

### 8.2 Schema & use cases (low priority)

- [ ] Tables for accounts, transactions, rules.
- [ ] Use cases:
  - [ ] `AccruePointsOnOrderCompleted`.
  - [ ] `RedeemPointsForOrder`.
- [ ] Hook into order completion in application layer (event or direct call).

### 8.3 Tenant configuration

- [ ] Add `LOYALTY` module flag in `tenant_module_configs`.
- [ ] Only enable loyalty for tenants that need it.

---

## 9. Reporting Domain (Basic First)

### 9.1 Domain & use cases

- [ ] `GetSalesSummary`:
  - [ ] By date range, order type, business type.
- [ ] `GetBestSellingProducts`.

### 9.2 API & UI

- [ ] `/api/reports/sales-summary`.
- [ ] Simple dashboard page in POS terminal or separate admin UI.

---

## 10. Frontend – POS Terminal UX (Café First)

### 10.1 Main flows to support

- [ ] Select order type (Dine In / Take Away / Delivery).
- [ ] For Dine In:
  - [ ] (If table management enabled) choose table from table grid.
  - [ ] (If not) input table number text.
- [ ] Add items with variants & modifiers.
- [ ] Save as draft.
- [ ] Send to kitchen (creates kitchen ticket).
- [ ] Later:
  - [ ] Open draft, add items.
  - [ ] Go to payment dialog, record payment.
  - [ ] Mark order completed.

### 10.2 Navigation & state

- [ ] Implement clear navigation tabs/pages:
  - [ ] Product grid.
  - [ ] Active orders (list).
  - [ ] Tables view (café only).
  - [ ] Kitchen screen (optional).
- [ ] Ensure TanStack Query hooks use tenant & module flags from context.

---

## 11. Documentation & Developer Experience

- [ ] Update `/docs`:
  - [ ] High-level architecture diagram per domain.
  - [ ] Domain descriptions and boundaries.
  - [ ] How business type affects modules.
- [ ] Maintain a `features_checklist.md` synchronized with this tasklist.
- [ ] Document how to run seeding and sample flows for café tenant.