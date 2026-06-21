# Replit/Codex Prompt P9.4 v2 — Payment UX Finalization + Final PAID Data Contract

Repository: `Rndynt/AuraPoS`

## 1. Purpose

Finish the POS payment flow from cashier UI to database rows.

This is not about adding complexity. The goal is:

```txt
- cashier flow is simple
- developer code is readable
- UI has no duplicated controls
- payment submit has one clear path
- database rows are predictable
- errors are user-readable
- no legacy compatibility branch
- no provider/card/e-wallet/gateway logic
```

Final flow:

```txt
Cart → Payment Dialog → Full / DP / Multi / Split → SubmitPOSPayment → expected DB rows → readable result/error
```

## 2. Problems to solve

```txt
1. Multi tab shows duplicated payment method selectors.
2. Multi uses confusing global method vs multi-line method state.
3. Split item list can be hidden/cut off on mobile.
4. Payment dialog is cramped in portrait/landscape mobile.
5. Cashier can see raw order_type_id FK error.
6. Final PAID database row shape is not explicit enough in the prompt/report.
```

## 3. Non-negotiable rules

```txt
- Do not add provider/gateway/card/e-wallet/Midtrans/Xendit/NorthFlow logic.
- Do not add old alias compatibility.
- Do not normalize old payment flow strings.
- Do not keep duplicated method selectors.
- Do not bypass SubmitPOSPayment for payment submission.
- Do not put businessProfile inside payment domain/application.
- Do not expose SQL/FK/zod/enum/internal errors to cashier.
- Do not submit stale order_type_id.
- Do not add abstractions unless they make ownership simpler.
```

Allowed payment methods:

```txt
CASH
MANUAL_TRANSFER
MANUAL_QRIS
```

Allowed payment flows:

```txt
FULL
DOWN_PAYMENT
MULTI_PAYMENT
SPLIT_BILL
```

Allowed payment kinds:

```txt
FULL_PAYMENT
DOWN_PAYMENT
REMAINING_PAYMENT
MULTI_PAYMENT_LINE
SPLIT_BILL_LINE
```

## 4. Clean architecture responsibility

```txt
UI component:
- render dialog
- keep local UI state
- emit canonical payment intent
- never know DB persistence details

Frontend service/client:
- map UI state to SubmitPOSPayment request
- call POST /api/pos/payments/submit
- map errors to user-readable messages
- never create order/payment rows manually

Application layer:
- validate canonical command
- use ports
- no React import
- no Drizzle import
- no businessProfile dependency

Infrastructure layer:
- DB transaction
- order create/reuse
- payment row insert
- split row persistence
- idempotency
- update order totals
```

## 5. Inspect before coding

Inspect:

```txt
apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts
apps/pos-terminal-web/src/features/pos-flows/restaurant/useRestaurantTableServicePOSFlow.ts
apps/pos-terminal-web/src/lib/api/hooks.ts
apps/api/src/http/controllers/POSPaymentController.ts
apps/api/src/http/controllers/OrdersController.ts
packages/application/orders/CreateOrder.ts
packages/application/orders/CreateAndPayOrder.ts
packages/application/payments/SubmitPOSPayment.ts
packages/infrastructure/repositories/orders/OrderRepository.ts
packages/infrastructure/repositories/orders/DrizzleCreateAndPayOrderRepository.ts
packages/infrastructure/repositories/payments/DrizzleSubmitPOSPaymentRepository.ts
packages/infrastructure/repositories/payments/DrizzlePOSPaymentOrderTypeRepository.ts
packages/infrastructure/db/schema/orders.schema.ts
roadmap/business-flows/P9_3_backend_submit_pos_payment_report.md
```

Run:

```bash
rg -n "METHODS|MethodButtons|multiMethod|setMultiMethod|MULTI_PAYMENT|SPLIT_BILL|DialogContent|overflow-y-auto|maxHeight" apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
rg -n "order_type_id|selectedOrderTypeId|activeOrderTypes|setSelectedOrderTypeId|orderTypes" apps/pos-terminal-web/src/features/pos-flows apps/pos-terminal-web/src/hooks apps/pos-terminal-web/src/lib/api
rg -n "orders_order_type_id_order_types_id_fk|foreign key constraint|Failed to create order|violates foreign key|invalid_enum_value|Expected.*FULL" apps packages
rg -n "createOrderMutation\.mutateAsync|recordPaymentMutation\.mutateAsync|createAndPay|SubmitPOSPayment|/api/pos/payments/submit" apps packages
```

## 6. Fix PaymentMethodDialog UX

Update:

```txt
apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
```

UI structure:

```txt
Header: Pembayaran, total, close button
Tabs: Bayar Penuh, DP, Multi, Split
Content: only active flow controls
Footer: one confirm action
```

Method selector rule:

```txt
FULL:
- one method selector
- CASH shows received amount/numpad/change
- transfer/qris shows manual confirmation info

DP:
- one method selector
- amount input/numpad
- remaining preview

MULTI:
- no global method selector
- show existing lines
- one method selector only for the next line
- this selector writes to multiMethod/setMultiMethod
- amount input/numpad for next line
- add button label follows selected multiMethod
- final confirm appears only when remaining is zero

SPLIT:
- no global method selector
- bill tabs
- scrollable item assignment list
- bill totals
- one method selector for selected bill payment
- one confirm button: Bayar Bill A · Rp X
```

Correct state mapping:

```txt
FULL → method/setMethod
DP → method/setMethod
MULTI → multiMethod/setMultiMethod
SPLIT → method/setMethod for selected bill payment
```

Do not clear split item assignments just because cashier changes method.

## 7. Fix responsive layout

Required:

```txt
- use dynamic viewport max height, e.g. 92dvh
- mobile portrait width roughly min(94vw, 520px)
- landscape may use two columns but must fit vertically
- flex parents for scroll areas must use min-h-0
- split item list must be flex-1 overflow-y-auto
- footer/confirm button must not cover rows
- close button must always be reachable
```

## 8. Fix order_type_id guard

Frontend:

```txt
- verify selectedOrderTypeId exists in activeOrderTypes after order types load
- if missing/stale, use first active order type
- if none exists, block action with readable error
- before save draft, send to kitchen, or payment submit, call ensureValidOrderType()
- use returned validId in payload; do not rely on async state update
```

Readable frontend error:

```txt
Tipe pesanan belum tersedia. Muat ulang POS atau aktifkan tipe pesanan terlebih dahulu.
```

Backend must protect:

```txt
CreateOrder
CreateAndPayOrder
SubmitPOSPayment
any controller path accepting order_type_id
```

Invalid order type response:

```txt
Tipe pesanan tidak valid atau belum aktif untuk tenant ini. Muat ulang POS lalu coba lagi.
```

Forbidden cashier-facing text:

```txt
orders_order_type_id_order_types_id_fk
foreign key constraint
violates foreign key
Failed to create order: insert or update
invalid_enum_value
Expected 'FULL'
ZodError
```

## 9. Clean emitted payment details

Multi emit example:

```ts
payment: {
  flow: "MULTI_PAYMENT",
  paymentKind: "MULTI_PAYMENT_LINE",
  lines: [
    { method: "CASH", amount: 100000 },
    { method: "MANUAL_QRIS", amount: 90900 },
  ],
}
```

Rules:

```txt
- lines come from multiEntries only
- each line method is the method selected for that line
- global method must not affect Multi rows
- sum of lines equals total/remaining
```

Split emit example:

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
    { clientBillId: "B", label: "Bill B", splitNo: 2, amountDue: 19500, amountPaid: 0, status: "UNPAID" },
  ],
}
```

Rules:

```txt
- targetBillId matches selected bill
- line clientBillId/splitId matches selected bill
- splits include all bills
- backend must not trust request amountPaid as DB truth for new split
```

## 10. Final PAID database row contract

This is mandatory. The report/tests must prove this shape.

Common final rule:

```txt
orders.total = total bill
orders.paid_amount = orders.total
orders.payment_status = paid
successful order_payments rows have status = succeeded
```

### FULL final PAID

Example:

```txt
Total: 190900
Cash received: 200000
Change: 9100
```

Expected `orders`:

```txt
id: order-full-001
total: 190900
paid_amount: 190900
payment_status: paid
```

Expected `order_payments`:

```txt
row 1:
order_id: order-full-001
payment_flow: FULL
payment_kind: FULL_PAYMENT
payment_method: CASH
amount: 190900
received_amount: 200000
change_amount: 9100
sequence: 1
split_id: null
status: succeeded
```

Acceptance:

```txt
- exactly 1 payment row
- payment_flow FULL
- payment_kind FULL_PAYMENT
- split_id null
```

### DP final PAID

Example:

```txt
Total: 190900
DP: 50000 via MANUAL_TRANSFER
Remaining: 140900 via CASH
```

Expected `orders`:

```txt
id: order-dp-001
total: 190900
paid_amount: 190900
payment_status: paid
```

Expected `order_payments`:

```txt
row 1:
order_id: order-dp-001
payment_flow: DOWN_PAYMENT
payment_kind: DOWN_PAYMENT
payment_method: MANUAL_TRANSFER
amount: 50000
sequence: 1
split_id: null
status: succeeded

row 2:
order_id: order-dp-001
payment_flow: DOWN_PAYMENT
payment_kind: REMAINING_PAYMENT
payment_method: CASH
amount: 140900
received_amount: 140900
change_amount: 0
sequence: 2
split_id: null
status: succeeded
```

Acceptance:

```txt
- DP paid in separate steps has DOWN_PAYMENT row and REMAINING_PAYMENT row
- both rows use payment_flow DOWN_PAYMENT
- split_id null
- sum successful payments equals orders.total
```

### MULTI_PAYMENT final PAID

Example:

```txt
Total: 190900
Line 1: CASH 100000
Line 2: MANUAL_QRIS 90900
```

Expected `orders`:

```txt
id: order-multi-001
total: 190900
paid_amount: 190900
payment_status: paid
```

Expected `order_payments`:

```txt
row 1:
order_id: order-multi-001
payment_flow: MULTI_PAYMENT
payment_kind: MULTI_PAYMENT_LINE
payment_method: CASH
amount: 100000
sequence: 1
split_id: null
status: succeeded

row 2:
order_id: order-multi-001
payment_flow: MULTI_PAYMENT
payment_kind: MULTI_PAYMENT_LINE
payment_method: MANUAL_QRIS
amount: 90900
sequence: 2
split_id: null
status: succeeded
```

Acceptance:

```txt
- one row per Multi line
- each row uses payment_flow MULTI_PAYMENT
- each row uses payment_kind MULTI_PAYMENT_LINE
- payment_method matches that specific line selection
- sequence follows line order
- split_id null
- sum rows equals orders.total
```

### SPLIT_BILL final PAID

Example:

```txt
Total: 190900
Bill A: 90000 paid by CASH
Bill B: 100900 paid by MANUAL_QRIS
```

Expected `orders`:

```txt
id: order-split-001
total: 190900
paid_amount: 190900
payment_status: paid
```

Expected `order_bill_splits`:

```txt
row Bill A:
id: split-a-db-id
order_id: order-split-001
split_no: 1
split_label: Bill A
client_bill_id: A
amount_due: 90000
amount_paid: 90000
status: paid

row Bill B:
id: split-b-db-id
order_id: order-split-001
split_no: 2
split_label: Bill B
client_bill_id: B
amount_due: 100900
amount_paid: 100900
status: paid
```

Expected `order_payments`:

```txt
row 1:
order_id: order-split-001
payment_flow: SPLIT_BILL
payment_kind: SPLIT_BILL_LINE
payment_method: CASH
amount: 90000
sequence: 1
split_id: split-a-db-id
status: succeeded

row 2:
order_id: order-split-001
payment_flow: SPLIT_BILL
payment_kind: SPLIT_BILL_LINE
payment_method: MANUAL_QRIS
amount: 100900
sequence: 1 or deterministic next sequence documented by implementation
split_id: split-b-db-id
status: succeeded
```

Acceptance:

```txt
- every paid bill has amount_paid = amount_due
- every paid bill has status paid
- every split payment row uses payment_flow SPLIT_BILL
- every split payment row uses payment_kind SPLIT_BILL_LINE
- every split payment row has real split_id
- no selected bill payment row has split_id null
- sum order_bill_splits.amount_paid equals orders.paid_amount when all paid
- sum successful order_payments.amount equals orders.paid_amount
```

Forbidden ambiguous rows:

```txt
payment_flow FULL with payment_kind MULTI_PAYMENT_LINE
payment_flow FULL with split_id not null
payment_flow MULTI_PAYMENT with split_id not null
payment_flow SPLIT_BILL with split_id null for selected bill payment
payment_flow DOWN_PAYMENT with split_id not null
payment_kind DOWN_PAYMENT for final remaining payment
orders.payment_status paid while paid_amount < total
orders.payment_status partial while paid_amount = total
orders.paid_amount > orders.total
```

## 11. Tests required

Add/update tests for:

```txt
1. Multi renders only one method selector.
2. Multi selected method updates multiMethod and stored line method.
3. Multi add button label follows multiMethod.
4. Split renders one method selector and one confirm button.
5. Split item list is scrollable/reachable.
6. stale selectedOrderTypeId is replaced before payload build.
7. no active order type blocks action with readable error.
8. order_type_id/FK error maps to readable Indonesian message.
9. FULL final paid DB shape verified/documented.
10. DP final paid DB shape verified/documented.
11. MULTI final paid DB shape verified/documented.
12. SPLIT final paid DB shape verified/documented.
```

If full DB integration tests are not practical, add the closest repository/service tests and include explicit final row examples in the report. Do not omit the final data contract.

## 12. Manual verification checklist

```txt
1. Multi tab shows only one method selector.
2. Multi choose Transfer Manual, input amount, add line → line shows Transfer Manual.
3. Multi second line completes remaining amount → final confirm appears.
4. Split with many items → item list visible and scrollable.
5. Split pay Bill A → no raw FK error; readable partial/paid result.
6. Split all bills paid → DB/report shows split rows paid and payment rows have real split_id.
7. stale order_type_id → readable error, never raw FK text.
8. portrait mobile → modal fits and controls reachable.
9. landscape mobile → modal fits and item list not clipped.
```

## 13. Validation commands

```bash
pnpm --filter @pos/domain type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/application test
pnpm --filter @pos/api type-check
pnpm --filter @pos/api test
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/terminal-web test
pnpm type-check
```

Grep checks:

```bash
rg -n "orders_order_type_id_order_types_id_fk|foreign key constraint|violates foreign key|Failed to create order: insert or update|invalid_enum_value|Expected.*FULL|ZodError" apps/pos-terminal-web/src apps/api/src packages
rg -n "<MethodButtons|MethodSelector|multiMethod|setMultiMethod|flow !== \"SPLIT_BILL\"" apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
rg -n "createOrderMutation\.mutateAsync|recordPaymentMutation\.mutateAsync|createAndPay|recordPayment\(" apps/pos-terminal-web/src/features/pos-flows apps/pos-terminal-web/src/features/pos-core apps/pos-terminal-web/src/lib
rg -n "payment_flow|payment_kind|MULTI_PAYMENT_LINE|SPLIT_BILL_LINE|REMAINING_PAYMENT|split_id|payment_status|paid_amount" packages apps/api/src apps/pos-terminal-web/src
```

Expected:

```txt
- no user-facing raw technical error strings except tests proving mapping
- Multi uses multiMethod/setMultiMethod
- payment submit still goes through SubmitPOSPayment
- final paid data contract is explicit in code/tests/report
```

## 14. Required report

Create/update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Report must include:

```txt
1. Summary
2. Problems fixed
3. Files inspected before coding
4. Full Payment final UI flow
5. DP final UI flow
6. Multi Payment final UI flow
7. Split Bill final UI flow
8. Method selector duplication fix
9. Mobile portrait/landscape layout fix
10. Stale order_type_id guard
11. Backend order_type_id guard
12. User-safe error mapping
13. Final PAID database row contract
14. FULL final paid row example
15. DP final paid row example
16. MULTI final paid row example
17. SPLIT final paid row example
18. Files changed
19. Tests added/updated
20. Validation output
21. Manual verification output
22. Remaining limitations, if any
```

## 15. Acceptance checklist

```txt
- [ ] Multi tab shows no duplicated payment method selector.
- [ ] Multi line method uses multiMethod/setMultiMethod.
- [ ] Multi add button label matches selected next-line method.
- [ ] Full and DP show one method selector only.
- [ ] Split shows one method selector only.
- [ ] Split item list is visible and scrollable on mobile portrait.
- [ ] Split item list is visible and scrollable on mobile landscape.
- [ ] Split footer/confirm button does not cover item rows.
- [ ] Payment dialog close button is reachable.
- [ ] Flow tabs remain readable.
- [ ] Frontend prevents stale selectedOrderTypeId from being submitted.
- [ ] No active order type blocks payment/save/kitchen with readable error.
- [ ] All order create/payment paths validate order_type_id or map invalid FK safely.
- [ ] Cashier never sees raw FK/order_type_id error.
- [ ] Payment submit still uses POST /api/pos/payments/submit.
- [ ] FULL final paid database shape is verified/documented.
- [ ] DP final paid database shape is verified/documented.
- [ ] MULTI final paid database shape is verified/documented.
- [ ] SPLIT final paid database shape is verified/documented.
- [ ] No ambiguous payment_flow/payment_kind combinations remain.
- [ ] No provider/card/e-wallet/gateway logic added.
- [ ] No old payment alias compatibility added.
- [ ] Report created.
- [ ] Type-check/tests pass or unrelated failures are documented.
```

## 16. Commit message

```txt
fix(pos): finalize payment ux and paid data contract
```