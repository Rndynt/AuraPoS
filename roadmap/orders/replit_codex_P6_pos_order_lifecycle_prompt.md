# Replit/Codex Prompt P6 — POS Order Lifecycle Flow

Repository: `Rndynt/AuraPoS`

## Goal

Fix POS order lifecycle. This task is not stock-related.

Current problem: the UI treats every unpaid server order as “Draft”, including orders already sent to kitchen. That creates unsafe actions: active kitchen orders can appear with `Lanjut` and trash actions, and continued draft payment only updates the draft instead of actually paying.

## Verified root causes

- `CombinedDraftSheet` builds `serverDrafts` from `openOrdersData.orders.filter(o => o.paymentStatus !== 'paid')`, so confirmed/preparing/ready/served unpaid orders are mixed into “draft”.
- `CombinedDraftSheet` renders `Lanjut` and trash actions for each server unpaid order without status/kitchen-state checks.
- In `POSPage`, if `continueOrderId` exists and payment is not partial, `handleCharge()` calls `handleUpdateContinueOrder()` and returns. That updates the order, clears cart, and sends it back to open orders instead of opening/finishing payment.
- `Send to Kitchen` creates/updates an order then creates kitchen ticket, but the same order can still show in the current draft sheet as if it were editable.

## Correct lifecycle model

Use separate concepts:

- Local Draft: local/offline draft on this device only.
- Server Draft: server order with `status === 'draft'`, unpaid, not sent to kitchen. Editable.
- Active Order: unpaid order with `confirmed|preparing|ready|served`. Not a draft.
- Kitchen Order: active order with kitchen ticket / fulfillment already started. Not editable through normal cart.
- Paid/Completed Order: closed.

Do not call all unpaid server orders “Draft”.

## Required standard POS flow

Without kitchen entitlement and without order queue entitlement:

1. Add items to cart.
2. Click Bayar.
3. Create and pay atomically.
4. Order becomes paid/completed.
5. It must not return to Draft/Open Orders.

Optional draft:

- Save Draft creates server draft.
- Server draft can be continued/edited while still `status === 'draft'`.
- When a continued server draft is paid, the system must update the draft if needed, then record payment/settle it. It must not only save it back to draft.

## Required kitchen flow

With kitchen entitlement:

1. Add items to cart.
2. Send to Kitchen.
3. Order becomes active kitchen order.
4. It must appear under active orders, not editable drafts.
5. No normal `Lanjut/Edit` for active kitchen orders.
6. No trash action for active kitchen orders.
7. Payment must be available through `Bayar` action without loading the order into editable cart.
8. Adding items to an active kitchen order must be a separate explicit flow, not normal cart edit.
9. Cancel/void of active kitchen order must use existing order operation permission/policy and require clear reason.

## Required UI changes

Refactor `CombinedDraftSheet` or replace it with clearer sections:

- `Draft Server`: only `status === 'draft'` and unpaid.
  - Actions: Lanjut/Edit, Bayar, Batalkan where allowed.
- `Pesanan Aktif`: unpaid `confirmed|preparing|ready|served`.
  - Actions: Bayar, Lihat Detail.
  - No Lanjut/Edit.
  - No trash action.
- `Draft Lokal`: local offline drafts only.
  - Actions: Lanjut, Hapus Lokal.

Rename the POS button if needed. If it opens more than drafts, do not label it only `Draft`.

## Required backend protections

Do not rely on UI only.

- Reject item update for orders that are not `draft`.
- Reject normal cart edit if kitchen ticket exists or fulfillment started.
- Active kitchen order cancellation must go through explicit cancel/void policy, not silent trash action.
- Payment of active unpaid order must not require editable cart load.
- Errors must be readable to cashier.

## Required POSPage fix

Patch `apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx`:

- `continueOrderId` charge path must not call only `handleUpdateContinueOrder()` and return.
- For editable server draft: clicking Bayar opens payment flow, updates order if needed, then records payment/settles the existing order.
- For active kitchen order: do not load to cart through normal continue flow. Pay from active-order action/detail.

## Entitlement rules

- Standard payment flow must work without `restaurant_kitchen_ops` and without `orders_queue`.
- `restaurant_kitchen_ops` controls Send to Kitchen/KDS flow.
- `orders_queue` controls queue display only, not core payment lifecycle.
- Do not hardcode plan names.

## Tests required

- Standard POS without kitchen/order_queue: cart -> bayar -> paid, no draft loop.
- Server draft: save -> continue/edit -> bayar -> paid, removed from draft list.
- Kitchen order: send to kitchen -> appears active, not draft.
- Kitchen order has no Lanjut/Edit and no trash action.
- Backend rejects item update for confirmed/preparing/ready/served.
- Backend rejects normal edit when kitchen ticket exists.
- Active unpaid kitchen order can be paid through Pay action.

## Validation

Run:

- `pnpm type-check`
- `pnpm --filter @pos/api type-check`
- `pnpm --filter @pos/terminal-web type-check`
- `pnpm --filter @pos/api test`

## Report

Create/update:

`roadmap/orders/pos_order_lifecycle_and_kitchen_flow_report.md`

Report must include root cause, final lifecycle decision, UI action matrix, backend protection matrix, kitchen proof, standard flow proof, entitlement proof, validation output, and remaining issues `none` unless externally blocked.

## Commit

`fix(pos): clarify draft and kitchen order lifecycle`
