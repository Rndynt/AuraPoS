# P9.4 Payment UX Finalization Report

Date: 2026-06-22

Source prompt: `roadmap/business-flows/replit_codex_P9_4_v2_payment_ux_and_paid_data_contract_prompt.md`

## 1. Summary

P9.4 finalizes the cashier-facing POS payment dialog and documents the final PAID database row contract for built-in POS payment flows.

This report is created as the dedicated P9.4 report file required by the prompt. The previous implementation appended the P9.4 section into `roadmap/business-flows/P9_3_backend_submit_pos_payment_report.md`; that made the content available, but the report path did not match the prompt. This file fixes the report path without changing runtime code.

## 2. Problems fixed by P9.4 implementation

- Multi Payment previously had confusing duplicated method selection behavior.
- Multi Payment line storage uses `multiMethod`, so the selector for a new line must also write to `multiMethod` instead of the global `method` state.
- Split Bill item assignment layout could be clipped on smaller portrait/landscape screens.
- Split Bill payload needed to keep selected bill identity clear through `targetBillId` and `clientBillId`.
- Stale `order_type_id` could produce raw foreign-key errors in cashier flow.
- The final PAID database shape for FULL, DP, MULTI, and SPLIT needed to be explicit and readable.

## 3. Files inspected before coding

- `apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx`
- `apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts`
- `apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts`
- `apps/pos-terminal-web/src/features/pos-flows/restaurant/useRestaurantTableServicePOSFlow.ts`
- `apps/pos-terminal-web/src/features/pos-flows/shared/orderTypeGuard.ts`
- `apps/pos-terminal-web/src/lib/api/hooks.ts`
- `apps/api/src/http/controllers/POSPaymentController.ts`
- `apps/api/src/http/controllers/OrdersController.ts`
- `packages/application/payments/SubmitPOSPayment.ts`
- `packages/infrastructure/repositories/payments/DrizzleSubmitPOSPaymentRepository.ts`
- `packages/infrastructure/repositories/payments/DrizzlePOSPaymentOrderTypeRepository.ts`
- `packages/infrastructure/db/schema/orders.schema.ts`
- `roadmap/business-flows/P9_3_backend_submit_pos_payment_report.md`

## 4. Final Full Payment UI flow

Cashier opens Payment, chooses **Bayar Penuh**, selects exactly one method, then confirms.

Expected behavior:

- CASH shows received amount, numpad, and change preview.
- MANUAL_TRANSFER and MANUAL_QRIS show manual confirmation info.
- Submit goes through `POST /api/pos/payments/submit`.
- If paid, backend returns `shouldClearCart = true`; UI can close payment session and clear cart.

## 5. Final DP UI flow

Cashier opens Payment, chooses **DP**, selects exactly one method, enters DP amount, then confirms.

Expected behavior:

- DP amount must be greater than zero and below total for first DP.
- UI shows remaining amount preview.
- Submit goes through `POST /api/pos/payments/submit`.
- If result is PARTIAL, cart/session must remain available.
- Final settlement uses `REMAINING_PAYMENT` when the remaining balance is paid.

## 6. Final Multi Payment UI flow

Cashier opens Payment, chooses **Multi**, then adds payment lines until the remaining amount is zero.

Expected behavior:

- Multi tab shows no global method selector.
- Multi tab shows one method selector only for the next line.
- That selector writes to `multiMethod / setMultiMethod`.
- Each added line stores the selected line method and amount.
- Final confirm appears only when the sum of lines equals the total/remaining bill.

Example:

```txt
Line 1: CASH 100000
Line 2: MANUAL_QRIS 90900
Total: 190900
```

## 7. Final Split Bill UI flow

Cashier opens Payment, chooses **Split**, selects the active bill, assigns items, then pays the selected bill.

Expected behavior:

- Split tab shows bill tabs.
- Item assignment list is scrollable and not hidden by footer.
- Split tab shows one method selector only for selected bill payment.
- Confirm button says which bill is being paid, for example `Bayar Bill A · Rp 15.000`.
- Payment request includes `targetBillId`, line `clientBillId`, and split metadata.
- Backend persists real split rows and ties selected bill payment to a real `split_id` when available.

## 8. Method selector duplication fix

Correct state ownership:

```txt
FULL  -> method / setMethod
DP    -> method / setMethod
MULTI -> multiMethod / setMultiMethod
SPLIT -> method / setMethod for selected bill payment
```

Multi must not use global `method` for the next line. Multi line data must come from `multiEntries`, and each entry must preserve the method selected when that line was added.

## 9. Mobile portrait/landscape layout fix

Expected layout rules:

- Dialog uses dynamic viewport height such as `92dvh`.
- Dialog width is mobile-friendly.
- Split content uses flex layout with `min-h-0`.
- Split item list uses `overflow-y-auto`.
- Footer/confirm button does not cover item rows.
- Close button remains reachable.

## 10. Stale order_type_id frontend guard

A shared order type guard resolves the current selection against active order types.

Expected behavior:

- If selected order type is still active, keep it.
- If selected order type is stale, replace it with the first active order type.
- If no active order type exists, block payment/save/kitchen action with readable Indonesian error.

User-readable error:

```txt
Tipe pesanan belum tersedia. Muat ulang POS atau aktifkan tipe pesanan terlebih dahulu.
```

## 11. Backend order_type_id guard

All user-facing order creation/payment paths that accept `order_type_id` must validate it before insert or map invalid database errors to user-safe errors.

User-readable invalid order type error:

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

## 12. User-safe error mapping

Cashier-facing errors must stay readable:

- Invalid or missing order type uses Indonesian order type message.
- Split selected bill mismatch uses: `Jumlah pembayaran harus sama dengan sisa bill yang dipilih.`
- Already-paid bill uses: `Bill yang dipilih sudah lunas.`
- Generic payment failure uses: `Pembayaran gagal dicatat. Silakan coba lagi.`

Raw SQL, FK, enum, zod, stack trace, and internal error strings must not be shown in the cashier UI.

## 13. Final PAID database row contract

Common invariant for every fully paid order:

```txt
orders.total = total bill
orders.paid_amount = orders.total
orders.payment_status = paid
successful order_payments rows have status = succeeded
orders.paid_amount must never exceed orders.total
```

## 14. FULL final paid row example

Business case:

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

- Exactly one payment row.
- `payment_flow = FULL`.
- `payment_kind = FULL_PAYMENT`.
- `split_id = null`.

## 15. DP final paid row example

Business case:

```txt
Total: 190900
DP: 50000 via MANUAL_TRANSFER
Remaining: 140900 via CASH
```

Expected `orders` after final payment:

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

- DP paid in separate steps has a `DOWN_PAYMENT` row and a `REMAINING_PAYMENT` row.
- Both rows use `payment_flow = DOWN_PAYMENT`.
- `split_id = null`.
- Sum of successful payment rows equals `orders.total`.

## 16. MULTI final paid row example

Business case:

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

- One row per Multi line.
- Every row uses `payment_flow = MULTI_PAYMENT`.
- Every row uses `payment_kind = MULTI_PAYMENT_LINE`.
- `payment_method` matches the selected method for that exact line.
- `sequence` follows line order.
- `split_id = null`.
- Sum of successful payment rows equals `orders.total`.

## 17. SPLIT final paid row example

Business case:

```txt
Total: 190900
Bill A: 90000 paid by CASH
Bill B: 100900 paid by MANUAL_QRIS
```

Expected `orders` after all bills are paid:

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

- Every paid bill has `amount_paid = amount_due`.
- Every paid bill has `status = paid`.
- Every split payment row uses `payment_flow = SPLIT_BILL`.
- Every split payment row uses `payment_kind = SPLIT_BILL_LINE`.
- Every split payment row has real `split_id`.
- No selected bill payment row may have `split_id = null`.
- Sum of `order_bill_splits.amount_paid` equals `orders.paid_amount` when all paid.
- Sum of successful `order_payments.amount` equals `orders.paid_amount`.

## 18. Forbidden ambiguous rows

These rows are not allowed:

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

## 19. Files changed in P9.4 implementation

- `apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx`
- `apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts`
- `apps/pos-terminal-web/src/features/pos-flows/restaurant/useRestaurantTableServicePOSFlow.ts`
- `apps/pos-terminal-web/src/features/pos-flows/shared/orderTypeGuard.ts`
- `apps/pos-terminal-web/src/features/pos-flows/shared/__tests__/orderTypeGuard.test.ts`
- `apps/pos-terminal-web/package.json`
- `apps/api/src/http/controllers/OrdersController.ts`
- `roadmap/business-flows/P9_3_backend_submit_pos_payment_report.md`
- `roadmap/business-flows/P9_4_payment_ux_finalization_report.md`

## 20. Tests added/updated

Current P9.4 implementation includes a focused order type guard test:

```txt
apps/pos-terminal-web/src/features/pos-flows/shared/__tests__/orderTypeGuard.test.ts
```

Per project decision, full browser/UI rendering tests and full live DB final-row integration tests are deferred. The final row contract is documented here so the next test phase can verify it directly.

## 21. Validation output

This patch is a report-path correction. Runtime validation was already reported in the appended P9.4 section of `P9_3_backend_submit_pos_payment_report.md`.

Previously reported validation status:

- POS terminal type-check passed.
- POS terminal tests passed.
- Backend/application validation remained covered by P9.3/P9.3.2 checks.

No new runtime code was changed by this report-path correction.

## 22. Manual verification checklist output

Manual verification is deferred to the next app testing pass.

Checklist to run:

```txt
1. Multi tab shows only one method selector.
2. Multi choose Transfer Manual, input amount, add line -> line shows Transfer Manual.
3. Multi second line completes remaining amount -> final confirm appears.
4. Split with many items -> item list visible and scrollable.
5. Split pay Bill A -> no raw FK error; readable partial/paid result.
6. Split all bills paid -> DB/report shows split rows paid and payment rows have real split_id.
7. stale order_type_id -> readable error, never raw FK text.
8. portrait mobile -> modal fits and controls reachable.
9. landscape mobile -> modal fits and item list not clipped.
```

## 23. Remaining limitations

- Full browser rendering tests for duplicated selector count and scroll reachability are not present yet.
- Full live DB integration tests for the final row shapes are not present yet.
- This file fixes the required report path. It does not change runtime behavior.
