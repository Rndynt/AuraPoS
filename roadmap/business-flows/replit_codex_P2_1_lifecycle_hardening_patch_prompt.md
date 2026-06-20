# Replit/Codex Prompt P2.1 — Lifecycle Hardening Patch: Server DTO, Active Order UX, Retail Close, Smoke Tests

Repository: `Rndynt/AuraPoS`

## Goal

Finish the remaining lifecycle gaps after P2.

P2 already separated true server drafts from active unpaid/pay-later orders in the POS sheet, blocked active/kitchen orders from normal cart editing, changed continued-draft payment to update-then-record-payment, and added backend edit locks.

P2.1 must close the remaining gaps documented in:

```txt
roadmap/business-flows/P2_pos_lifecycle_runtime_fix_report.md
```

Specifically:

```txt
1. Add canonical server-side lifecycle flags to order/open-order DTOs.
2. Use those server-side flags in the POS UI instead of relying only on defensive frontend derivation.
3. Replace the disabled active-order Detail placeholder with a real minimal active-order detail/payment view.
4. Prove or fix retail/counter fresh create-and-pay so it does not reappear as draft/open operational noise.
5. Add tests/smoke coverage so P2 lifecycle behavior is actually verified, not only statically reasoned.
```

This is still a patch phase. Do not perform the future P3/P4/P5 full business-flow adapter split yet.

## Context from previous phases

Read first:

```txt
roadmap/business-flows/main.md
roadmap/business-flows/P0_current_pos_flow_audit.md
roadmap/business-flows/P1_business_flow_sot_report.md
roadmap/business-flows/P2_pos_lifecycle_runtime_fix_report.md
packages/domain/business-flows/**
packages/application/business-flows/**
apps/pos-terminal-web/src/features/pos/services/orderLifecycle.ts
apps/pos-terminal-web/src/components/pos/CombinedDraftSheet.tsx
apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx
packages/application/orders/UpdateOrder.ts
packages/infrastructure/repositories/orders/OrderRepository.ts
apps/api/src/http/controllers/OrdersController.ts
```

## Non-negotiable scope boundary

Allowed:

```txt
- Add backend/server DTO lifecycle flags for orders returned to POS/open-order views.
- Add action metadata/allowed actions derived from P1 policy/SOT.
- Update POS UI to consume lifecycle flags.
- Add a minimal active order detail/payment modal or drawer.
- Add/adjust tests for lifecycle classifier, DTO mapper, active payment, and backend locks.
- Add manual smoke checklist/report.
- Small targeted patch to fresh retail/counter create-and-pay close behavior if the current behavior is proven wrong.
```

Forbidden:

```txt
- Do not rewrite POS into RetailPOSFlow/RestaurantPOSFlow/CafeCounterPOSFlow yet.
- Do not introduce new plan-name hardcoding.
- Do not make orders_queue required for payment lifecycle.
- Do not add schema/migration unless absolutely unavoidable; prefer computed fields from existing data.
- Do not remove offline/local draft behavior.
- Do not rewrite payment engine.
- Do not add platform-wide settlement/payment orchestration changes.
- Do not alter public route names unless backward compatible.
```

## Problem statement

P2 report explicitly left these risks:

```txt
- /api/orders/open does not expose canonical server-side isEditableDraft, isActiveOrder, isKitchenLocked, or allowedActions.
- Frontend derives lifecycle defensively from whatever fields are present.
- Detail for active orders is still a disabled placeholder.
- Full business-profile-specific retail/counter operational close semantics are deferred.
- Browser/manual smoke was not executed.
```

P2.1 must patch these enough that the runtime is operationally complete for current POS use.

## Deliverable 1 — Backend lifecycle DTO flags

Add a server-side mapper for POS/open-order lifecycle flags.

Suggested file location:

```txt
packages/application/orders/mappers/orderLifecycleDtoMapper.ts
```

or if application-layer mapper cannot access required data cleanly, use the nearest existing API/infrastructure mapper while keeping business rules centralized and documented.

Each order returned to POS/open-order view should expose computed fields:

```ts
isEditableDraft: boolean;
isActiveOrder: boolean;
isKitchenLocked: boolean;
hasKitchenTicket: boolean;
hasFiredKitchenItems: boolean;
allowedActions: string[];
lifecycleKind: 'server_draft' | 'active_order' | 'active_kitchen_order' | 'paid_completed' | 'cancelled' | 'unknown';
lifecycleLabel: string;
```

Use existing P1 action ids where possible:

```txt
CONTINUE_DRAFT
UPDATE_DRAFT_ITEMS
CANCEL_DRAFT
PAY_ACTIVE_ORDER
VIEW_ACTIVE_ORDER
VIEW_DRAFT
SEND_TO_KITCHEN
```

### Mapping rules

```txt
isEditableDraft = true only when:
- status === 'draft'
- paymentStatus is unpaid/partial or absent but not paid/refunded/voided
- no kitchen ticket
- no fired kitchen item

isActiveOrder = true when:
- status in confirmed/preparing/ready/served
- paymentStatus in unpaid/partial

isKitchenLocked = true when:
- hasKitchenTicket true OR hasFiredKitchenItems true OR fulfillment/kitchen status indicates started

lifecycleKind:
- server_draft for editable draft
- active_kitchen_order for active + kitchen locked
- active_order for active unpaid/partial not kitchen locked
- paid_completed for paid or completed
- cancelled for cancelled
- unknown otherwise
```

### Data source requirements

Backend must compute `hasKitchenTicket` and `hasFiredKitchenItems` tenant-safely.

If existing repository only computes edit lock by id, add a batch-safe method for list/open-orders to avoid N+1 where practical:

```ts
getEditLockStates(orderIds: string[], tenantId: string): Promise<Record<string, { hasKitchenTicket: boolean; hasFiredKitchenItems: boolean }>>
```

If a batch method is too invasive, document the temporary choice and add TODO for P3/P4. But do not ship an obviously bad N+1 query on every open-order poll if avoidable.

## Deliverable 2 — API response usage

Patch endpoints used by POS/open orders so returned orders include lifecycle DTO fields.

Likely endpoints:

```txt
GET /api/orders/open
GET /api/orders
GET /api/orders/:id
```

Minimum requirement:

```txt
GET /api/orders/open must include lifecycle DTO fields.
GET /api/orders/:id must include lifecycle DTO fields so stale continueOrderId guard is server-backed.
```

Do not break existing response shape. Add fields, do not remove old fields.

## Deliverable 3 — Frontend consumes server flags

Update:

```txt
apps/pos-terminal-web/src/features/pos/services/orderLifecycle.ts
apps/pos-terminal-web/src/components/pos/CombinedDraftSheet.tsx
apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx
```

Rules:

```txt
- Prefer server fields isEditableDraft/isActiveOrder/isKitchenLocked/allowedActions when present.
- Keep frontend fallback classification for backward compatibility/offline/local data.
- Do not treat paymentStatus !== 'paid' as draft.
- Do not show normal Lanjut/Edit unless allowedActions includes CONTINUE_DRAFT or isEditableDraft true.
- Do not show draft trash/cancel unless allowedActions includes CANCEL_DRAFT.
- Active order payment button should require PAY_ACTIVE_ORDER or fallback active unpaid/partial classification.
```

## Deliverable 4 — Real active order detail/payment UI

Replace the disabled `Detail` placeholder in active order rows.

Minimum acceptable UI:

```txt
ActiveOrderDetailDialog / ActiveOrderDetailSheet
```

It must show:

```txt
- order number
- table number if any
- customer name if any
- lifecycle/status label
- item list with qty and item subtotal
- total
- paid amount if available
- remaining amount if available/computable
- payment status
- buttons: Bayar, Tutup
```

Rules:

```txt
- Detail view must not allow normal cart editing.
- Detail view must not show trash delete.
- Bayar from detail must call the same active-order payment flow as Bayar from row.
- If remaining amount is not available from API, compute conservatively from total - paidAmount.
- If amount cannot be computed reliably, show an error and do not record payment with NaN/0.
```

## Deliverable 5 — Active order payment amount correctness

Audit current active-order payment amount.

P2 currently uses total amount from the active row. That may overpay if the order is partially paid.

Patch so active-order payment uses remaining amount:

```txt
remainingAmount = max(total - paidAmount, 0)
```

Support both camelCase and snake_case fields:

```txt
total / total_amount
paidAmount / paid_amount
remainingAmount / remaining_amount
```

Rules:

```txt
- If paymentStatus === partial, pay remaining amount, not full total.
- If paymentStatus === unpaid, pay total amount.
- If remaining amount <= 0, disable Bayar and show already paid/settled message.
```

## Deliverable 6 — Fresh retail/counter create-and-pay close behavior

P2 deferred this. P2.1 must either fix it or prove with code/tests why it is safe.

Audit:

```txt
- create-and-pay output order status for fresh full payment
- open-order query filtering
- whether paid confirmed orders appear in /api/orders/open or POS draft/open sheet
```

Required outcome:

```txt
Fresh standard Cart -> Bayar -> paid should not reappear as Draft Server or Pesanan Aktif in POS sheet.
```

If paid orders are already filtered out from `GET /api/orders/open`, document proof in report and add regression test if possible.

If paid confirmed orders still appear in open/order queue noise, patch minimally:

```txt
Option A: open-order endpoint excludes paymentStatus === paid for POS draft/active sheet data.
Option B: frontend lifecycle classifier treats paid orders as paid_completed and excludes from Draft Server/Pesanan Aktif.
Option C: create-and-pay passes/sets fulfillment_mode='instant' only for current retail/counter instant checkout path if reliable business profile/order type signal exists.
```

Do not break restaurant pay-later/kitchen fulfillment. If no reliable business profile is available, prefer A/B now and leave C to future business-profile adapter phase.

## Deliverable 7 — Backend update lock hardening check

Review P2 backend lock implementation for tenant safety and completeness.

Required:

```txt
- getEditLockState/getEditLockStates must scope kitchen tickets by tenantId.
- fired item check must scope order items through the tenant-scoped order or join order->tenant if item table lacks tenantId.
- PATCH /api/orders/:id must reject non-draft and kitchen/fired item edits with 409 stable codes.
- Error response must be readable and stable.
```

If current fired item query is not tenant-scoped enough, patch it.

## Deliverable 8 — Tests

Add/adjust tests according to existing repo conventions.

### Required pure tests

```txt
orderLifecycle classifier:
- draft unpaid no kitchen -> server_draft/isEditableDraft true
- confirmed unpaid -> active_order true, not editable draft
- preparing unpaid + kitchen -> active_kitchen_order, not editable draft
- paid confirmed -> paid_completed, excluded from draft/active list
- local draft fallback still editable locally
```

### Required backend/use-case tests

```txt
UpdateOrder:
- draft unpaid no kitchen -> allowed
- confirmed unpaid -> ORDER_NOT_EDITABLE
- draft with kitchen ticket -> KITCHEN_ORDER_LOCKED
- draft with fired item -> FIRED_ITEMS_LOCKED
- paid draft -> ORDER_NOT_EDITABLE
```

### Required API/mapper tests if harness exists

```txt
GET /api/orders/open returns lifecycle DTO fields.
GET /api/orders/:id returns lifecycle DTO fields.
PATCH active order items returns 409 stable code.
```

### Frontend/component tests if harness exists

```txt
CombinedDraftSheet:
- true draft row shows Lanjut and trash
- active order row shows Bayar and Detail
- active order row does not show Lanjut/trash
- paid order row is not shown in draft/active sections
- local draft row still shows Lanjut and Hapus Lokal
```

If component/API test harness does not exist, add unit tests for mappers/helpers and document manual smoke.

## Deliverable 9 — Manual smoke checklist

Create/update report with exact manual smoke checklist:

```txt
1. Retail fresh payment:
   Cart -> Bayar -> paid -> not in Draft Server/Pesanan Aktif.

2. Server draft:
   Cart -> Simpan Draft -> Draft Server -> Lanjut -> Bayar -> update+record payment -> disappears.

3. Restaurant active kitchen:
   Send to Kitchen -> Pesanan Aktif -> no Lanjut/trash -> Detail opens -> Bayar works.

4. Partial active order:
   DP/partial -> Pesanan Aktif -> Bayar pays remaining only.

5. Stale URL:
   /pos?continueOrderId=<active_order_id> -> blocked with readable message.

6. Backend bypass:
   PATCH active/kitchen order items -> 409 ORDER_NOT_EDITABLE/KITCHEN_ORDER_LOCKED/FIRED_ITEMS_LOCKED.
```

Run browser smoke if environment supports it. If not, state clearly that browser smoke was not run and why.

## Required report

Create:

```txt
roadmap/business-flows/P2_1_lifecycle_hardening_patch_report.md
```

Report must include:

```txt
1. Summary
2. Files changed
3. Server lifecycle DTO fields added
4. API endpoints updated
5. Frontend behavior before/after
6. Active-order detail/payment behavior
7. Remaining amount calculation proof
8. Fresh retail/counter create-and-pay proof or fix
9. Backend lock hardening proof
10. Tests and validation output
11. Manual smoke result or explicit not-run statement
12. Remaining risks deferred to P3+
```

## Validation commands

Run relevant commands:

```bash
pnpm --filter @pos/domain type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/api type-check
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/application test
pnpm --filter @pos/api test
pnpm type-check
```

If some commands do not exist, run closest available and document exact output.

## Completion checklist

- [ ] `/api/orders/open` returns lifecycle fields.
- [ ] `/api/orders/:id` returns lifecycle fields.
- [ ] Frontend prefers lifecycle fields over ad-hoc unpaid filtering.
- [ ] Active order Detail is real, not disabled placeholder.
- [ ] Active order payment pays remaining amount, not blindly full total.
- [ ] Paid fresh retail/counter order is excluded from Draft Server/Pesanan Aktif.
- [ ] Backend fired-item/kitchen-ticket lock is tenant-safe.
- [ ] PATCH unsafe order update returns 409 stable code.
- [ ] Local draft behavior still works.
- [ ] Tests/validation documented.
- [ ] P2.1 report created.

## Commit

```txt
fix(pos): harden lifecycle DTOs and active order payment
```
