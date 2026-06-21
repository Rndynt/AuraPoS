# Replit/Codex Prompt P9.5 — Payment Dialog Readable Layout Final Fix

Repository: `Rndynt/AuraPoS`

## 1. Goal

Fix the POS payment dialog layout so it is readable, predictable, compact, responsive, and easy for a cashier to use.

The current P9.4 implementation fixed some state wiring, but the visual result is still not acceptable in mobile landscape:

```txt
- Multi still feels wrong because payment method controls take too much space in the right work area.
- Split Bill item assignment area is not visible enough.
- Split Bill repeats Bill A / Bill B labels at the top and again at the bottom, wasting vertical space.
- The bottom Bill A / Bill B total cards duplicate information already visible in the bill tabs.
- The right panel is consumed by duplicated labels, big buttons, and spacing instead of the actual work: assigning items.
```

P9.5 must redesign the dialog layout, not keep patching spacing randomly.

Expected result:

```txt
Cashier opens payment dialog.
Left panel shows total, flow tabs, selected payment method, and flow summary.
Right panel shows only the active flow work area.
Multi: right panel shows payment lines and amount input; method is selected from the left control rail.
Split: right panel prioritizes bill tabs and item assignment list. Bill labels/totals are not duplicated.
All viewport sizes remain usable: mobile portrait, mobile landscape, tablet, and desktop.
```

## 2. Important principle

The project needs simple readable UI, not more complexity.

```txt
- Clean layout ownership.
- No duplicated controls.
- No duplicated Bill A / Bill B labels.
- No duplicated bill total cards if the bill tabs already show totals.
- No random nested scrolls.
- No oversized payment method buttons taking over the work area.
- No hidden item list.
- No labels that do not help cashier decisions.
- No dense action clutter.
- No legacy compatibility.
- No provider/card/e-wallet/gateway/NorthFlow logic.
- No businessProfile logic inside payment domain/application.
```

Only fix the payment dialog UX/layout and the state mapping needed by that layout.

## 3. Screenshot problem diagnosis

### Multi screenshot problem

```txt
- Left panel has total and flow tabs, but still feels underused.
- Right panel contains large method buttons, amount field, and numpad.
- The method selector looks like a second main content area instead of a compact payment control.
- After adding lines, the list and method selector crowd the right panel.
```

### Split screenshot problem

```txt
- Top area already shows Bill A and Bill B.
- Bottom area repeats Bill A and Bill B again as total cards.
- The repeated Bill A/B section wastes vertical space and pushes item assignment out of view.
- The cashier needs to assign items first, so the item list must be the main visible area.
- Bill tabs should be the single place where Bill A/B identity and amount are displayed.
```

## 4. Files to inspect first

Inspect before coding:

```txt
apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
apps/pos-terminal-web/src/features/pos-core/services/__tests__/posPaymentSubmissionService.test.ts
apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts
apps/pos-terminal-web/src/features/pos-flows/restaurant/useRestaurantTableServicePOSFlow.ts
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Run:

```bash
rg -n "MethodButtons|multiMethod|setMultiMethod|SPLIT_BILL|MULTI_PAYMENT|split-item-assignment-list|DialogContent|isLandscape|overflow-y-auto|flex-1|min-h-0|Bill A|Bill B|getBillTotal" apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
```

## 5. Final layout concept

Use a consistent two-zone layout for desktop/tablet/mobile-landscape.

```txt
Dialog
├── Left control panel
│   ├── Pembayaran title
│   ├── Total amount
│   ├── Flow tabs: Bayar Penuh / DP / Multi / Split
│   ├── Payment method selector for current flow or current line
│   └── Compact flow summary/help
└── Right work panel
    ├── Active flow content
    └── Confirm/action area
```

For small portrait, it can stack vertically, but still keep this order:

```txt
Total → flow tabs → method selector → active work area → confirm
```

## 6. Left panel responsibilities

The left panel is the cashier control rail. It should not be empty.

Left panel must contain:

```txt
- Payment total
- Flow selection tabs
- Method selector when the active flow needs method selection
- Compact selected flow summary
```

Method selector placement:

```txt
FULL:
- method selector in left panel
- right panel: cash received/numpad/change OR manual confirmation display

DP:
- method selector in left panel
- right panel: DP amount input/numpad/remaining preview

MULTI:
- method selector in left panel titled "Metode Baris Berikutnya"
- selector writes to multiMethod/setMultiMethod
- right panel: existing lines, amount input, numpad, add-line button, final confirm

SPLIT:
- method selector in left panel titled "Metode Bayar Bill Aktif"
- selector writes to method/setMethod
- right panel: bill tabs, visible item assignment list, selected-bill action only
```

Do not render a second method selector inside the right panel for Multi/Split.

## 7. Method selector component

Replace ad-hoc `MethodButtons` with a reusable, explicit component:

```ts
type MethodSelectorProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  title?: string;
  compact?: boolean;
  testIdPrefix: string;
};
```

The component should support compact left-panel display:

```txt
- button height around 44-52px, not giant card blocks
- one column in narrow left rail
- clear selected state
- readable labels: Tunai, Transfer Manual, QRIS Manual
```

State mapping must be exact:

```txt
FULL  -> method/setMethod
DP    -> method/setMethod
MULTI -> multiMethod/setMultiMethod
SPLIT -> method/setMethod
```

## 8. Multi layout requirement

Right panel for Multi must show:

```txt
1. Status: Terbayar X · Sisa Y
2. Existing payment lines list
3. Amount input for next line
4. Numpad
5. Add-line button: Tambah Tunai / Tambah Transfer Manual / Tambah QRIS Manual
6. Final confirm button only when remaining is zero
```

Left panel for Multi must show:

```txt
- total
- flow tabs
- method selector titled "Metode Baris Berikutnya"
- selected method summary
```

Multi correctness:

```txt
- Selecting method in left panel updates multiMethod.
- Add-line stores method: multiMethod.
- Existing lines display each stored method and amount.
- Global method must not affect Multi line storage.
- No method selector appears in the right panel for Multi.
```

## 9. Split layout requirement

Split must prioritize item assignment and must not duplicate bill labels/totals.

### Single source of truth for Bill A / Bill B

The top bill tabs are the only bill selector and total display.

```txt
Allowed:
- Top tabs: Bill A Rp X, Bill B Rp Y, + add bill.

Not allowed:
- Top tabs Bill A/B plus bottom cards Bill A/B again.
- Repeating all bill totals below the item list.
- A second Bill A/B selector anywhere else.
```

If the selected bill amount must be shown near the confirm action, show it only inside the confirm button or a single compact text line, for example:

```txt
Bayar Bill A · Rp 15.000
```

Do not render another Bill A/B card group at the bottom.

### Right panel structure for Split

Right panel for Split must be:

```txt
Top:
- Bill tabs only once: Bill A, Bill B, plus add bill.
- Tabs already show each bill total.

Main work area:
- Item assignment list visible immediately.
- Each item row: assigned bill badge, product name, variant/options, quantity, amount.
- Rows tap-friendly but compact.
- Unassigned items clearly visible.

Bottom/action area:
- Unassigned warning if needed.
- Selected bill action only.
- Confirm button: Bayar Bill A · Rp X.
```

Payment method for Split belongs in the left panel, not above the item list in the right panel.

### Landscape Split layout

For mobile landscape / wide dialog, use an internal two-column layout inside the right panel if needed:

```txt
Right panel Split
├── top bill tabs full width
└── body grid
    ├── left: item assignment list, scrollable, visible
    └── right: compact selected bill summary + unassigned info + confirm button
```

The right side summary must not repeat all Bill A/B cards. It may show only:

```txt
Bill aktif: Bill A
Jumlah: Rp 15.000
Unassigned: 3 item
Confirm button
```

### Portrait Split layout

For portrait, use vertical layout:

```txt
bill tabs once
item assignment list, scrollable with real visible height
compact selected bill action
confirm button
```

### Hard requirements

```txt
- Bill A/B labels must not be duplicated at top and bottom.
- Top bill tabs are the single source of bill name + amount.
- Remove bottom Bill A/B total cards.
- `split-item-assignment-list` must always have visible height.
- Use `min-h-0` on all flex/grid parents that contain scroll areas.
- Do not place method selector above item list in Split right panel.
- Do not let summary/payment footer push the item list to zero height.
- At least 3 item rows should be visible in landscape when there are 6 cart items, unless viewport is extremely small.
- The item list must remain scrollable.
```

## 10. Responsive viewport requirements

The redesign must be explicitly responsive across all common POS viewports.

### 10.1 Mobile portrait

Expected:

```txt
- Dialog behaves like a compact sheet/modal.
- Layout stacks vertically: total, flow tabs, method selector, work area, action.
- No two-column layout if it makes the content too narrow.
- Text remains readable without horizontal scrolling.
- Primary action remains reachable.
- Close button remains reachable.
- Item list and numpad can scroll, but labels/actions must not disappear.
```

### 10.2 Mobile landscape

Expected:

```txt
- Use left control rail + right work panel.
- Left panel must not be too wide; target 220-250px.
- Right panel must prioritize the work area.
- Split item list must be visible immediately.
- At least several item rows should be visible before scrolling.
- Do not waste vertical space with duplicate labels, repeated totals, or large empty sections.
```

### 10.3 Tablet

Expected:

```txt
- Use two-zone layout.
- Right panel has enough breathing room but remains compact.
- Method selector stays in left control rail.
- Work area uses available space without giant card blocks.
- Split can use item list + compact summary side by side.
```

### 10.4 Desktop

Expected:

```txt
- Dialog should not become unnecessarily huge.
- Use max width around 900px unless project style requires otherwise.
- Content remains centered and readable.
- Left control rail and right work panel remain visually balanced.
- No excessive whitespace after flow tabs.
```

### 10.5 Responsive implementation rules

```txt
- Prefer CSS/Tailwind responsive classes over manual JS viewport branching unless already necessary.
- Use `dvh` for height-sensitive modal constraints.
- Use `min-h-0` for flex/grid children that contain scroll areas.
- Use `min-w-0` for panels containing truncating text.
- Avoid nested scrollbars unless unavoidable.
- Do not let browser chrome / Android navigation / mobile address bar hide the confirm button.
- Do not rely only on `window.innerWidth > window.innerHeight`; still verify portrait, landscape, tablet, desktop behavior.
```

## 11. Styling and visual language requirements

Use the existing AuraPoS visual style. Do not invent a new design language.

```txt
- Keep the existing blue primary action style.
- Keep neutral slate backgrounds/borders for inactive controls.
- Use teal/green only for paid/remaining/success indicators where already used.
- Use amber only for DP/warning context where useful.
- Use compact rounded cards/buttons consistent with current project styling.
- Avoid unnecessary uppercase labels except small section labels that help scanning.
- Remove labels that repeat obvious information.
- Keep typography readable: clear amount hierarchy, compact helper text, no clutter.
- Icons are allowed only when they help recognition; do not add decorative icons everywhere.
```

Design goal:

```txt
The cashier should understand the flow in 3 seconds without reading duplicated labels.
```

## 12. Sizing and spacing rules

Use compact, practical spacing.

```txt
Dialog:
- width for landscape/tablet: min(94vw, 900px)
- max height: 92dvh
- left panel width: about 220-250px in landscape/tablet
- right panel: flex-1 min-w-0 min-h-0

Buttons:
- method buttons in left panel should be compact, not full content cards
- flow buttons can remain compact tabs
- bill tabs should be compact but readable
- numpad buttons can be smaller in landscape if needed

Scroll:
- only the active content area should scroll
- avoid nested scrollbars unless unavoidable
- never hide close button
```

## 13. Submit payload must stay canonical

Do not break the data contract already established.

Multi emits:

```ts
payment: {
  flow: "MULTI_PAYMENT",
  paymentKind: "MULTI_PAYMENT_LINE",
  lines: [
    { method: "CASH", amount: 100000 },
    { method: "MANUAL_TRANSFER", amount: 90900 },
  ],
}
```

Split emits:

```ts
payment: {
  flow: "SPLIT_BILL",
  paymentKind: "SPLIT_BILL_LINE",
  targetBillId: "A",
  lines: [
    { method: "CASH", amount: 15000, clientBillId: "A" },
  ],
  splits: [
    { clientBillId: "A", label: "Bill A", splitNo: 1, amountDue: 15000, amountPaid: 0, status: "UNPAID" },
    { clientBillId: "B", label: "Bill B", splitNo: 2, amountDue: 175900, amountPaid: 0, status: "UNPAID" },
  ],
}
```

Do not change canonical flow/method/kind names.

## 14. User-readable behavior

Cashier should understand:

```txt
Bayar Penuh:
- choose method on left
- enter cash/manual confirmation on right

DP:
- choose method on left
- enter DP amount on right

Multi:
- choose method for next line on left
- enter amount and add line on right
- repeat until remaining is zero

Split:
- choose method for selected bill on left
- select active bill from top tabs on right
- assign items from visible item list
- pay selected bill from one confirm button
```

## 15. Tests / verification

Full UI test can be deferred if the project test stack is not ready, but add or update what is practical.

At minimum, update report/manual checklist.

If component tests are available, add assertions:

```txt
- Multi renders only one method selector and it is in the left panel/control rail.
- Multi right panel has no method selector.
- Selecting Transfer Manual in Multi stores MANUAL_TRANSFER in added line.
- Split right panel contains visible split-item-assignment-list before payment action section.
- Split right panel has no method selector above the item list.
- Split renders Bill A/B labels only once as top bill tabs.
- Split does not render bottom Bill A/B total cards.
```

Manual verification required:

```txt
1. Mobile portrait Full/DP: content readable, no horizontal overflow, confirm reachable.
2. Mobile portrait Multi: method selector visible before amount input, lines readable, confirm reachable.
3. Mobile portrait Split: Bill A/B appears only once, item list visible and scrollable.
4. Mobile landscape Multi: method selector appears in left panel only.
5. Mobile landscape Multi: adding line shows correct method and amount.
6. Mobile landscape Split: Bill A/B appears only once at the top tabs.
7. Mobile landscape Split: no bottom Bill A/B duplicate total cards.
8. Mobile landscape Split: item rows are visible immediately.
9. Mobile landscape Split: at least several cart item rows are visible and scrollable.
10. Tablet: two-zone layout is balanced and compact.
11. Desktop: dialog does not become oversized and keeps project styling.
12. Full and DP remain usable and do not regress.
```

## 16. Report update

Update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Add section:

```txt
## P9.5 Payment Dialog Readable Layout Final Fix
```

Include:

```txt
1. Screenshot problems analyzed
2. Final left-panel/right-panel layout decision
3. Multi method selector relocation
4. Split item assignment visibility fix
5. Split duplicate Bill A/B label removal
6. Responsive behavior: mobile portrait, mobile landscape, tablet, desktop
7. Project styling/color consistency
8. Files changed
9. Tests/manual checks performed
10. Remaining limitations
```

## 17. Acceptance checklist

```txt
- [ ] Left panel is no longer empty after flow tabs.
- [ ] FULL method selector appears in left panel.
- [ ] DP method selector appears in left panel.
- [ ] MULTI method selector appears in left panel as "Metode Baris Berikutnya".
- [ ] MULTI right panel does not render method selector.
- [ ] MULTI add line stores selected multiMethod.
- [ ] MULTI lines display correct method and amount.
- [ ] SPLIT method selector appears in left panel as "Metode Bayar Bill Aktif".
- [ ] SPLIT right panel does not show method selector before item list.
- [ ] SPLIT Bill A/B labels appear only once as top tabs.
- [ ] SPLIT bottom Bill A/B total cards are removed.
- [ ] SPLIT item assignment list is visible immediately.
- [ ] SPLIT item rows are readable: bill badge, name, quantity, amount.
- [ ] SPLIT item list remains scrollable.
- [ ] SPLIT footer/summary does not push item list to zero height.
- [ ] Mobile portrait layout is readable and compact.
- [ ] Mobile landscape layout is readable and compact.
- [ ] Tablet layout is readable and compact.
- [ ] Desktop layout is readable and not oversized.
- [ ] Colors and styling stay consistent with the existing project style.
- [ ] Unimportant/repeated labels are removed.
- [ ] Close button remains reachable.
- [ ] Submit payload contract for FULL/DP/MULTI/SPLIT is unchanged.
- [ ] No provider/card/e-wallet/gateway/NorthFlow code added.
- [ ] No legacy compatibility added.
- [ ] Report updated.
```

## 18. Commit message

```txt
fix(pos): make payment dialog layout readable
```