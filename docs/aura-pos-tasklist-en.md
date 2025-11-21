## AURA POS SYSTEM – Comprehensive Tasklist (Prioritized with Analysis)

> **Last Updated:** Nov 21, 2025  
> **Status:** Merged Sections 1-11 (implemented/in-progress), Added Sections 12-14 (urgent fixes & future work)  
> **No Duplications:** Section 12 = urgent bugfixes, Sections 4/10 = features, all cross-referenced

---

## 1. Architecture & Project Setup

- [x] Monorepo setup with Turborepo.
- [x] Core packages: `@pos/domain`, `@pos/application`, `@pos/infrastructure`.
- [x] Database setup (PostgreSQL via Neon) with Drizzle ORM.
- [x] API server (Express + TypeScript).
- [x] Frontend (React + Vite + TailwindCSS).

---

## 2. Multi-Tenancy & Business Type Foundation

- [x] Tenant database schema: `tenants`, `business_types`, `tenant_module_configs`.
- [x] Seeded: Cafe A (café business type), Retail B (retail), etc.
- [x] Module flags (`orders`, `kitchen`, `loyalty`, `invoicing`) per tenant.
- [x] Tenant context passed via header or JWT (depending on deployment).
- [x] All repos & use cases validate tenant activation.

---

## 3. Ordering Domain (Generic, No Hard Table Dependency)

> Core rule: Orders are generic. Tables, kitchen, DP, loyalty, etc. are **separate modules** that reference orders.

### 3.1 Domain model

- [x] Order entity with:
  - [x] `order_type_id` / `order_type_code` (DINE_IN, TAKE_AWAY, DELIVERY, WALK_IN).
  - [x] `status: 'draft' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'`.
  - [x] `payment_status: 'unpaid' | 'partial' | 'paid'`.
  - [x] `table_number?: string` (plain text, no FK to tables).
  - [x] Generic `metadata?: Record<string, any>` for business-specific fields.
- [x] Keep `KitchenTicket` as separate entity referencing `order_id`.
- [x] Keep `OrderPayment` separate (no external gateway coupling).
- [x] **OrderStateValidator** - Centralized state transition validator with comprehensive allowed transitions map.

### 3.2 Draft vs immediate payment flows

- [x] Create orders with `status = 'draft'` by default.
- [x] Allow both: Draft with table (DINE_IN) and Draft takeaway (TAKE_AWAY).
- [x] `payment_status` initially `unpaid`.
- [x] Add `ConfirmOrder` use case (status: draft → confirmed).
- [x] Add `CompleteOrder` / `CancelOrder` use cases with validation.

### 3.3 Order querying & listing

- [x] Add `ListOpenOrders` use case:
  - [x] Returns orders with status in `['draft', 'confirmed', 'preparing', 'ready']`.
  - [x] Supports pagination (limit, offset).
  - [x] Filter by order type, table_number.
- [x] Add `ListOrderHistory` use case:
  - [x] Paged list for completed/cancelled orders for reporting.
  - [x] Supports date range filtering (from_date, to_date).

### 3.4 API endpoints

- [x] `/api/orders` - POST (create), GET (list with filters).
- [x] `/api/orders/open` - list open orders.
- [x] `/api/orders/history` - list order history with pagination.
- [x] `/api/orders/:id/confirm` - confirm order.
- [x] `/api/orders/:id/complete` - complete order.
- [x] `/api/orders/:id/cancel` - cancel order.
- [x] All endpoints wired in controllers and routes.

### 3.5 POS UI

- [x] "Order list" view in POS terminal (apps/pos-terminal-web/src/pages/orders.tsx):
  - [x] Tab filters: Dine-In, Takeaway, Payment, Active, Completed.
- [x] Order creation dialog (apps/pos-terminal-web/src/components/pos/OrderTypeSelectionDialog.tsx):
  - [x] Choose order_type (Dine In / Take Away / Delivery).
  - [x] Select table (dynamic, see Section 4.5).
  - [x] Option to mark as paid or leave as draft.
- **TODO (Section 12.2 - P1):** Integrate needTableNumber validation (see Section 13 for order type metadata).

---

## 4. Table & Seating Management Domain (Café/Restaurant Only)

> **CRITICAL BUG (Section 12):** Tables hardcoded 1-5 in OrderTypeSelectionDialog & 1-10 in CartPanel. This section implements fix.

### 4.1 Critical: Replace Hardcoded Tables with Dynamic Master Data

> **Current Problem:** OrderTypeSelectionDialog.tsx lines 267-282 and CartPanel.tsx lines 148-158 hardcode tables.  
> **Fix:** Implement dynamic tables table with per-tenant customization & availability checking.

### 4.2 Database schema

**Add to `shared/schema.ts`:**

```typescript
export const tables = sqliteTable('tables', {
  id: varchar('id').primaryKey().$default(() => randomUUID()),
  tenant_id: varchar('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  table_number: varchar('table_number').notNull(), // "1", "A1", "VIP-1"
  table_name: text('table_name'), // "Window Seat", "Terrace"
  floor: varchar('floor'), // "Ground Floor", "2nd Floor"
  capacity: integer('capacity'), // max persons
  status: varchar('status', { enum: ['available', 'occupied', 'reserved', 'maintenance'] }).notNull().default('available'),
  current_order_id: varchar('current_order_id'), // soft reference (no FK)
  created_at: integer('created_at', { mode: 'timestamp_ms' }).$default(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' }).$onUpdateNow(),
}, (table) => ({
  tenant_idx: index('tables_tenant_idx').on(table.tenant_id),
  status_idx: index('tables_status_idx').on(table.status),
  unique_table_per_tenant: unique().on(table.tenant_id, table.table_number),
}));
```

- [ ] Run migration: `npm run db:push --force`

### 4.3 Application layer

**Repository:** `packages/infrastructure/repositories/seating/TableRepository.ts`
- [ ] `findByTenant(tenantId, filters?: { status?, floor? })` → Table[]
- [ ] `findById(id)` → Table | null
- [ ] `create(data)` → Table
- [ ] `updateStatus(id, status, orderId?)` → Table
- [ ] `bulkCreate(tables)` → Table[]

**Use Cases:**
- [ ] `packages/application/seating/ListTables.ts` - List, filter, validate tenant.
- [ ] `packages/application/seating/CreateTable.ts` - Admin only, unique validation.
- [ ] `packages/application/seating/UpdateTableStatus.ts` - Status transitions.

### 4.4 API endpoints

- [ ] `GET /api/tables?status=available&floor=Ground%20Floor`
  - [ ] Returns: `{ tables: Table[], total: number }`
- [ ] `POST /api/tables` - Create (admin only)
  - [ ] Body: `{ table_number, table_name?, floor?, capacity? }`
- [ ] `PATCH /api/tables/:id/status`
  - [ ] Body: `{ status, current_order_id? }`

### 4.5 Frontend integration (Fixes to Section 3.5)

- [ ] Add `useTables()` hook in `apps/pos-terminal-web/src/lib/api/hooks.ts`
- [ ] Update `OrderTypeSelectionDialog.tsx` (line 267):
  - [ ] Replace hardcoded tables with dynamic map from useTables()
  - [ ] Filter: `tables.filter(t => t.status === 'available')`
- [ ] Update `CartPanel.tsx` (line 148):
  - [ ] Replace hardcoded 1-10 with dynamic list
  - [ ] Show status badges, gray out occupied
- [ ] Hook into order lifecycle:
  - [ ] When order → completed: reset table to 'available'
  - [ ] When order → confirmed: set table to 'occupied' with order_id

### 4.6 Seeder data

- [ ] Create 10-15 sample tables: `packages/infrastructure/seeders/tables.seeder.ts`
  - [ ] Mix: "1", "2", "A1", "B1", "VIP-1" table_numbers
  - [ ] Mix: "Ground Floor", "2nd Floor" floors
  - [ ] Capacity: 2, 4, 6, 8
  - [ ] Status: all 'available'
- [ ] Register in main seeder: `packages/infrastructure/seeders/index.ts`

### 4.7 Future Phase 2 (Post-MVP)

- [ ] `TableSession` entity for occupancy tracking & analytics.
- [ ] Table "floor plan" visual grid page.
- [ ] Table merge/split for large parties.

---

## 5. Kitchen & Fulfillment Domain

### 5.1 Domain & use cases

- [ ] Ensure `CreateKitchenTicket` use case is wired:
  - [ ] Triggered when order confirmed or explicitly sent to kitchen.
- [ ] Add `UpdateKitchenTicketStatus` use case:
  - [ ] `pending` → `preparing` → `ready` → `delivered`.

### 5.2 Database & repositories

- [ ] Ensure `kitchen_tickets` table used via repository.
- [ ] No hard dependency from orders; only `kitchen_tickets.order_id`.

### 5.3 POS / kitchen UI

- [ ] Basic "kitchen screen" (simple web page):
  - [ ] List of tickets with items, table number, notes.
  - [ ] Buttons to update status.

---

## 6. Payment Domain (Internal First, Gateway Later)

> For now: internal `order_payments` + simple buttons.  
> Later: integrate Midtrans or others.

### 6.1 Domain model

- [ ] OrderPayment entity has: `order_id`, `amount`, `payment_method`, `payment_status`, `transaction_ref`, `notes`, `paid_at`.

### 6.2 Internal payment flows

- [ ] `RecordPayment` use case:
  - [ ] Supports partial payments.
  - [ ] Updates `order.payment_status` (`unpaid` / `partial` / `paid`) and `paid_amount`.
- [ ] `VoidPayment` / `RefundPayment` use case (internal):
  - [ ] For now just record a negative payment, no gateway.

### 6.3 API endpoints

- [ ] `/api/orders/:id/payments`:
  - [ ] `POST` – record payment.
  - [ ] Optionally `DELETE` or `POST /void` for refunds.
- **TODO (Section 12.4 - P3):** Implement atomic `/api/orders/create-and-pay` endpoint.

### 6.4 POS UI

- [ ] "Payment dialog":
  - [ ] Input amount, choose method (cash, card, ewallet, other).
  - [ ] Show remaining balance and new status.
- [ ] Quick buttons:
  - [ ] "Mark as fully paid".
  - [ ] "Mark DP (partial payment)".
- **TODO (Section 12.3 - P2):** Add "Quick Charge" bypass when all metadata set.

### 6.5 Phase 2 – External gateway (later)

- [ ] Design abstraction in `@pos/application/payments`:
  - [ ] Payment provider interface for Midtrans / others.

---

## 7. Loyalty & Customer Profiles (Optional Module)

### 7.1 Domain model

- [ ] `Customer` (email, phone, name, loyalty_points_balance).
- [ ] `LoyaltyTransaction` (customer, order, points_accrued, points_redeemed, timestamp).

### 7.2 Use cases & API

- [ ] `AccruePointsOnOrderCompleted`:
  - [ ] Calculate points based on order total (e.g., 1 point per Rp 1000).
  - [ ] Triggered when order.status → completed & payment_status → paid.
- [ ] `RedeemPointsForOrder`:
  - [ ] Deduct points, apply discount to order total.

### 7.3 Tenant configuration

- [ ] Add `LOYALTY` module flag in `tenant_module_configs`.
- [ ] Only enable for tenants that need it.

---

## 8. Reporting Domain (Basic First)

### 8.1 Domain & use cases

- [ ] `GetSalesSummary`:
  - [ ] By date range, order type, business type.
- [ ] `GetBestSellingProducts`.

### 8.2 API & UI

- [ ] `/api/reports/sales-summary`.
- [ ] Simple dashboard page in POS terminal or separate admin UI.

---

## 9. Frontend – POS Terminal UX (Café First)

### 9.1 Main flows to support

- [ ] Select order type (Dine In / Take Away / Delivery).
- [ ] For Dine In:
  - [ ] Choose table from dynamic list (see Section 4.5).
  - [ ] Input table number text (if table management disabled).
- [ ] Add items with variants & modifiers.
- [ ] Save as draft.
- [ ] Send to kitchen (creates kitchen ticket).
- [ ] Open draft, add items, record payment, mark completed.

### 9.2 Navigation & state

- [ ] Implement clear navigation tabs/pages:
  - [ ] Product grid (POS page).
  - [ ] **Active orders queue** (see Section 10.2 below).
  - [ ] Tables view (café only).
  - [ ] Kitchen screen (optional).
  - [ ] Orders list page (all statuses with filters).
- [ ] Ensure TanStack Query hooks use tenant & module flags from context.

### 9.3 Order Queue UI in POS Page (NEW)

> **User Requirement:** Horizontal card-based view of active orders in POS page (not separate page).

**Component:** `apps/pos-terminal-web/src/components/pos/OrderQueue.tsx`
- [ ] Horizontal scrollable card layout
- [ ] Each card shows:
  - [ ] Customer name (or "Walk-in")
  - [ ] Order number
  - [ ] Table number (if dine-in)
  - [ ] Elapsed time (since created_at)
  - [ ] Status badge with color coding:
    - [ ] Draft → Gray "Draft"
    - [ ] Confirmed/Waiting → Orange "Waiting"
    - [ ] Preparing → Yellow "Preparing"
    - [ ] Ready → Green "Ready"
    - [ ] Completed → Blue "Done"
    - [ ] Cancelled → Red "Cancelled"
  - [ ] Quick action buttons: "Start Prep", "Ready", "Complete", "Cancel"
- [ ] Data fetching: Use existing `useListOpenOrders()` hook
  - [ ] Filter: status in `['draft', 'confirmed', 'preparing', 'ready']`
  - [ ] Auto-refresh every 30 seconds
- [ ] Integration in POS page:
  - [ ] Add OrderQueue above ProductArea
  - [ ] Collapsible panel (hide/show button)
  - [ ] Default visible on desktop (≥1280px), hidden on mobile/tablet
  - [ ] Toggle state persisted in localStorage
- [ ] Module gating: Only show if tenant has orders feature enabled
- [ ] Status update via mutations:
  - [ ] Quick action buttons call `updateOrderStatus()` mutation
  - [ ] Confirmation dialog for destructive actions (cancel, complete)
  - [ ] Optimistic UI updates
- [ ] Loading state: Show skeleton cards while fetching

**Integration Points:**
- [ ] Modify `apps/pos-terminal-web/src/pages/pos.tsx` line 344: Add OrderQueue component above ProductArea
- [ ] Ensure product area still scrolls independently (see Section 12.1)

---

## 10. Documentation & Developer Experience

- [ ] Update `/docs`:
  - [ ] High-level architecture diagram per domain.
  - [ ] Domain descriptions and boundaries.
  - [ ] How business type affects modules.
- [ ] Maintain a `features_checklist.md` synchronized with this tasklist.
- [ ] Document how to run seeding and sample flows for café tenant.

---

## 11. URGENT: POS Page Critical Fixes & Cart Flow Improvements

> **CRITICAL ISSUES** identified in comprehensive code analysis (Nov 2025)  
> These are **critical bugs and workflow blockers** in existing POS implementation, NOT new features.  
> **Must fix before production deployment**

### 11.1 [P0-BLOCKER] Fix POS Page Scroll Regression

> **Blocks tablet/desktop usage entirely**

**Problem:** Product area cannot scroll on any breakpoint; cart panel action buttons invisible on tablet/desktop.

**Root Cause Analysis:**
- `apps/pos-terminal-web/src/pages/pos.tsx` line 344: Parent `div.flex-1` has `overflow-hidden`, blocking child `overflow-y-auto`
- `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` line 143: Product grid `overflow-y-auto` prevented by parent constraint
- `apps/pos-terminal-web/src/components/pos/CartPanel.tsx` line 177: Hardcoded `maxHeight: calc(100vh - 450px)` too large for tablet, hiding action buttons

**Implementation:**
- [x] Fix POS page layout overflow control (apps/pos-terminal-web/src/pages/pos.tsx line 347)
  - [x] Removed `overflow-hidden` from parent container, moved to CartPanel container (line 361)
  - [x] Parent now uses `flex flex-1 min-h-0` to enable children scroll independently
- [x] Fix ProductArea scroll (apps/pos-terminal-web/src/components/pos/ProductArea.tsx line 143)
  - [x] Product grid already has `min-h-0 flex-1 overflow-y-auto` - no change needed
  - [x] Sticky headers (order type tabs, category tabs) remain fixed at z-20 and z-10
- [x] Fix CartPanel scroll (apps/pos-terminal-web/src/components/pos/CartPanel.tsx line 177)
  - [x] Removed hardcoded `maxHeight: calc(100vh - 450px)` inline style
  - [x] Changed to `flex-1 overflow-y-auto min-h-0` for proper flex-based responsiveness
  - [x] Cart items area now scales responsively based on header/footer height
  - [x] Action buttons (Charge, Partial Payment, Kitchen Ticket) always visible at bottom as flex-shrink-0 footer
- [x] Test across all breakpoints:
  - [x] Mobile (375px - cart in drawer via MobileCartDrawer, not affected by scroll fix)
  - [x] Tablet (768-1024px - cart panel actions now visible with responsive flex layout)
  - [x] Desktop (1280px+ - both product area and cart panel scroll independently)

### 11.2 [P1-FOUNDATION] Cart State Refactoring

> **Fixes:** Section 3.5 POS UI implementation issues where cart metadata ignored during checkout  
> **Required by:** P2, P3
> **Status:** COMPLETED

**Root Cause:** `selectedOrderTypeId` state duplicated between POSPage and cart; cart metadata (`tableNumber`, `paymentMethod`) exists but ignored; payment method hardcoded to "cash".

**Files affected:**
- `apps/pos-terminal-web/src/hooks/useCart.ts` lines 141-143, 147, 250, 331-332
- `apps/pos-terminal-web/src/pages/pos.tsx` lines 27, 48-51, 74-91, 102, 187, 202, 355-356
- `apps/pos-terminal-web/src/components/pos/ProductArea.tsx` lines 355-356

**Implementation: COMPLETED**
- [x] Moved `selectedOrderTypeId` to cart state (useCart.ts line 147) for single source of truth
- [x] Removed duplicate `selectedOrderTypeId` from POSPage component state (was line 27)
- [x] Updated all references to use `cart.selectedOrderTypeId` and `cart.setSelectedOrderTypeId`
- [x] Changed payment method recording to use `cart.paymentMethod` instead of hardcoded "cash" (pos.tsx line 187)
- [x] Updated clearCart() to reset selectedOrderTypeId (useCart.ts line 250)
- [x] Fixed PaymentMethod type to match backend API ("cash" | "card" | "ewallet" | "other")
- [x] Updated ProductArea props to use cart.selectedOrderTypeId (pos.tsx lines 355-356)

### 11.3 [P2-UX] Quick Charge Path

> **Enhances:** Section 6.4 POS UI payment flow  
> **Depends on:** P1 completion

**Root Cause:** Every order forced through OrderTypeSelectionDialog even when all metadata already set in cart. Unnecessary friction for counter service / quick cash sales.

**Implementation:**
- [ ] Add conditional logic in `handleCharge()` (pos.tsx line 148):
  - [ ] Check if `cart.selectedOrderTypeId` set
  - [ ] Fetch selected order type metadata from `activeOrderTypes` array
  - [ ] Check if order type requires table (needTableNumber flag)
  - [ ] If table required, check if `cart.tableNumber` is set
  - [ ] If all required metadata present → call `handleQuickCharge()` directly (bypass dialog)
  - [ ] If metadata missing → open dialog as fallback
- [ ] Implement handleQuickCharge function:
  - [ ] Create order with all cart metadata already set
  - [ ] Record payment with `cart.paymentMethod` (not hardcoded)
  - [ ] Show success toast with order number and amount
  - [ ] Clear cart on success
  - [ ] Handle errors gracefully (keep cart, show error toast)
- [ ] Add keyboard shortcut (Ctrl+Enter or F9) for quick charge
- [ ] Support Cafe A counter service use case (1-click charge from pre-selected order type)

### 11.4 [P3-CRITICAL] Transaction Safety - Atomic Order + Payment

> **Prevents data corruption**  
> **Depends on:** P1 completion

**Root Cause:** Order creation (`createOrderMutation`) and payment recording (`recordPaymentMutation`) are separate API calls. If payment fails after order created, orphaned order exists and cart already cleared. No rollback mechanism.

**Files affected:** `apps/pos-terminal-web/src/pages/pos.tsx` lines 177-207

**Implementation Option A (Recommended):**
- [ ] Backend: Create `/api/orders/create-and-pay` endpoint with DB transaction (apps/api/src/http/routes/orders.ts)
  - [ ] Accepts order payload + payment details in single request
  - [ ] Wraps `CreateOrder` + `RecordPayment` in DB transaction
  - [ ] On failure: automatic rollback (no orphan order)
- [ ] Frontend: Replace two mutations with single `createAndPayMutation`
  - [ ] Clear cart ONLY after successful response
  - [ ] On error: keep cart intact, show error toast, allow retry

**Implementation Option B (Fallback if DB transaction not supported):**
- [ ] Frontend compensating transaction:
  - [ ] Create order → get orderId
  - [ ] Try record payment
  - [ ] If payment fails → call `/api/orders/:id/cancel` to cancel the order
  - [ ] Keep cart intact for retry

---

## 12. Order Lifecycle & Terminology Standardization

> **Clarifies:** Section 3 Ordering Domain terminology confusion

**Problem:** Users confused about "open order" vs "draft order" vs "active order". No clear state machine documented.

**Proposed Terminology (standardize across codebase and UI):**
1. **Draft Order**: In cart, not yet submitted/printed. `status='draft'`, `payment_status='unpaid'`. Temporary, can be deleted freely.
2. **Open Order (Active Tab)**: Confirmed but not fully paid. `status='confirmed'`, `payment_status='unpaid'|'partial'`. Customer may still be dining or order awaiting settlement.
3. **In-Progress Order**: Being prepared in kitchen. `status='preparing'|'ready'`. Any payment_status allowed.
4. **Completed Order**: Fully paid and closed. `status='completed'`, `payment_status='paid'`. Lifecycle finished.

**State Machine (Cafe/Restaurant Dine-In):**
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

**Critical Notes:**
- Open orders (`status=confirmed|preparing|ready`) can have `payment_status=unpaid|partial` for extended periods
- Partial payments allowed at ANY stage (before kitchen, during cooking, after ready)
- Transition to `status=completed` ONLY when `payment_status=paid` (enforcement in CompleteOrder use case)

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

## 13. Sidebar Navigation Cleanup

> **Removes:** Disabled/confusing menu items pending feature spec

**Problem:** "Bills" menu item disabled with "Coming Soon" tooltip. No clear specification what this should do. Causes operator confusion.

**Possible Interpretations (to be scoped later):**
1. Print Bill / Check before payment (restaurant workflow)
2. Pending Invoices list (unpaid orders for follow-up)
3. Split Bill feature (multiple payments for single order)
4. Bill History archive (completed bills for audit)

**Recommendation:**
- **Immediate:** Remove disabled "Bills" menu from sidebar (reduces UI clutter and confusion)
- **Future:** Define Bills feature requirements based on actual business needs before re-adding

**Implementation:**
- [ ] Remove disabled Bills menu item from `apps/pos-terminal-web/src/components/pos/Sidebar.tsx` line 22
- [ ] Document Bills feature ideas in backlog (`docs/backlog/bills-feature-spec.md`)
- [ ] Gather user feedback: Do operators need "Print Bill" before payment? Or "Unpaid Orders" list?

---

## Critical Fixes Implementation Priority

**IMMEDIATE (Week 1 - URGENT, Blocking Usage):**
1. **Section 11.1** - POS Scroll Fix [P0-BLOCKER] → Blocks all tablet/desktop usage
2. **Section 11.2** - Cart State Refactoring [P1] → Foundation for P2, P3
3. **Section 12** - Order Lifecycle Documentation → Clarifies business logic

**SHORT-TERM (Week 2-3):**
4. **Section 11.3** - Quick Charge Path [P2] → Depends on P1, improves counter service UX
5. **Section 11.4** - Transaction Safety [P3] → Depends on P1, prevents data corruption
6. **Section 13** - Sidebar Cleanup → Low-hanging fruit, reduces confusion

**MEDIUM-TERM (Week 4+):**
7. **Section 4** - Table Master Data → Dynamic tables with availability (remove hardcoding)
8. **Section 9.3** - Order Queue UI → In-page active orders view (from user screenshots)
9. **Order Type Validation** → needTableNumber enforcement (combine with P1)

**Dependencies:**
- P2, P3 MUST wait for P1 completion (cart state refactoring)
- P0 independent, do immediately (blocking usage)
- Documentation tasks (12, 13) can be done anytime
