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

## 12. POS Terminal UX Improvements & Critical Fixes

> Based on comprehensive code analysis (Nov 2025)  
> Priority: P0 (critical scroll bug) → P1-P3 (cart/payment refactoring) → P4-P6 (data & features) → Documentation

### 12.1 Critical: Fix POS Page Scroll Behavior (P0)

**Problem:** Product area cannot scroll on any breakpoint; cart panel action buttons invisible on tablet/desktop.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/pages/pos.tsx` line 344: Parent `div.flex-1` has `overflow-hidden`, blocking child `overflow-y-auto`
- `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` line 143: Product grid `overflow-y-auto` prevented by parent constraint
- `apps/pos-terminal-web/src/components/pos/CartPanel.tsx` line 177: Hardcoded `maxHeight: calc(100vh - 450px)` too large for tablet, hiding action buttons

**Implementation:**
- [ ] Fix POS page layout overflow control:
  - [ ] `apps/pos-terminal-web/src/pages/pos.tsx`: Change root container from `overflow-hidden` to `overflow-hidden lg:overflow-visible`
  - [ ] Ensure `ProductArea` and `CartPanel` manage their own scroll independently
- [ ] Fix ProductArea scroll:
  - [ ] `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` line 143: Ensure product grid wrapper has `min-h-0 flex-1 overflow-y-auto`
  - [ ] Verify sticky headers (order type tabs, category tabs) remain fixed while content scrolls
- [ ] Fix CartPanel scroll:
  - [ ] `apps/pos-terminal-web/src/components/pos/CartPanel.tsx` line 177: Replace hardcoded `maxHeight: calc(100vh - 450px)` with responsive approach
  - [ ] Use `flex-1 min-h-0 overflow-y-auto` for cart items area
  - [ ] Use CSS variables for adaptive height: `--cart-header-height`, `--cart-footer-height`
  - [ ] Ensure action buttons (Charge, Partial Payment, Kitchen Ticket) always visible at bottom
- [ ] Test across breakpoints:
  - [ ] Mobile (375px - cart in drawer, not affected)
  - [ ] Tablet (768px - 1024px - verify cart panel actions visible)
  - [ ] Desktop (1280px+ - verify both product area and cart panel scroll independently)

### 12.2 Cart State Refactoring (P1)

**Problem:** Order type selection duplicated between POSPage state and cart; metadata (tableNumber, paymentMethod) in cart but ignored during checkout.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/pages/pos.tsx` line 27: `selectedOrderTypeId` state separate from cart
- `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` lines 351-354: Order type tabs controlled by POSPage state
- `apps/pos-terminal-web/src/components/pos/OrderTypeSelectionDialog.tsx`: Dialog re-prompts for order type user already selected
- `apps/pos-terminal-web/src/hooks/useCart.ts` lines 141-143: Cart has `customerName`, `tableNumber`, `paymentMethod` but these are ignored during checkout
- `apps/pos-terminal-web/src/pages/pos.tsx` line 174: Dialog `result.tableNumber` used instead of `cart.tableNumber`
- `apps/pos-terminal-web/src/pages/pos.tsx` line 185: Payment method hardcoded to `"cash"` instead of using `cart.paymentMethod`

**Implementation:**
- [ ] Move order type to cart state:
  - [ ] `apps/pos-terminal-web/src/hooks/useCart.ts`: Add `selectedOrderTypeId` state and setter
  - [ ] Keep `selectedOrderTypeId` persistent across cart clears (user preference)
  - [ ] Return `selectedOrderTypeId`, `setSelectedOrderTypeId` from useCart hook
- [ ] Update POSPage to use cart state:
  - [ ] `apps/pos-terminal-web/src/pages/pos.tsx`: Remove local `selectedOrderTypeId` state (line 27)
  - [ ] Use `cart.selectedOrderTypeId` and `cart.setSelectedOrderTypeId` throughout
  - [ ] Pass to ProductArea as `selectedOrderTypeId={cart.selectedOrderTypeId}` `onSelectOrderType={cart.setSelectedOrderTypeId}`
- [ ] Update OrderTypeSelectionDialog:
  - [ ] Pre-fill dialog with `cart.selectedOrderTypeId` as default
  - [ ] Pre-fill `cart.tableNumber` as default (if set)
  - [ ] When user confirms, update cart state not just local dialog state
- [ ] Fix checkout payload:
  - [ ] `apps/pos-terminal-web/src/pages/pos.tsx` line 174: Use `cart.tableNumber` as fallback if dialog doesn't provide
  - [ ] `apps/pos-terminal-web/src/pages/pos.tsx` line 185: Use `cart.paymentMethod` instead of hardcoded `"cash"`
  - [ ] Ensure all cart metadata flows to backend order payload

### 12.3 Quick Charge Path (P2)

**Problem:** Every order requires opening OrderTypeSelectionDialog, even for simple counter cash sales where all metadata already set.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/pages/pos.tsx` lines 148-152: `handleCharge()` ALWAYS opens dialog, no bypass logic
- Even if `cart.selectedOrderTypeId` and `cart.tableNumber` already set, dialog still shown
- This creates unnecessary friction for fast-paced counter service

**Implementation:**
- [ ] Add quick charge logic in handleCharge:
  - [ ] Check if `cart.selectedOrderTypeId` is set
  - [ ] Fetch selected order type metadata (from `activeOrderTypes` array)
  - [ ] Check if order type requires table (`needTableNumber` flag)
  - [ ] If table required, check if `cart.tableNumber` is set
  - [ ] If all required metadata present, call `handleQuickCharge()` directly (bypass dialog)
  - [ ] If metadata missing, open dialog as fallback
- [ ] Implement handleQuickCharge function:
  - [ ] Create order with `cart.toBackendOrderItems()`, `cart.selectedOrderTypeId`, `cart.tableNumber`, `cart.customerName`
  - [ ] Record payment with `cart.paymentMethod` (not hardcoded)
  - [ ] Show success toast with order number and amount
  - [ ] Clear cart on success
  - [ ] Handle errors gracefully (keep cart, show error toast)
- [ ] Add UI indicators:
  - [ ] Show visual feedback when quick charge conditions met (e.g., "Ready to charge" badge)
  - [ ] Keyboard shortcut for quick charge (e.g., Ctrl+Enter)
- [ ] Support Cafe A use case (counter service):
  - [ ] Pre-select order type on mount (e.g., "Walk In" or "Dine In" based on tenant)
  - [ ] Quick tender buttons in CartPanel (Cash exact amount, Card, etc.)

### 12.4 Transaction Safety (P3)

**Problem:** Order creation and payment recording not atomic; if payment fails after order created, orphaned order with cart already cleared. No rollback mechanism.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/pages/pos.tsx` lines 177-207: `handleOrderTypeConfirm` creates order, then records payment separately
- If `recordPaymentMutation` fails (line 182), order already exists in DB
- Cart cleared at line 206 regardless of payment success
- User cannot retry payment because cart lost
- No compensating transaction to cancel/delete failed order

**Implementation Options:**

**Option A: Backend Atomic Transaction (Recommended)**
- [ ] Create new backend endpoint `/api/orders/create-and-pay`:
  - [ ] File: `apps/api/src/http/routes/orders.ts`
  - [ ] Accepts: order payload + payment details in single request
  - [ ] Uses DB transaction to create order + record payment atomically
  - [ ] On success: return order + payment data
  - [ ] On failure: rollback both operations, return error
- [ ] Update frontend to use new endpoint:
  - [ ] Replace `createOrderMutation` + `recordPaymentMutation` with single `createAndPayMutation`
  - [ ] Clear cart only after successful response
  - [ ] Show error toast on failure, keep cart intact for retry

**Option B: Frontend Compensating Transaction**
- [ ] Wrap order creation + payment in try-catch:
  - [ ] Create order (get orderId)
  - [ ] Try record payment
  - [ ] If payment fails, call `cancelOrderMutation` to cancel the order
  - [ ] If cancel also fails, log error but still show payment failure to user
  - [ ] Keep cart intact for retry
- [ ] Add `CancelOrder` mutation hook:
  - [ ] File: `apps/pos-terminal-web/src/lib/api/hooks.ts`
  - [ ] Calls `/api/orders/:id/cancel` endpoint (already exists)

**Decision:** Implement Option A first (cleaner, guaranteed atomicity), keep Option B as fallback if backend cannot support transactions.

### 12.5 Table Master Data (P4)

**Problem:** Tables hardcoded 1-5 in OrderTypeSelectionDialog; no table master data, no availability checking, cannot customize per tenant.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/components/pos/OrderTypeSelectionDialog.tsx` lines 267-282: Hardcoded `<SelectItem value="1">Table 1</SelectItem>` through Table 5
- `apps/pos-terminal-web/src/components/pos/CartPanel.tsx` lines 148-158: Hardcoded tables 1-10
- `shared/schema.ts`: NO `tables` table in schema
- Cannot track table status (available, occupied, reserved, maintenance)
- Cannot customize table names, floor, capacity per tenant

**Implementation:**
- [ ] Create tables schema:
  - [ ] File: `shared/schema.ts`
  - [ ] Add `tables` table:
    - [ ] `id` (varchar, UUID PK)
    - [ ] `tenant_id` (FK to tenants, cascading delete)
    - [ ] `table_number` (varchar, not null) - e.g., "1", "A1", "Outdoor-3"
    - [ ] `table_name` (text, nullable) - e.g., "Window Seat 1", "VIP Room"
    - [ ] `floor` (varchar, nullable) - e.g., "Ground Floor", "2nd Floor"
    - [ ] `capacity` (integer, nullable) - max persons
    - [ ] `status` (varchar, not null, default 'available') - 'available' | 'occupied' | 'reserved' | 'maintenance'
    - [ ] `current_order_id` (varchar, FK to orders, nullable) - track active order
    - [ ] `created_at`, `updated_at` timestamps
  - [ ] Indexes: tenant_id, status, tenant+table_number unique
- [ ] Run migration:
  - [ ] `npm run db:push --force` to create table
- [ ] Add repository:
  - [ ] File: `packages/infrastructure/repositories/seating/TableRepository.ts`
  - [ ] Methods: `findByTenant()`, `findById()`, `create()`, `update()`, `updateStatus()`
- [ ] Add use cases:
  - [ ] File: `packages/application/seating/ListTables.ts`
  - [ ] File: `packages/application/seating/CreateTable.ts`
  - [ ] File: `packages/application/seating/UpdateTableStatus.ts`
- [ ] Add API endpoints:
  - [ ] `GET /api/tables` - list tables for tenant (with status filter)
  - [ ] `POST /api/tables` - create table (admin only)
  - [ ] `PATCH /api/tables/:id/status` - update table status
- [ ] Update frontend:
  - [ ] Add `useTables()` hook to fetch tables from API
  - [ ] Update OrderTypeSelectionDialog to use dynamic table list
  - [ ] Filter by status: only show 'available' tables in selection
  - [ ] Update CartPanel table selection to use same dynamic list
- [ ] Seeder data:
  - [ ] Create 10-15 tables for demo tenant with various statuses

### 12.6 Order Type Metadata Validation (P5)

**Problem:** `needTableNumber` flag exists in schema but not used for validation; dialog always shows table field (optional) regardless of order type requirements.

**Root Cause Analysis:**
- `shared/schema.ts` lines 174-190: `orderTypes` table has `needTableNumber`, `needAddress`, `isOnPremise` flags
- `apps/pos-terminal-web/src/components/pos/OrderTypeSelectionDialog.tsx`: Dialog shows table field for ALL order types
- No conditional rendering based on `needTableNumber`
- No validation to enforce required table when flag is true
- Takeaway/Delivery orders can have table numbers (incorrect)

**Implementation:**
- [ ] Update OrderTypeSelectionDialog validation:
  - [ ] Fetch selected order type from `activeOrderTypes` array by `selectedOrderTypeId`
  - [ ] Check `selectedOrderType.needTableNumber` flag
  - [ ] Update Zod schema dynamically:
    - [ ] If `needTableNumber === true`: `tableNumber: z.string().min(1, "Table required for this order type")`
    - [ ] If `needTableNumber === false`: `tableNumber: z.string().optional()`
  - [ ] Conditionally render table field:
    - [ ] Only show table selection if `selectedOrderType.needTableNumber === true`
    - [ ] Hide field completely for Takeaway, Delivery order types
- [ ] Update form labels:
  - [ ] Add red asterisk `*` next to "Table Number" label if required
  - [ ] Show helpful text: "Table required for Dine-In orders"
- [ ] Add order type templates validation:
  - [ ] Ensure Dine-In order types have `needTableNumber: true`
  - [ ] Ensure Takeaway/Delivery have `needTableNumber: false`
  - [ ] Update seeder data to match

### 12.7 Order Queue / Order Line Feature (P6)

**Problem:** No quick view of active orders within POS page; cashier must navigate to separate Orders page to see order status.

**User Requirements (from screenshots):**
- Horizontal card-based view of active orders
- Each card shows: customer name, order number, table number, time/status
- Status badges: Cancelled, Waiting, Ready to Serve, Completed, Order Prepare
- Displayed IN the POS page (not separate page) above or beside product area
- Quick access to order details, update status

**Implementation:**
- [ ] Create OrderQueue component:
  - [ ] File: `apps/pos-terminal-web/src/components/pos/OrderQueue.tsx`
  - [ ] Horizontal scrollable card layout (similar to screenshot)
  - [ ] Each card:
    - [ ] Customer name (from order.customer_name)
    - [ ] Order number (order.order_number)
    - [ ] Table number (order.table_number)
    - [ ] Status badge with color coding:
      - [ ] Draft → Gray
      - [ ] Confirmed / Waiting → Orange
      - [ ] Preparing → Yellow
      - [ ] Ready to Serve → Green
      - [ ] Completed → Blue
      - [ ] Cancelled → Red
    - [ ] Elapsed time (since order created_at)
    - [ ] Click to view order details or update status
- [ ] Data fetching:
  - [ ] Use existing `useListOpenOrders()` hook (already implemented)
  - [ ] Filter by status: `['draft', 'confirmed', 'preparing', 'ready']`
  - [ ] Auto-refresh every 30 seconds (or use websocket for real-time)
  - [ ] Show loading skeleton while fetching
- [ ] Integrate into POS page:
  - [ ] `apps/pos-terminal-web/src/pages/pos.tsx`: Add `<OrderQueue />` above ProductArea
  - [ ] Collapsible panel (can hide/show to save space)
  - [ ] Default visible on desktop (>=1280px), hidden on mobile/tablet
  - [ ] Toggle button to show/hide queue
- [ ] Status update actions:
  - [ ] Quick action buttons on each card:
    - [ ] "Start Preparing" (draft → confirmed)
    - [ ] "Ready" (preparing → ready)
    - [ ] "Complete" (ready → completed, if paid)
    - [ ] "Cancel" (any → cancelled)
  - [ ] Confirmation dialog for destructive actions (cancel, complete)
- [ ] Module gating:
  - [ ] Only show OrderQueue if tenant has orders feature enabled
  - [ ] For cafe/restaurant, always visible
  - [ ] For retail/minimarket, may hide (different workflow)

### 12.8 Order Lifecycle Documentation & Terminology Clarity

**Problem:** Confusion between "open order", "draft order", "active order" - unclear state machine.

**User Question:** What is "open order"? Is it same as draft? Customer masih menikmati makanan, order belum dibayar - status apa?

**Analysis:**
- Current schema: `status: 'draft' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'`
- Current schema: `payment_status: 'unpaid' | 'partial' | 'paid'`
- `ListOpenOrders` returns: status in `['draft', 'confirmed', 'preparing', 'ready']`

**Proposed Terminology:**
1. **Draft Order**: Order in cart, not yet submitted/printed. `status = 'draft'`, `payment_status = 'unpaid'`. Temporary, can be deleted/modified freely.
2. **Open Order (Active Tab)**: Order submitted and confirmed but not yet paid. `status = 'confirmed'`, `payment_status = 'unpaid'` or `'partial'`. Customer enjoying meal, bill not settled.
3. **In-Progress Order**: Order being prepared. `status = 'preparing'` or `'ready'`.
4. **Completed Order**: Order fully paid and closed. `status = 'completed'`, `payment_status = 'paid'`.

**State Machine (for Cafe/Restaurant Dine-In):**
```
Cart → [Submit] → Draft (printed)
Draft → [Confirm] → Open Tab (status=confirmed, payment=unpaid)
Open Tab → [Send to Kitchen] → Preparing
Preparing → [Chef marks ready] → Ready to Serve
Ready → [Record Payment] → (payment_status: unpaid → partial or paid)
If payment_status=paid → [Complete] → Completed
```

**Implementation:**
- [ ] Document state machine:
  - [ ] File: `docs/order-lifecycle.md`
  - [ ] Mermaid diagram showing all transitions
  - [ ] Explain terminology: draft vs open vs active vs completed
- [ ] Update use case naming:
  - [ ] Consider renaming `ListOpenOrders` to `ListActiveOrders` for clarity
  - [ ] Or keep `ListOpenOrders` but document it includes draft+confirmed+preparing+ready
- [ ] Update UI labels:
  - [ ] Orders page: rename tab "Open Orders" to "Active Orders" or "In Progress"
  - [ ] Clearly distinguish draft (in cart) vs confirmed (open tab)
- [ ] Add order status helper:
  - [ ] File: `packages/core/utils/orderStatus.ts`
  - [ ] `isDraft()`, `isOpenTab()`, `isInProgress()`, `isCompleted()`, `isCancelled()`
  - [ ] `canAddItems()`, `canSendToKitchen()`, `canRecordPayment()`, `canComplete()`

### 12.9 Bills Feature Specification (Future)

**Problem:** Sidebar has disabled "Bills" menu (line 22 in Sidebar.tsx) with no clear specification. What should this feature do?

**Possible Interpretations:**
1. **Print Bill / Check**: Print itemized bill for customer review before payment (common in restaurants)
2. **Pending Invoices**: List of unpaid orders that need follow-up
3. **Split Bill**: Feature to split single order into multiple payments
4. **Bill History**: Archive of all printed bills/receipts

**Recommendation:**
- **Short-term**: Remove disabled "Bills" menu item from sidebar to reduce confusion
- **Long-term**: Define clear scope based on business requirements:
  - If needed for "Print Bill before Payment" → implement as action in Order details page
  - If needed for "Unpaid Orders" → rename to "Unpaid Orders" and use `ListOpenOrders` with payment_status filter
  - If needed for "Split Bill" → implement as feature in payment dialog

**Implementation (when scoped):**
- [ ] Define Bills feature requirements:
  - [ ] Gather user stories from cafe/restaurant operators
  - [ ] Differentiate from Orders, Payments, Receipts
  - [ ] Decide on terminology: "Bills", "Invoices", "Tabs", "Checks"
- [ ] If implementing "Print Bill":
  - [ ] Add "Print Bill" button in Order details page
  - [ ] Generate PDF/thermal printer format with itemized list, subtotal, tax, total
  - [ ] Mark order as "bill_printed" (optional flag in metadata)
- [ ] If implementing "Unpaid Orders":
  - [ ] Rename menu to "Unpaid Orders" or "Open Tabs"
  - [ ] Create page showing orders with payment_status = 'unpaid' or 'partial'
  - [ ] Group by table, customer, or date
  - [ ] Quick actions: Record Payment, Cancel Order
- [ ] For now:
  - [ ] Remove disabled Bills menu item from Sidebar.tsx
  - [ ] Document in backlog for future consideration

---

When you finish a group of tasks for a domain, ensure:

- All tests and type checks pass.
- The feature is demo-able using the seeded café tenant.
- The implementation does not introduce unwanted coupling between domains or business-type-specific concerns and generic layers.
- Both `docs/aura-pos-tasklist-en.md` and `docs/aura-pos-tasklist-id.md` are updated with `[x]` marks for the tasks you just completed, and git history clearly reflects which tasks were addressed.