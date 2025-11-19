# Replit Agent Prompt – AuraPoS POS Tasks

You are an expert full-stack engineer (TypeScript, Node.js/Express, React, Drizzle/Neon) and an architecture-aware DDD practitioner working inside the **AuraPoS** monorepo.

Your goals:

- Follow the **task checklist below** exactly, domain by domain.
- Keep the existing DDD structure clean:
  - `apps/api` – backend
  - `apps/pos-terminal-web` – POS terminal frontend
  - `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/core`, `packages/features`, `shared/`
- Do **not** introduce hard foreign-key dependencies from `orders` to restaurant-specific tables (tables, kitchen, DP, etc). Those must be separate modules that reference orders, not the other way around (except neutral fields like `table_number` string).
- The first business we optimize for is **café/restaurant**, but the design must stay generic enough for other verticals (retail, minimarket, laundry, services, PPOB).
- Authentication and external payment integrations are implemented **last**. For now we use seeded users and internal payments only.
- Every time you implement a feature:
  - Add or update relevant documentation in `/docs`.
  - Prefer small, focused commits per domain and per use case.

---

## Checklist maintenance & avoiding duplicate work

Before starting any new work, and after finishing any task, you **must** keep the tasklists in sync and avoid redoing work.

### A. Before implementing any task

1. **Load both checklists:**
   - `docs/aura-pos-tasklist-en.md`
   - `docs/aura-pos-tasklist-id.md`

2. **Check for completed tasks:**
   - If a task (or sub-task) is already marked with `[x]` in EN/ID files, **do not re-implement it**.
   - If the checkbox is `[ ]` but code / endpoints / migrations already exist and match the description, treat it as **already implemented but not checked off**. In that case:
     - Verify that implementation is correct and consistent with the checklist.
     - Then mark it `[x]` as part of your update (see section B).

3. **Check git history to avoid duplicates:**
   - Run `git log --oneline --decorate -n 50` (or more if needed).
   - Look for commits that already mention the same domain/use case (e.g. `CreateOrder`, `Tenant`, `BusinessType`, `TableSession`, etc.).
   - If you find related work, inspect the relevant files instead of starting from scratch. Prefer **refinement or extension** over duplication.

4. **Scope your work:**
   - Explicitly decide which checklist items you’re going to handle in this iteration (e.g. “1.1 Domain model” and “1.2 Database schema”).
   - Ensure no other previous implementation conflicts with your plan.

### B. After completing a task

Whenever you finish implementing a task or sub-task:

1. **Update both checklists:**
   - Open `docs/aura-pos-tasklist-en.md`:
     - Change the relevant `- [ ]` items to `- [x]` for the tasks that are now done.
   - Open `docs/aura-pos-tasklist-id.md`:
     - Mirror the same changes: check the corresponding `- [ ]` items to `- [x]`.
   - Do **not** delete tasks; only mark them completed or add short annotations if necessary (e.g. `- [x] ... (implemented in apps/api/... and packages/domain/...)`).

2. **Avoid partial marking:**
   - Only mark a task `[x]` when all its sub-items under that bullet are implemented and wired (domain + application + infrastructure + API/UI as relevant).
   - If you only complete half of a sub-task, add a short note but keep the parent checklist item unchecked.

3. **Commit messages:**
   - Use commit messages that reference the domain and checklist section where possible, e.g.:
     - `feat(tenants): add business type templates [tasks:1.1-1.4]`
     - `feat(orders): implement ConfirmOrder use case [tasks:3.2]`
   - This helps future agents map commits back to checklist items.

4. **Re-run sanity checks:**
   - Ensure tests/type-check build still pass after your changes.
   - If a task required DB changes, ensure migrations are included and seeding still works.

---

## General implementation rules

1. Work **top-down per domain** following the checklist; do not jump randomly unless necessary.
2. For each task:
   - Implement domain types in `packages/domain/*`.
   - Implement use cases in `packages/application/*`.
   - Implement repositories/adapters in `packages/infrastructure/*` and migrations in `shared/schema.ts` + `migrations/`.
   - Finally wire HTTP endpoints in `apps/api` and UI flows in `apps/pos-terminal-web`.
3. Keep all configuration (business type templates, module flags, etc.) in central, well-named files.
4. For temporary stubs (auth, payments, etc.), centralize them in a single place so they are easy to replace later.
5. When in doubt, choose the solution that:
   - Keeps domains decoupled.
   - Avoids leaking restaurant-only logic into generic layers.
   - Reuses existing patterns already present in the repo.

---

## AuraPoS – Domain-Based Task Checklist (EN)

> Priority: Café / Restaurant first.  
> Architecture: DDD (domain / application / infrastructure / apps/api / apps/pos-terminal-web).  
> Constraints:
> - Orders must **not** have hard foreign-key dependencies to tables, kitchen, DP, or other vertical-specific tables.
> - Business type (vertical) drives which modules/domains are loaded per tenant.
> - Authentication (AuthCore) implemented last; for now users are seeded and hardcoded from one place.
> - External payment gateways are implemented last; for now we use internal “mark as paid / partial” only.
> - Loyalty module is designed and listed, but implemented later.

### 0. Foundation & Cleanup

#### 0.1 Repo & DDD structure sanity check

- [ ] Confirm monorepo layout:
  - [ ] `apps/api` – Express backend
  - [ ] `apps/pos-terminal-web` – POS terminal web (Vite + React)
  - [ ] `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/core`, `packages/features`, `shared/`
- [ ] Ensure all imports use workspace paths (`@pos/domain`, `@pos/application`, etc.).
- [ ] Remove or clearly mark legacy / unused files (if any) so Replit agent doesn’t touch them.

#### 0.2 Shared core utilities

- [x] In `@pos/core` define shared constants & types:
  - [x] `BusinessType` enum/union (e.g. `CAFE_RESTAURANT`, `RETAIL_MINIMARKET`, `LAUNDRY`, `SERVICE_APPOINTMENT`, `DIGITAL_PPOB`).
  - [x] `OrderStatus`, `PaymentStatus`, `OrderTypeCode` central enums.
  - [x] `FeatureCode` enum (sync with `tenant_features.feature_code` and `FEATURE_CODES`).

### 1. Tenant & Business Type Domain

#### 1.1 Domain model

- [x] In `@pos/domain/tenants`:
  - [x] Add `BusinessType` model/type.
  - [x] Extend `Tenant` with:
    - [x] `business_type: BusinessType`
    - [x] `settings: Record<string, any>` (JSON config per tenant, business-type specific).
  - [x] Add `TenantModuleConfig` type to represent which modules are enabled for a tenant:
    - [x] Flags such as `enable_table_management`, `enable_kitchen_ticket`, `enable_loyalty`, `enable_delivery`, etc.

#### 1.2 Database schema & migrations

- [ ] Add `business_types` master table (optional but recommended):
  - [ ] `code`, `name`, `description`, `is_active`.
- [ ] Update `tenants` table:
  - [ ] Add `business_type` (FK to `business_types.code` or enum-like string).
  - [ ] Add `settings` JSON column (nullable).
- [ ] Add `tenant_module_configs` table (if you prefer explicit rows instead of JSON):
  - [ ] `tenant_id`
  - [ ] `module_code` (e.g. `TABLE_MANAGEMENT`, `LOYALTY`, `DELIVERY`)
  - [ ] `is_enabled`
  - [ ] optional `config` JSON.

#### 1.3 Application layer use cases

- [ ] `CreateTenant` use case:
  - [ ] Input includes `business_type`.
  - [ ] Creates tenant + default `tenant_features` + default `tenant_order_types` based on business type template.
  - [ ] Initializes `tenant_module_configs` or `settings` with sensible defaults.
- [ ] `GetTenantProfile` use case:
  - [ ] Returns tenant + enabled features + enabled modules for a given tenant id.

#### 1.4 Business-type templates

- [ ] Define in `@pos/application/tenants`:
  - [ ] `BusinessTypeTemplate` mapping:
    - [ ] For each `BusinessType`, list:
      - [ ] Default `order_types` to enable (e.g. Café = `DINE_IN`, `TAKE_AWAY`, `DELIVERY`).
      - [ ] Default `feature_codes` (e.g. café: `product_variants`, `kitchen_ticket`, `partial_payment`).
      - [ ] Default modules (`TABLE_MANAGEMENT` for café only, not for minimarket, etc.).
- [ ] Wire `CreateTenant` to use templates above.

#### 1.5 API / backend wiring

- [ ] Add `/api/tenants/register`:
  - [ ] Accepts `business_type`, basic tenant info.
  - [ ] Calls `CreateTenant`.
  - [ ] Returns tenant and enabled modules/features.
- [ ] Extend existing `/api/tenants/features` or create `/api/tenants/modules`:
  - [ ] Returns module flags (table management, loyalty, etc.) for front-end.

#### 1.6 Frontend integration (POS terminal)

- [ ] In `apps/pos-terminal-web`:
  - [ ] Add hook `useTenantProfile()` which:
    - [ ] Fetches tenant profile + module flags.
    - [ ] Stores `business_type` and module map in a React context.
  - [ ] Use this context to:
    - [ ] Show/hide table management screens (only for café/restaurant).
    - [ ] Show/hide delivery address fields if enabled.
    - [ ] Show/hide loyalty UI (later).

### 2. Catalog Domain (Products, Variants, Options)

> Goal: Catalog works for all verticals, but café/restaurant use-case first.

#### 2.1 Domain refinement

- [ ] In `@pos/domain/catalog`:
  - [ ] Ensure `Product` is neutral (no direct dependency on tables, kitchen, etc.).
  - [ ] Extend metadata field(s) to support different business types:
    - [ ] `metadata.service_duration_minutes` (for appointments).
    - [ ] `metadata.weight_based` / `weight_unit` (for laundry).
    - [ ] `metadata.sku_type` for PPOB vs physical goods.
- [ ] Finalize multi-modifier model:
  - [ ] `ProductOptionGroup` with `selectionType`, `min`, `max`.
  - [ ] `ProductOption` with `price_delta`, optional `inventory_sku`.

#### 2.2 Infrastructure & repository

- [ ] Ensure repositories in `@pos/infrastructure/repositories/catalog`:
  - [ ] Read/write data for products, option groups, options.
  - [ ] Always scope by `tenant_id`.
  - [ ] Support filtering by `business_type` or categories.

#### 2.3 Application use cases

- [ ] `GetProductsForTenant`:
  - [ ] Accepts `tenant_id`, optional filters.
  - [ ] Returns products including option groups/options.
- [ ] `CreateOrUpdateProduct`:
  - [ ] Handles product + variants + option groups in one operation.
- [ ] (Later) `BulkImportProducts` for retail/minimarket.

#### 2.4 POS UI integration

- [ ] Update `ProductCard` & `ProductOptionsDialog` to:
  - [ ] Support multi-modifier selection (checkbox/stepper for add-ons).
  - [ ] Validate `min`/`max` rules before adding to cart.
- [ ] Ensure café flow works:
  - [ ] Size (Small/Medium/Large).
  - [ ] Add-ons (extra shot, toppings, etc.).

### 3. Ordering Domain (Generic, No Hard Table Dependency)

> Core rule: Orders are generic.  
> Tables, kitchen, DP, loyalty, etc. are **separate modules** that reference orders, not the other way around (except neutral fields like `table_number`).

#### 3.1 Domain model

- [ ] In `@pos/domain/orders` ensure `Order`:
  - [ ] Has `order_type_id` / `order_type_code` (DINE_IN, TAKE_AWAY, DELIVERY, WALK_IN, etc.).
  - [ ] Has `status: 'draft' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'`.
  - [ ] Has `payment_status: 'unpaid' | 'partial' | 'paid'`.
  - [ ] Has `table_number?: string` (plain text, no FK to tables).
  - [ ] Has generic `metadata?: Record<string, any>` for business-specific extra fields.
- [ ] Keep `KitchenTicket` as separate entity referencing `order_id` (already existing).
- [ ] Keep `OrderPayment` separate (no external gateway coupling).

#### 3.2 Draft vs immediate payment flows

- [ ] In `CreateOrder` use case:
  - [ ] Create orders with `status = 'draft'` by default.
  - [ ] Allow both:
    - [ ] Draft with table: DINE_IN + `table_number`.
    - [ ] Draft takeaway: TAKE_AWAY without `table_number`.
  - [ ] `payment_status` initially `unpaid`.
- [ ] Add `ConfirmOrder` use case:
  - [ ] Moves `status` from `draft` → `confirmed`.
- [ ] Add `CompleteOrder` / `CancelOrder` use cases:
  - [ ] Complete: only allowed if fully paid OR allowed by configuration.
  - [ ] Cancel: update status, do not require payment.

#### 3.3 Order querying & listing

- [ ] Add `ListOpenOrders` use case:
  - [ ] Returns orders with status in `['draft', 'confirmed', 'preparing', 'ready']`.
  - [ ] Filter by order type (DINE_IN / TAKE_AWAY) and optionally by `table_number`.
- [ ] Add `ListOrderHistory` use case:
  - [ ] Paged list for completed/cancelled orders for reporting.

#### 3.4 API endpoints

- [ ] `/api/orders`:
  - [ ] `POST` – create draft order (cart→order).
  - [ ] `GET` – list orders with filters.
- [ ] `/api/orders/:id/confirm` – confirm order.
- [ ] `/api/orders/:id/complete` – complete order.
- [ ] `/api/orders/:id/cancel` – cancel order.

#### 3.5 POS UI

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

### 4. Table & Seating Management Domain (Café/Restaurant Only)

> Implemented as separate module. Orders do not depend on tables with hard FK.

#### 4.1 Domain model

- [ ] New `@pos/domain/seating` (or `tables`) package:
  - [ ] `Table` entity:
    - [ ] `id`, `tenant_id`, `name/number`, `area` (e.g. indoor/outdoor), `capacity`, `status`.
  - [ ] `TableStatus` enum: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `DIRTY`, `INACTIVE`.
  - [ ] `TableSession` entity:
    - [ ] `id`, `tenant_id`, `table_id`, `order_id`, `started_at`, `closed_at`, `status`.

#### 4.2 Database schema

- [ ] `tables` table.
- [ ] `table_sessions` table (references `orders.id` but optional from the `Order` side).

#### 4.3 Application use cases

- [ ] `CreateTable`, `UpdateTable`, `ListTables`.
- [ ] `OpenTableSession`:
  - [ ] Creates new session for a table and associates with an order (dine-in).
- [ ] `MoveTableSession`:
  - [ ] Move session from one table to another.
- [ ] `CloseTableSession`:
  - [ ] Mark session as closed when order is completed.

#### 4.4 POS UI

- [ ] “Table view” page for café tenants:
  - [ ] Grid layout of tables with colors based on status.
  - [ ] Click table:
    - [ ] See current order if occupied.
    - [ ] Create new order if available.

### 5. Kitchen & Fulfillment Domain

#### 5.1 Domain & use cases

- [ ] Ensure `CreateKitchenTicket` use case is wired:
  - [ ] Triggered when order is confirmed or when operator explicitly sends to kitchen.
- [ ] Add `UpdateKitchenTicketStatus` use case:
  - [ ] `pending` → `preparing` → `ready` → `delivered`.

#### 5.2 Database & repositories

- [ ] Ensure `kitchen_tickets` table is used via repository.
- [ ] No hard dependency from orders; only `kitchen_tickets.order_id`.

#### 5.3 POS / kitchen UI

- [ ] Basic “kitchen screen” (could be simple web page):
  - [ ] List of tickets with items, table number, notes.
  - [ ] Buttons to update status.

### 6. Payment Domain (Internal First, Gateway Later)

> For now: internal `order_payments` + simple buttons.  
> Later: integrate Midtrans or others.

#### 6.1 Domain model review

- [ ] In `@pos/domain/orders` confirm `OrderPayment` entity has:
  - [ ] `order_id`, `amount`, `payment_method`, `payment_status`, `transaction_ref`, `notes`, `paid_at`.

#### 6.2 Internal payment flows

- [ ] Ensure `RecordPayment` use case:
  - [ ] Supports partial payments.
  - [ ] Updates `order.payment_status` (`unpaid` / `partial` / `paid`) and `paid_amount`.
- [ ] Add `VoidPayment` / `RefundPayment` use case (internal):
  - [ ] For now just record a negative payment or separate record, no gateway.

#### 6.3 API endpoints

- [ ] `/api/orders/:id/payments`:
  - [ ] `POST` – record payment.
  - [ ] Optionally `DELETE` or `POST /void` for refunds.

#### 6.4 POS UI

- [ ] “Payment dialog”:
  - [ ] Input amount, choose method (cash, card, ewallet, other).
  - [ ] Show remaining balance and new status.
- [ ] Quick buttons:
  - [ ] “Mark as fully paid”.
  - [ ] “Mark DP (partial payment)” (uses `RecordPayment` with partial amount).

#### 6.5 Phase 2 – External gateway (later)

- [ ] Design abstraction in `@pos/application/payments`:
  - [ ] Payment provider interface so Midtrans / others can plug in.
- [ ] Integrate with external gateway only after core flows stable.

### 7. Authentication & User Domain (AuthCore Last)

> For now: users are seeded and “hardcoded from one place”.  
> AuthCore integration happens after all POS flows are stable.

#### 7.1 Domain & schema

- [ ] New `@pos/domain/users`:
  - [ ] `User` entity: `id`, `name`, `email`, `role`, `metadata`.
  - [ ] `TenantUser` mapping: `tenant_id`, `user_id`, roles (`POS_CASHIER`, `POS_ADMIN`, etc.).
- [ ] Database tables:
  - [ ] `users`
  - [ ] `tenant_users`

#### 7.2 Seeder & hardcoded context

- [ ] Seeder:
  - [ ] Create at least:
    - [ ] 1 café tenant with a few users.
    - [ ] 1 non-café tenant (e.g. minimarket) with users.
- [ ] Create simple “auth stub” middleware in `apps/api`:
  - [ ] Reads `x-user-id` and `x-tenant-id` headers OR uses a single hardcoded pair.
  - [ ] Validates user exists & belongs to tenant.
  - [ ] Injects `req.user` and `req.tenantId`.
- [ ] Maintain this stub in **one** place, so replacing with AuthCore later is easy.

#### 7.3 AuthCore integration (later)

- [ ] Replace stub with AuthCore SDK:
  - [ ] Map AuthCore user → `users` / `tenant_users`.
  - [ ] Map AuthCore tenant/org → `tenants`.
- [ ] Ensure token parsing populates the same request context as the stub.

### 8. Loyalty Domain (Later, but already designed)

#### 8.1 Domain design

- [ ] In `@pos/domain/loyalty`:
  - [ ] `LoyaltyAccount`: `id`, `tenant_id`, `customer_id` or `phone`, `points_balance`.
  - [ ] `LoyaltyTransaction`: point earning/redemption history.
  - [ ] `LoyaltyRule`: simple rules (e.g. 1 point per X currency).

#### 8.2 Schema & use cases (low priority)

- [ ] Tables for accounts, transactions, rules.
- [ ] Use cases:
  - [ ] `AccruePointsOnOrderCompleted`.
  - [ ] `RedeemPointsForOrder`.
- [ ] Hook into order completion in application layer (event or direct call).

#### 8.3 Tenant configuration

- [ ] Add `LOYALTY` module flag in `tenant_module_configs`.
- [ ] Only enable loyalty for tenants that need it.

### 9. Reporting Domain (Basic First)

#### 9.1 Domain & use cases

- [ ] `GetSalesSummary`:
  - [ ] By date range, order type, business type.
- [ ] `GetBestSellingProducts`.

#### 9.2 API & UI

- [ ] `/api/reports/sales-summary`.
- [ ] Simple dashboard page in POS terminal or separate admin UI.

### 10. Frontend – POS Terminal UX (Café First)

#### 10.1 Main flows to support

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

#### 10.2 Navigation & state

- [ ] Implement clear navigation tabs/pages:
  - [ ] Product grid.
  - [ ] Active orders (list).
  - [ ] Tables view (café only).
  - [ ] Kitchen screen (optional).
- [ ] Ensure TanStack Query hooks use tenant & module flags from context.

### 11. Documentation & Developer Experience

- [ ] Update `/docs`:
  - [ ] High-level architecture diagram per domain.
  - [ ] Domain descriptions and boundaries.
  - [ ] How business type affects modules.
- [ ] Maintain a `features_checklist.md` synchronized with this tasklist.
- [ ] Document how to run seeding and sample flows for café tenant.

---

When you finish a group of tasks for a domain, ensure:

- All tests and type checks pass.
- The feature is demo-able using the seeded café tenant.
- The implementation does not introduce unwanted coupling between domains or business-type-specific concerns and generic layers.
- Both `docs/aura-pos-tasklist-en.md` and `docs/aura-pos-tasklist-id.md` are updated with `[x]` marks for the tasks you just completed, and git history clearly reflects which tasks were addressed.