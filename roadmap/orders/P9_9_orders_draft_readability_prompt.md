# Replit/Codex Prompt P9.9 — Orders Page + Draft Dialog Readability Final Fix

Repository: `Rndynt/AuraPoS`

## 1. Goal

Fix the cashier-facing readability problems in:

```txt
1. Draft / pending order dialog from POS cashier screen.
2. Orders page list + detail panel.
3. Order payment detail display for partial, multi, and split bill payments.
```

This is a UI/UX readability patch, not a payment-engine rewrite.

The app must be usable by a cashier without technical knowledge:

```txt
- Draft dialog must scroll and fit every viewport.
- Orders list must remain readable.
- Order detail panel must not waste space with oversized header.
- Item Pesanan must be visible earlier and readable.
- Payment method and payment breakdown must be clear.
- Partial/split remaining amount must be explained clearly.
```

## 2. Screenshot problems to solve

### 2.1 Draft dialog problem

Observed behavior:

```txt
- Draft dialog opens over POS screen.
- Dialog is too tall / clipped by viewport.
- List cannot be scrolled comfortably.
- Draft rows are large and consume space.
- Action buttons are visible but content is trapped/cut.
```

Expected behavior:

```txt
- Draft dialog/sheet fits mobile portrait, mobile landscape, tablet, and desktop.
- Draft list is scrollable.
- Header stays compact.
- Each draft row is compact but readable.
- Continue and delete actions are reachable.
- Dialog never hides important content behind browser/nav bars.
```

### 2.2 Orders page detail problem

Observed behavior:

```txt
- Left order list/detail layout is too cramped.
- Order number / item section can become hard to read.
- Right detail panel header consumes too much vertical space.
- Important item detail is pushed downward.
- On mobile landscape, the right panel has too much decorative header and not enough useful content.
```

Expected behavior:

```txt
- List column and detail column are balanced.
- Header is compact and informative.
- Item Pesanan section is visible earlier.
- Main action footer remains reachable.
- The page works on mobile portrait, mobile landscape, tablet, and desktop.
```

### 2.3 Payment detail problem

Observed behavior:

```txt
- Detail panel does not clearly explain how the order was paid.
- Payment method is not obvious.
- Multi payment lines are not clearly summarized.
- Split bill payment details are not clear: which bill paid, how much paid, and what remains.
- Partial payment only says paid/remaining, but not enough breakdown.
```

Expected behavior:

```txt
- Detail panel shows payment status and payment breakdown clearly.
- Show method labels: Tunai, Transfer Manual, QRIS Manual.
- Show payment flow/kind in readable Indonesian only when it helps.
- Show each payment line for Multi.
- Show split bill/bill id/label where available.
- Show total, paid, remaining, and progress compactly.
```

## 3. Non-negotiable rules

```txt
- Do not change payment engine behavior in this task.
- Do not add provider/gateway/card/e-wallet/NorthFlow logic.
- Do not add legacy compatibility code.
- Do not add random labels that repeat obvious information.
- Do not make the UI denser with technical terms.
- Do not show SQL/zod/internal identifiers to cashier.
- Do not invent a new design language; use AuraPoS existing blue/neutral/green/amber style.
- Do not hide actions behind unreachable scroll areas.
```

## 4. Files to inspect before coding

Inspect:

```txt
apps/pos-terminal-web/src/components/pos/CombinedDraftSheet.tsx
apps/pos-terminal-web/src/pages/orders.tsx
apps/pos-terminal-web/src/lib/api/hooks.ts
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
apps/api/src/http/controllers/OrdersController.ts
packages/infrastructure/repositories/orders/OrderRepository.ts
packages/infrastructure/repositories/payments/DrizzleSubmitPOSPaymentRepository.ts
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Run:

```bash
rg -n "CombinedDraftSheet|Draft|Lanjut|ScrollArea|max-h|overflow-y|Dialog|Sheet|Ditunda|draft" apps/pos-terminal-web/src/components apps/pos-terminal-web/src/features apps/pos-terminal-web/src/pages

rg -n "DetailPanel|OrderCard|Item Pesanan|Pembayaran|Lunasi Sisa|payments|splits|payment_flow|payment_kind|split_id|paid_amount|remaining" apps/pos-terminal-web/src/pages/orders.tsx apps/api/src packages
```

## 5. Draft dialog redesign requirements

Update:

```txt
apps/pos-terminal-web/src/components/pos/CombinedDraftSheet.tsx
```

Required layout:

```txt
Dialog/Sheet
├── Compact header
│   ├── title: Draft / Pesanan Ditunda
│   └── count badge
├── Scrollable draft list
│   └── compact draft rows
└── Optional compact footer/help text
```

### 5.1 Viewport behavior

```txt
Mobile portrait:
- Use bottom sheet or near-full modal width.
- Max height around 85-90dvh.
- Draft list scrolls.
- Bottom nav/browser chrome must not cover actions.

Mobile landscape:
- Use centered modal/sheet with max-height 88-92dvh.
- Header compact.
- Draft list scrolls.
- At least 3 draft rows visible if enough rows exist.

Tablet/Desktop:
- Use max width that is readable, not huge.
- List remains scrollable if many drafts.
```

### 5.2 Draft row content

Each draft row should show only useful information:

```txt
- order number
- total amount
- short time/date if available
- item count if available
- Continue action
- Delete action
```

Avoid oversized empty spacing.

Recommended row layout:

```txt
Left:
  ORD-xxxx
  Rp xx.xxx · 2 item · 14:08
Right:
  delete icon
  Lanjut
```

## 6. Orders page responsive layout requirements

Update:

```txt
apps/pos-terminal-web/src/pages/orders.tsx
```

### 6.1 Overall layout

For mobile portrait:

```txt
- Use list-first view.
- Detail opens as sheet/fullscreen panel after selecting order.
- Do not force cramped two-column layout.
```

For mobile landscape:

```txt
- Two-column layout is allowed.
- Left list width must be enough to read order number and amount.
- Right detail panel must not have oversized header.
- Item section must be visible without excessive scrolling.
```

For tablet/desktop:

```txt
- Two-column layout with balanced widths.
- Suggested: list 38-42%, detail 58-62%, or CSS grid minmax.
- Do not make detail header dominate the page.
```

### 6.2 Header compaction in detail panel

Current detail header is too tall. Replace with compact hierarchy:

```txt
Top row:
- Order number
- close button

Second row compact metadata chips:
- order type
- status
- payment status
- date/time
```

Avoid large status cards that consume too much vertical space.

Bad:

```txt
Large two-column status/payment card taking too much vertical space before item list.
```

Good:

```txt
#ORD-20260622-0002
Dine In · Dikonfirmasi · Sebagian · 22 Jun 14.08
```

### 6.3 Order list readability

Order cards should show:

```txt
- order type chip
- order number readable without being crushed
- status chip
- payment status chip
- total amount
- if partial: paid amount, remaining amount, progress
```

If left column is narrow:

```txt
- use two-line layout, not overly compressed one-line layout
- allow order number wrapping/truncation safely
- keep total amount readable
```

## 7. Payment detail breakdown requirements

The order detail panel must show how payment was done.

### 7.1 Payment summary card

Show compact summary:

```txt
Pembayaran
Status: Sebagian / Lunas / Belum Bayar
Total: Rp 190.900
Dibayar: Rp 14.000
Sisa: Rp 176.900
```

For partial payment, show progress bar.

### 7.2 Payment method lines

If `order.payments` exists, render each payment row:

```txt
Tunai · Bayar Penuh · Rp 190.900
QRIS Manual · Multi · Rp 140.900
Transfer Manual · DP · Rp 50.000
```

Use user-readable labels:

```txt
FULL_PAYMENT -> Bayar Penuh
DOWN_PAYMENT -> DP
REMAINING_PAYMENT -> Pelunasan
MULTI_PAYMENT_LINE -> Multi
SPLIT_BILL_LINE -> Split Bill
```

Method labels:

```txt
CASH -> Tunai
MANUAL_TRANSFER -> Transfer Manual
MANUAL_QRIS -> QRIS Manual
```

Do not show raw enum as the primary label unless no mapper exists.

### 7.3 Split bill detail

If payment row has split/bill info, show it:

```txt
Split Bill A · Tunai · Rp 14.000
Split Bill B · QRIS Manual · Rp 15.000
```

If backend returns `order.splits` / `order.billSplits` / `splits`, show split summary:

```txt
Split Bill
Bill A: Rp 14.000 dibayar Rp 14.000 · Lunas
Bill B: Rp 17.050 dibayar Rp 0 · Sisa Rp 17.050
```

If split rows are not returned yet, do not invent data. Show available payment rows and add a report note that API must expose split summary later.

### 7.4 Multi payment detail

For Multi, show lines clearly:

```txt
Multi Payment
1. Tunai Rp 55.000
2. QRIS Manual Rp 135.900
Total dibayar Rp 190.900
```

### 7.5 Settlement action

For partial orders:

```txt
- Button text can remain: Lunasi Sisa Rp X.
- Above button, show why X is remaining.
- If split bill partial, show whether this is whole-order remaining or selected split remaining.
```

Do not leave cashier guessing whether the action pays the whole remaining order or one split.

## 8. Data/API requirements for detail

Inspect current API response for selected order:

```txt
GET /api/orders/:id or current selected order endpoint.
```

Ensure it returns enough payment data:

```txt
- payments[] with method, amount, payment_flow/paymentFlow, payment_kind/paymentKind, payment date
- split_id or client_bill_id if available
- splits[] / billSplits[] if backend already has table data
```

If missing, add backend mapping in `OrdersController` / repository to include safe read-only payment/split detail.

Do not add write behavior in this task.

## 9. Styling rules

Use current AuraPoS style:

```txt
- blue for primary action/selection
- green/emerald for paid/success
- amber for partial/remaining
- slate/neutral for inactive/background
- rounded cards consistent with existing app
- compact spacing
- readable font sizes
```

Remove unhelpful labels.

Examples of labels that may be removed or compressed:

```txt
- repeated STATUS / PEMBAYARAN large cards if same info exists as chips
- duplicated section labels that do not guide the cashier
```

## 10. Tests / verification

Add practical tests if the stack supports it. Otherwise update report/manual checklist.

Minimum manual checks:

```txt
1. Mobile portrait: draft dialog scrolls and all actions are reachable.
2. Mobile landscape: draft dialog scrolls; at least 3 draft rows visible.
3. Mobile landscape: orders list card order number and total are readable.
4. Mobile landscape: order detail item list is visible without excessive header height.
5. Tablet: two-column order layout is balanced.
6. Desktop: detail panel is not oversized and not empty.
7. Partial order detail shows total, paid, remaining, and progress.
8. Multi payment detail shows each method line.
9. Split bill detail shows bill/payment breakdown when data exists.
10. Settlement button remains reachable.
```

## 11. Report update

Update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Add section:

```txt
## P9.9 Orders Page + Draft Dialog Readability Final Fix
```

Include:

```txt
1. Screenshot problems analyzed.
2. Draft dialog scroll/layout fix.
3. Orders page responsive layout fix.
4. Detail panel header compaction.
5. Payment detail breakdown implementation.
6. Split bill detail behavior.
7. Files changed.
8. Tests/manual verification.
9. Remaining limitations.
```

## 12. Acceptance checklist

```txt
- [ ] Draft dialog/sheet scrolls on mobile portrait.
- [ ] Draft dialog/sheet scrolls on mobile landscape.
- [ ] Draft rows are compact and readable.
- [ ] Continue/delete actions are reachable.
- [ ] Orders page mobile portrait does not force unreadable two-column layout.
- [ ] Orders page mobile landscape has readable list and detail columns.
- [ ] Detail header is compact and does not push content out of view.
- [ ] Item Pesanan section is visible earlier.
- [ ] Order list cards show order number, status, payment status, total, and partial progress clearly.
- [ ] Detail payment summary shows total, paid, remaining.
- [ ] Detail payment lines show method labels clearly.
- [ ] Multi payment detail shows each line/method.
- [ ] Split bill detail shows bill/payment breakdown if data exists.
- [ ] Settlement action explains what remaining amount is being paid.
- [ ] Styling remains consistent with AuraPoS.
- [ ] No provider/gateway/card/e-wallet/NorthFlow logic added.
- [ ] No payment engine rewrite added.
- [ ] Report updated.
```

## 13. Commit message

```txt
fix(pos): improve orders and draft readability
```