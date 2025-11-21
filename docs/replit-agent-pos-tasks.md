# Replit Agent Prompt – AuraPoS POS Tasks

You are an expert full-stack engineer (TypeScript, Node.js/Express, React, Drizzle/Neon) and an architecture-aware DDD practitioner working inside the **AuraPoS** monorepo.

Your goals:

- Follow the **task checklist below** exactly, prioritized by critical bugs first (Section 12), then features (Sections 1-11).
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
   - `docs/aura-pos-tasklist-en.md` (PRIMARY)
   - `docs/replit-agent-pos-tasks.md` (THIS FILE - AGENT INSTRUCTIONS)

2. **Check for completed tasks:**
   - If a task (or sub-task) is already marked with `[x]`, **do not re-implement it**.
   - If the checkbox is `[ ]` but code / endpoints / migrations already exist and match the description, treat it as **already implemented but not checked off**. Verify correctness, then mark `[x]`.

3. **Check git history to avoid duplicates:**
   - Run `git log --oneline --decorate -n 50` (or more if needed).
   - Look for commits that already mention the same domain/use case (e.g. `CreateOrder`, `Tenant`, `BusinessType`, `TableSession`, etc.).
   - If you find related work, inspect the relevant files instead of starting from scratch. Prefer **refinement or extension** over duplication.

4. **Scope your work:**
   - Explicitly decide which checklist items you're going to handle in this iteration.
   - Ensure no other previous implementation conflicts with your plan.

### B. After completing a task

Whenever you finish implementing a task or sub-task:

1. **Update both checklists:**
   - Open `docs/aura-pos-tasklist-en.md`:
     - Change the relevant `- [ ]` items to `- [x]` for the tasks that are now done.
   - Update `docs/replit-agent-pos-tasks.md`:
     - Mirror the same changes: check the corresponding `- [ ]` items to `- [x]`.
   - Do **not** delete tasks; only mark them completed or add short annotations if necessary.

2. **Avoid partial marking:**
   - Only mark a task `[x]` when all its sub-items under that bullet are implemented and wired (domain + application + infrastructure + API/UI as relevant).
   - If you only complete half of a sub-task, add a short note but keep the parent checklist item unchecked.

3. **Commit messages:**
   - Use commit messages that reference the domain and checklist section where possible, e.g.:
     - `feat(tenants): add business type templates [tasks:1.1-1.4]`
     - `feat(orders): implement ConfirmOrder use case [tasks:3.2]`
     - `fix(pos): scroll regression and cart state refactoring [critical-tasks:12.1-12.2]`

4. **Re-run sanity checks:**
   - Ensure tests/type-check build still pass after your changes.
   - If a task required DB changes, ensure migrations are included and seeding still works.

---

## General implementation rules

1. Work **top-down per domain** following the checklist; do not jump randomly unless necessary.
2. For each task:
   - Implement domain types in `packages/domain/*`.
   - Implement use cases in `packages/application/*`.
   - Implement repositories/adapters in `packages/infrastructure/*` and migrations in `shared/schema.ts`.
   - Finally wire HTTP endpoints in `apps/api` and UI flows in `apps/pos-terminal-web`.
3. Keep all configuration (business type templates, module flags, etc.) in central, well-named files.
4. For temporary stubs (auth, payments, etc.), centralize them in a single place so they are easy to replace later.
5. When in doubt, choose the solution that:
   - Keeps domains decoupled.
   - Avoids leaking restaurant-only logic into generic layers.
   - Reuses existing patterns already present in the repo.

---

## AuraPoS – Domain-Based Task Checklist (Prioritized)

> **CRITICAL PRIORITY CHANGE (Nov 2025):**
> Sections 12-14 contain URGENT critical bugs and must be implemented BEFORE new features.
> Reference: `docs/aura-pos-tasklist-en.md` for full details, Sections 1-11 are features, Sections 12-14 are bugfixes.

### 1. Architecture & Project Setup (COMPLETED)

- [x] Monorepo setup with Turborepo.
- [x] Core packages structure: `@pos/domain`, `@pos/application`, `@pos/infrastructure`.
- [x] Database setup (PostgreSQL via Neon) with Drizzle ORM.
- [x] API server (Express + TypeScript).
- [x] Frontend (React + Vite + TailwindCSS).

### 2. Multi-Tenancy & Business Type Foundation (COMPLETED)

- [x] Tenant database schema: `tenants`, `business_types`, `tenant_module_configs`.
- [x] Module flags (`orders`, `kitchen`, `loyalty`, `invoicing`) per tenant.
- [x] Tenant context passed via header/JWT.
- [x] All repos & use cases validate tenant activation.

### 3. Ordering Domain (COMPLETED)

- [x] Order entity with `order_type_id`, `status`, `payment_status`, `table_number?`, `metadata?`.
- [x] `KitchenTicket` and `OrderPayment` as separate entities.
- [x] `ListOpenOrders` use case with pagination.
- [x] `ListOrderHistory` use case.
- [x] `/api/orders` – POST/GET, `/api/orders/:id/confirm`, `/api/orders/:id/complete`, `/api/orders/:id/cancel`.
- [x] POS UI: Order list page, Order creation dialog, Order type selection.
- **TODO (Section 12.2):** Integrate `needTableNumber` validation (cart state refactoring).

### 4. Table & Seating Management Domain

> **CRITICAL BUG:** Tables currently hardcoded in OrderTypeSelectionDialog (line 267-282) and CartPanel (line 148-158).
> Reference: Section 12 bugfix, Section 4 implementation in `docs/aura-pos-tasklist-en.md`.

**Phase 1: Replace Hardcoded Tables (Priority 2, after cart refactoring)**

- [ ] Add `tables` schema to `shared/schema.ts`:
  - [ ] id, tenant_id, table_number, table_name, floor, capacity, status, current_order_id
  - [ ] Indexes: tenant_id, status, unique (tenant_id, table_number)
  - [ ] Run: `npm run db:push --force`

- [ ] Create `TableRepository` in `packages/infrastructure/repositories/seating/`:
  - [ ] `findByTenant(tenantId, filters?)`, `findById(id)`, `create(data)`, `updateStatus(id, status, orderId?)`

- [ ] Create use cases in `packages/application/seating/`:
  - [ ] `ListTables.ts`, `CreateTable.ts`, `UpdateTableStatus.ts`

- [ ] Create API endpoints: `GET /api/tables`, `POST /api/tables`, `PATCH /api/tables/:id/status`

- [ ] Create `useTables()` hook: `apps/pos-terminal-web/src/lib/api/hooks.ts`

- [ ] Update `OrderTypeSelectionDialog.tsx` (line 267):
  - [ ] Replace hardcoded tables with `useTables().filter(t => t.status === 'available')`
  - [ ] Show table_name if set, else table_number
  - [ ] Add loading skeleton, "No tables available" fallback

- [ ] Update `CartPanel.tsx` (line 148):
  - [ ] Replace hardcoded 1-10 with dynamic list from `useTables()`
  - [ ] Show status badges, gray out occupied tables

- [ ] Hook into order lifecycle:
  - [ ] When order → completed: reset table to 'available'
  - [ ] When order → confirmed: set table to 'occupied' with order_id

- [ ] Create seeder: 10-15 sample tables with different numbers, floors, capacities
  - [ ] Register in main seeder: `packages/infrastructure/seeders/index.ts`

**Phase 2: Advanced Table Features (Post-MVP)**

- [ ] `TableSession` entity for occupancy tracking & analytics
- [ ] Table floor plan visual grid page
- [ ] Table merge/split for large parties

### 5. Kitchen & Fulfillment Domain (COMPLETED)

- [x] `CreateKitchenTicket` use case wired to order confirmation.
- [x] `UpdateKitchenTicketStatus` use case: pending → preparing → ready → delivered.
- [x] No hard dependency from orders; only `kitchen_tickets.order_id`.
- [x] Basic kitchen screen (simple web page).

### 6. Payment Domain (COMPLETED FOR INTERNAL)

- [x] `OrderPayment` entity with `order_id`, `amount`, `payment_method`, `payment_status`, `transaction_ref`, `notes`, `paid_at`.
- [x] `RecordPayment` use case supporting partial payments.
- [x] `/api/orders/:id/payments` – POST (record payment).
- [x] POS UI: Payment dialog, quick buttons.

**CRITICAL BUG (Section 12.4):**

- **TODO [P3]:** Implement atomic `/api/orders/create-and-pay` endpoint with DB transaction
  - [ ] Backend: Create endpoint that wraps CreateOrder + RecordPayment in DB transaction
  - [ ] Frontend: Replace two separate mutations with single `createAndPayMutation`
  - [ ] Clear cart ONLY after successful response
  - [ ] Keep cart intact on error for retry

**Phase 2: External Payment Gateways (Post-MVP)**

- [ ] Design abstraction in `@pos/application/payments`: Payment provider interface for Midtrans / others

### 7. Loyalty & Customer Profiles (OPTIONAL MODULE)

- [ ] `Customer` entity (email, phone, name, loyalty_points_balance)
- [ ] `LoyaltyTransaction` entity (customer, order, points_accrued, points_redeemed, timestamp)
- [ ] `AccruePointsOnOrderCompleted` use case
- [ ] `RedeemPointsForOrder` use case
- [ ] Tenant configuration: `LOYALTY` module flag only enable for tenants that need it

### 8. Reporting Domain (BASIC)

- [ ] `GetSalesSummary` use case (by date range, order type, business type)
- [ ] `GetBestSellingProducts` use case
- [ ] `/api/reports/sales-summary` endpoint
- [ ] Simple dashboard page in POS terminal

### 9. Frontend – POS Terminal UX (Café First)

- [x] Main flows: Select order type, choose table, add items, save draft, send to kitchen, record payment, complete order.
- [x] Navigation tabs/pages: Product grid, Active orders list, Orders page, Kitchen screen (optional).
- [x] TanStack Query hooks with tenant & module flags.

### 9.3 NEW: Order Queue UI in POS Page

> **User Requirement:** Horizontal card-based view of active orders IN POS page (not separate page).
> Reference: `docs/aura-pos-tasklist-en.md` Section 9.3

- [ ] Create `OrderQueue.tsx` component:
  - [ ] Horizontal scrollable card layout
  - [ ] Each card: Customer name, order number, table number, elapsed time, status badge (Draft/Waiting/Preparing/Ready/Done/Cancelled)
  - [ ] Quick action buttons: "Start Prep", "Ready", "Complete", "Cancel"
  - [ ] Use `useListOpenOrders()` hook with 30-second auto-refresh
  - [ ] Module gating: Only show if orders feature enabled

- [ ] Integration in `apps/pos-terminal-web/src/pages/pos.tsx`:
  - [ ] Add OrderQueue above ProductArea (line 344)
  - [ ] Collapsible panel (hide/show button)
  - [ ] Default visible on desktop (≥1280px), hidden on mobile/tablet
  - [ ] Toggle state persisted in localStorage

- [ ] Status update via mutations:
  - [ ] Quick action buttons call `updateOrderStatus()` mutation
  - [ ] Confirmation dialog for destructive actions
  - [ ] Optimistic UI updates
  - [ ] Loading state: skeleton cards while fetching

### 10. Documentation & Developer Experience

- [ ] Update `/docs`:
  - [ ] High-level architecture diagram per domain
  - [ ] Domain descriptions and boundaries
  - [ ] How business type affects modules
- [ ] Maintain `features_checklist.md` synchronized with this tasklist
- [ ] Document how to run seeding and sample flows for café tenant

---

## 12. URGENT: POS Page Critical Fixes & Cart Flow Improvements (MUST DO FIRST)

> **CRITICAL ISSUES** identified in comprehensive code analysis (Nov 2025)
> These are **critical bugs and workflow blockers** in existing POS implementation, NOT new features.
> **Must fix before production deployment**
> Reference: `docs/aura-pos-tasklist-en.md` Section 11 for full details

### 12.1 [P0-BLOCKER] Fix POS Page Scroll Regression

> **Blocks tablet/desktop usage entirely. DO THIS IMMEDIATELY.**

**Problem:** Product area cannot scroll on any breakpoint; cart panel action buttons invisible on tablet/desktop.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/pages/pos.tsx` line 344: Parent `div.flex-1` has `overflow-hidden`, blocking child `overflow-y-auto`
- `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` line 143: Product grid `overflow-y-auto` prevented by parent constraint
- `apps/pos-terminal-web/src/components/pos/CartPanel.tsx` line 177: Hardcoded `maxHeight: calc(100vh - 450px)` too large for tablet, hiding action buttons

**Implementation:**
- [ ] Fix POS page layout overflow control (pos.tsx line 344)
  - [ ] Change root container from `overflow-hidden` to enable child scroll
  - [ ] Use `flex-1 min-h-0` on container children
- [ ] Fix ProductArea scroll (ProductArea.tsx line 143)
  - [ ] Ensure product grid wrapper has `min-h-0 flex-1 overflow-y-auto`
  - [ ] Verify sticky headers (order type tabs, category tabs) remain fixed during scroll
- [ ] Fix CartPanel scroll (CartPanel.tsx line 177)
  - [ ] Replace hardcoded `maxHeight: calc(100vh - 450px)` with responsive approach
  - [ ] Use `flex-1 min-h-0 overflow-y-auto` for cart items area
  - [ ] Use CSS variables for adaptive height: `--cart-header-height`, `--cart-footer-height`
  - [ ] Ensure action buttons (Charge, Partial Payment, Kitchen Ticket) always visible at bottom
- [ ] Test across all breakpoints:
  - [ ] Mobile (375px - cart in drawer, not affected)
  - [ ] Tablet (768-1024px - verify cart panel actions visible)
  - [ ] Desktop (1280px+ - verify both product area and cart panel scroll independently)

### 12.2 [P1-FOUNDATION] Cart State Refactoring

> **Fixes:** POS UI implementation issues where cart metadata ignored during checkout
> **Required by:** P2, P3 (Quick Charge, Transaction Safety)
> **Do this AFTER P0 but BEFORE P2, P3**

**Root Cause:** `selectedOrderTypeId` state duplicated between POSPage and cart; cart metadata (`tableNumber`, `paymentMethod`) exists but ignored; payment method hardcoded to "cash".

**Files affected:**
- `apps/pos-terminal-web/src/hooks/useCart.ts` lines 141-143
- `apps/pos-terminal-web/src/pages/pos.tsx` lines 27, 174, 185
- `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` lines 351-354

**Implementation:**
- [ ] Move `selectedOrderTypeId` to cart state (useCart.ts) for single source of truth
- [ ] Remove duplicate `selectedOrderTypeId` from POSPage component state
- [ ] Pre-fill OrderTypeSelectionDialog with cart metadata (orderTypeId, tableNumber)
- [ ] Use `cart.paymentMethod` instead of hardcoded "cash" in payment recording (pos.tsx line 185)

### 12.3 [P2-UX] Quick Charge Path

> **Enhances:** POS UI payment flow to support express checkout
> **Depends on:** P1 completion
> **Do this AFTER P1**

**Root Cause:** Every order forced through OrderTypeSelectionDialog even when all metadata already set in cart. Unnecessary friction for counter service / quick cash sales.

**Implementation:**
- [ ] Add conditional logic in `handleCharge()` (pos.tsx line 148):
  - [ ] Check if `cart.selectedOrderTypeId` set
  - [ ] Fetch selected order type metadata
  - [ ] Check if order type requires table (needTableNumber flag)
  - [ ] If table required, check if `cart.tableNumber` is set
  - [ ] If all required metadata present → call `handleQuickCharge()` directly (bypass dialog)
  - [ ] If metadata missing → open dialog as fallback
- [ ] Implement handleQuickCharge function:
  - [ ] Create order with all cart metadata already set
  - [ ] Record payment with `cart.paymentMethod`
  - [ ] Show success toast with order number
  - [ ] Clear cart on success
  - [ ] Handle errors gracefully (keep cart, show error toast)
- [ ] Add keyboard shortcut (Ctrl+Enter or F9) for quick charge
- [ ] Support Cafe A counter service use case (1-click charge)

### 12.4 [P3-CRITICAL] Transaction Safety - Atomic Order + Payment

> **Prevents data corruption**
> **Depends on:** P1 completion
> **Do this AFTER P1**

**Root Cause:** Order creation and payment recording are separate API calls. If payment fails after order created, orphaned order exists and cart cleared. No rollback mechanism.

**Files affected:** `apps/pos-terminal-web/src/pages/pos.tsx` lines 177-207

**Implementation Option A (Recommended):**
- [ ] Backend: Create `/api/orders/create-and-pay` endpoint with DB transaction (apps/api/src/http/routes/orders.ts)
  - [ ] Accepts order payload + payment details in single request
  - [ ] Wraps `CreateOrder` + `RecordPayment` in DB transaction
  - [ ] On failure: automatic rollback (no orphan order)
- [ ] Frontend: Replace two mutations with single `createAndPayMutation`
  - [ ] Clear cart ONLY after successful response
  - [ ] On error: keep cart intact, show error toast, allow retry

**Implementation Option B (Fallback):**
- [ ] Frontend compensating transaction:
  - [ ] Create order → get orderId
  - [ ] Try record payment
  - [ ] If payment fails → call `/api/orders/:id/cancel` to cancel the order
  - [ ] Keep cart intact for retry

---

## 13. Order Lifecycle & Terminology Standardization

> **Clarifies:** Ordering Domain terminology confusion
> **Reference:** `docs/aura-pos-tasklist-en.md` Section 12
> **Can be done anytime**

**Problem:** Users confused about "open order" vs "draft order" vs "active order". No clear state machine documented.

**Proposed Terminology (standardize across codebase and UI):**
1. **Draft Order**: In cart, not yet submitted/printed. `status='draft'`, `payment_status='unpaid'`. Temporary, can be deleted freely.
2. **Open Order (Active Tab)**: Confirmed but not fully paid. `status='confirmed'`, `payment_status='unpaid'|'partial'`.
3. **In-Progress Order**: Being prepared in kitchen. `status='preparing'|'ready'`. Any payment_status allowed.
4. **Completed Order**: Fully paid and closed. `status='completed'`, `payment_status='paid'`. Lifecycle finished.

**State Machine:**
```
Cart → [Submit] → Draft (status=draft, payment=unpaid)
Draft → [Confirm/Print] → Open Tab (status=confirmed, payment=unpaid)
Open Tab → [Send to Kitchen] → Preparing (payment still unpaid/partial)
Preparing → [Chef marks ready] → Ready (payment still unpaid/partial)
Ready → [Record Payment] → Updates payment_status:
  - If amount < total → payment=partial (tab remains open)
  - If amount = total → payment=paid → eligible for [Complete]
[Only if payment=paid] → [Complete] → status=completed (lifecycle finished)
```

**Implementation:**
- [ ] Document state machine in `docs/order-lifecycle.md` with Mermaid diagram
- [ ] Create order status helper utils (`packages/core/utils/orderStatus.ts`):
  - [ ] `isDraft()`, `isOpenTab()`, `isInProgress()`, `isCompleted()`, `isCancelled()`
  - [ ] `canSendToKitchen()`, `canRecordPayment()`, `canComplete()`, `allowsPartialPayment()`
- [ ] Update UI labels for clarity:
  - [ ] Rename "Open Orders" tab → "Active Orders" or "In Progress"
  - [ ] Add "Open Tabs (Unpaid)" filter for dine-in
- [ ] Update `ListOpenOrders` documentation to clarify scope: `['draft', 'confirmed', 'preparing', 'ready']`

---

## 14. Sidebar Navigation Cleanup

> **Removes:** Disabled/confusing menu items pending feature spec
> **Reference:** `docs/aura-pos-tasklist-en.md` Section 13
> **Can be done anytime**

**Problem:** "Bills" menu item disabled with "Coming Soon" tooltip. No clear specification. Causes operator confusion.

**Recommendation:**
- **Immediate:** Remove disabled "Bills" menu from sidebar (reduces UI clutter)
- **Future:** Define Bills feature requirements based on actual business needs

**Implementation:**
- [ ] Remove disabled Bills menu item from `apps/pos-terminal-web/src/components/pos/Sidebar.tsx` line 22
- [ ] Document Bills feature ideas in backlog (`docs/backlog/bills-feature-spec.md`)
- [ ] Gather user feedback: Do operators need "Print Bill" before payment? Or "Unpaid Orders" list?

---

## Critical Fixes Implementation Priority

**EXECUTE IN THIS ORDER:**

### Phase 1 – IMMEDIATE (Week 1, BLOCKING USAGE)
1. **Section 12.1 - POS Scroll Fix [P0]** → Blocks all tablet/desktop usage
   - Estimated effort: 1-2 hours
   - Dependencies: None
   - **DO THIS FIRST**

2. **Section 12.2 - Cart State Refactoring [P1]** → Foundation for P2, P3
   - Estimated effort: 2-3 hours
   - Dependencies: P0 complete (for testing)
   - **DO THIS SECOND**

3. **Section 13 - Order Lifecycle Documentation** → Clarifies business logic
   - Estimated effort: 1 hour
   - Dependencies: None, can be done parallel with P0/P1
   - **OPTIONAL IN PARALLEL**

### Phase 2 – SHORT-TERM (Week 2-3)
4. **Section 12.3 - Quick Charge Path [P2]** → Improves counter service UX
   - Estimated effort: 2 hours
   - Dependencies: P1 complete
   - **DO THIS AFTER P1**

5. **Section 12.4 - Transaction Safety [P3]** → Prevents data corruption
   - Estimated effort: 3-4 hours
   - Dependencies: P1 complete
   - **DO THIS AFTER P1**

6. **Section 14 - Sidebar Cleanup** → Low-hanging fruit
   - Estimated effort: 30 minutes
   - Dependencies: None
   - **DO ANYTIME**

### Phase 3 – MEDIUM-TERM (Week 4+)
7. **Section 4 - Table Master Data** → Replace hardcoding
   - Estimated effort: 4-5 hours
   - Dependencies: P1, P2, P3 complete
   - **DO AFTER CRITICAL FIXES**

8. **Section 9.3 - Order Queue UI** → In-page active orders
   - Estimated effort: 3-4 hours
   - Dependencies: P1 complete
   - **DO AFTER CRITICAL FIXES**

---

## Dependency Graph

```
P0 (Scroll Fix)
  ↓ (enables testing)
P1 (Cart Refactoring) ← FOUNDATION
  ├─→ P2 (Quick Charge)
  ├─→ P3 (Transaction Safety)
  └─→ P4 (Order Queue UI)

Section 13 (Lifecycle Docs) - INDEPENDENT
Section 14 (Sidebar Cleanup) - INDEPENDENT

Section 4 (Table Master Data) - INDEPENDENT but uses P0/P1 fixes
```

---

## Testing Checklist

After implementing each priority:

**P0 - Scroll Fix:**
- [ ] Product area scrolls smoothly on all breakpoints
- [ ] Cart panel action buttons visible on tablet (768-1024px)
- [ ] No layout shift on desktop (1280px+)
- [ ] Sticky headers remain fixed during scroll

**P1 - Cart Refactoring:**
- [ ] Order type selection persists across component renders
- [ ] Cart metadata flows to backend payload correctly
- [ ] PaymentMethod from cart used instead of hardcoded "cash"
- [ ] TableNumber pre-fills in dialog from cart

**P2 - Quick Charge:**
- [ ] Bypass dialog when orderTypeId + table (if needed) set
- [ ] Quick charge button/shortcut works
- [ ] Error handling keeps cart intact
- [ ] Counter service workflow smooth (1-click charge)

**P3 - Transaction Safety:**
- [ ] Payment failure does not create orphan order
- [ ] Cart retained on error for retry
- [ ] DB transaction rollback verified
- [ ] No data corruption on network errors

**Section 4 - Table Master Data:**
- [ ] Tables list dynamic per tenant
- [ ] Table status (available/occupied) accurate
- [ ] Availability filtering works
- [ ] Cannot select occupied table

**Section 9.3 - Order Queue:**
- [ ] Cards display correct order data
- [ ] Status badges color-coded correctly
- [ ] Auto-refresh works (30s interval)
- [ ] Quick actions update order status
- [ ] Scrollable horizontally on overflow
- [ ] Collapsible panel state persists

**Section 13 - Lifecycle Documentation:**
- [ ] State machine documented with Mermaid diagram
- [ ] Helper utils exported and importable
- [ ] UI labels updated for clarity
- [ ] `ListOpenOrders` documentation matches new terminology

**Section 14 - Sidebar Cleanup:**
- [ ] Bills menu item removed
- [ ] No disabled menu items left
- [ ] UI cleaner without confusion
