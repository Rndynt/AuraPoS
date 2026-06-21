# Replit/Codex Prompt P9.7 — Payment Submit Truth + Validation Final Fix

Repository: `Rndynt/AuraPoS`

## 1. Goal

Fix the current POS payment submit failures shown in manual screenshots.

The UI layout is better, but the payment flow is still not honest or reliable:

```txt
1. Split Bill shows "Data pembayaran tidak valid. Periksa input lalu coba lagi."
2. Multi Payment shows local "Terbayar Rp 190.900 · Sisa Rp 0" then backend says "Pembayaran gagal dicatat. Silakan coba lagi."
3. The UI uses wording like "Terbayar" before backend has actually persisted the payment.
4. Split Bill can assign an item and press pay, but the backend rejects the payload.
```

This patch must make payment submit truthful and debuggable:

```txt
- Local lines are only pending input until backend succeeds.
- Backend validation accepts valid Split payloads and rejects invalid ones with a specific user-safe reason.
- Split Bill zero/unassigned bill data must not break submit.
- Multi Payment must not claim paid before server success.
- After backend success, only then show paid/partial result.
```

## 2. Screenshots to understand

### Split screenshot

Current behavior:

```txt
Bill A has Gado-Gado Rp 14.000 assigned.
Bill B is Rp 0.
5 items remain unassigned.
User clicks Bayar Bill A · Rp 14.000.
Toast: Data pembayaran tidak valid. Periksa input lalu coba lagi.
```

Likely cause to verify:

```txt
Frontend sends splits including Bill B with amountDue = 0.
Backend POSPaymentController splitSchema currently requires amountDue positive.
That makes the whole request invalid even though selected Bill A is valid.
```

### Multi screenshot

Current behavior:

```txt
User adds Tunai Rp 50.000 and QRIS Manual Rp 140.900.
Local UI says Terbayar Rp 190.900 · Sisa Rp 0.
User clicks Selesaikan Pembayaran.
Backend fails: Pembayaran gagal dicatat.
```

Problems:

```txt
- UI says "Terbayar" before backend persisted anything.
- If backend fails, cashier sees contradictory state: looks fully paid locally but server rejected it.
- The implementation must distinguish pending input from persisted payment result.
```

## 3. Non-negotiable direction

```txt
- Do not add provider/gateway/card/e-wallet/NorthFlow logic.
- Do not add legacy compatibility aliases.
- Do not hide backend errors behind vague generic text during development.
- Do not show raw SQL/zod/stack trace to cashier.
- Do not claim paid before backend success.
- Do not allow invalid split payload to be sent just because UI has placeholder Bill B.
- Do not make UI responsible for DB persistence rules.
```

Payment methods remain only:

```txt
CASH
MANUAL_TRANSFER
MANUAL_QRIS
```

Payment flows remain only:

```txt
FULL
DOWN_PAYMENT
MULTI_PAYMENT
SPLIT_BILL
```

Payment kinds remain only:

```txt
FULL_PAYMENT
DOWN_PAYMENT
REMAINING_PAYMENT
MULTI_PAYMENT_LINE
SPLIT_BILL_LINE
```

## 4. Inspect before coding

Inspect these files carefully:

```txt
apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
apps/pos-terminal-web/src/features/pos-core/services/__tests__/posPaymentSubmissionService.test.ts
apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts
apps/pos-terminal-web/src/features/pos-flows/restaurant/useRestaurantTableServicePOSFlow.ts
apps/pos-terminal-web/src/lib/api/hooks.ts
apps/api/src/http/controllers/POSPaymentController.ts
packages/application/payments/SubmitPOSPayment.ts
packages/application/payments/POSPaymentCommand.ts
packages/infrastructure/repositories/payments/DrizzleSubmitPOSPaymentRepository.ts
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Run:

```bash
rg -n "amountDue.*positive|splitSchema|VALIDATION_ERROR|Data pembayaran tidak valid|payment\.splits|clientBillId|splitId|orderBillSplitId" apps/api/src packages/application packages/infrastructure apps/pos-terminal-web/src/features/pos-core apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx

rg -n "Terbayar|multiPaid|multiRemaining|Selesaikan Pembayaran|Pembayaran gagal dicatat|messageTitle|shouldClearCart" apps/pos-terminal-web/src
```

## 5. Fix A — Split Bill payload must not be invalid because of empty Bill B

Current suspected issue:

```txt
PaymentMethodDialog always builds splitBills = ["A", "B"].
If only Bill A has items, Bill B amountDue = 0.
POSPaymentController splitSchema requires amountDue positive.
The request is rejected before use case.
```

Required behavior:

```txt
- Paying Bill A must not fail just because Bill B is still empty/unassigned.
- Placeholder/empty bills are UI state, not required DB split rows.
- Backend should validate the selected payable bill, not reject the whole request because a non-selected placeholder bill has 0.
```

Implementation options, choose the cleanest and document it:

### Preferred option

Frontend sends only non-zero split rows for submit:

```txt
- Include selected bill if activeBillTotal > 0.
- Include other bills only if amountDue > 0.
- Do not send placeholder Bill B with amountDue = 0.
```

Example valid Split submit for screenshot:

```ts
payment: {
  flow: "SPLIT_BILL",
  paymentKind: "SPLIT_BILL_LINE",
  targetBillId: "A",
  lines: [
    { method: "CASH", amount: 14000, clientBillId: "A" }
  ],
  splits: [
    { clientBillId: "A", label: "Bill A", splitNo: 1, amountDue: 14000, amountPaid: 0, status: "UNPAID" }
  ]
}
```

### Additional backend safety

Backend may accept `amountDue >= 0` for non-selected splits, but it must still enforce:

```txt
- selected split amountDue must be > 0.
- selected payment amount must equal selected split remaining.
- zero-amount non-selected splits must not be persisted as real bill rows unless there is a clear business reason.
```

Do not weaken selected bill invariant.

## 6. Fix B — Preserve clientBillId correctly through frontend mapper

Current code path must be verified:

```txt
PaymentMethodDialog paymentDetails.lines may contain clientBillId.
posPaymentSubmissionService currently uses line.splitId in some places.
```

Required behavior:

```txt
- `clientBillId` means UI bill id: A, B, C.
- `orderBillSplitId` means real DB UUID split id.
- Do not send client bill id as orderBillSplitId.
- Do not lose clientBillId during mapping.
```

Update types/mappers if needed:

```ts
type POSPaymentLineInput = {
  method: POSPaymentMethod;
  amount: number;
  receivedAmount?: number;
  clientBillId?: string;
  orderBillSplitId?: string;
  referenceNote?: string;
};
```

Backend request line mapping must be:

```ts
{
  method: line.method,
  amount: line.amount,
  receivedAmount: line.receivedAmount,
  referenceNote: line.referenceNote,
  clientBillId: line.clientBillId ?? line.splitId,
  orderBillSplitId: line.orderBillSplitId,
}
```

`splitId: "A"` must not become `orderBillSplitId` because `orderBillSplitId` expects UUID.

## 7. Fix C — Multi Payment local wording must be truthful

Current wording is wrong:

```txt
Terbayar Rp 190.900 · Sisa Rp 0
```

Before backend success, those lines are not paid. They are only entered/pending.

Change local Multi wording to something truthful:

```txt
Dimasukkan Rp 190.900 · Kurang Rp 0
```

or:

```txt
Siap dibayar Rp 190.900 · Sisa input Rp 0
```

After backend success, use server result to show actual paid state:

```txt
Pembayaran berhasil
Order #... dilunasi.
```

Rules:

```txt
- Do not show "Terbayar" for local multiEntries before backend success.
- Do not set UI wording that implies DB persisted payment before server response.
- If backend fails, keep the entered lines visible but clearly say they are not saved.
```

Suggested failure message for Multi:

```txt
Pembayaran belum tersimpan. Periksa data pembayaran lalu coba lagi.
```

## 8. Fix D — Multi submit failure must be diagnosable and specific

Current toast is too generic:

```txt
Pembayaran gagal dicatat. Silakan coba lagi.
```

Required behavior:

```txt
- User-facing message stays safe.
- Developer/report gets exact validation cause.
- API response should include code and structured reason where possible.
- Frontend console/dev log may include sanitized payload and error code, not SQL stack.
```

Check and fix:

```txt
- Is Multi payload using canonical methods CASH/MANUAL_TRANSFER/MANUAL_QRIS?
- Does Multi submit include exactly two lines max?
- Does line total exactly match remaining/order total?
- Does FRESH_CART include valid order payload and order_type_id?
- Does backend reject because idempotency/order already paid after a previous failed UI attempt?
```

If backend did persist payment but frontend still shows failure, fix response parsing/state handling.

If backend rejected correctly, make the error specific enough for cashier:

```txt
Total multi payment harus sama dengan sisa tagihan.
Jumlah pembayaran melebihi sisa tagihan.
Order sudah lunas. Pembayaran baru tidak dapat dicatat.
```

Do not collapse these into one vague message unless the error is unknown.

## 9. Fix E — Success/failure state must not contradict backend

After clicking final submit:

```txt
- Disable confirm button while submitting.
- Do not mutate local UI to "paid" state until server returns success.
- If server success PAID: close/clear/print according to result.shouldClearCart.
- If server success PARTIAL: keep session/order state with remaining amount.
- If server error: keep input lines/assignments but mark as not saved.
```

For Multi failure after local complete:

```txt
- Keep multi entries.
- Show: Pembayaran belum tersimpan.
- Confirm button remains available to retry.
- Do not call it paid.
```

For Split failure:

```txt
- Keep item assignments.
- Show exact user-safe reason.
- Do not reset Bill A assignment.
```

## 10. Tests required

Add/update tests where practical.

```txt
1. Split payload builder excludes zero-amount placeholder Bill B.
2. Split payload builder preserves clientBillId = A for line and split row.
3. Split payload with Bill A 14000 and Bill B 0 builds valid request.
4. POSPaymentController does not reject valid selected Bill A just because other UI bill is zero/unassigned.
5. Backend still rejects selected bill amountDue = 0.
6. Multi local status text does not use "Terbayar" before backend success.
7. Multi submit payload has line methods and amounts exactly as entered.
8. Multi backend validation errors map to specific user-safe messages when possible.
9. On submit error, Multi entries remain available for retry.
10. On submit error, Split assignments remain available for retry.
```

## 11. Manual verification checklist

Use the running app and verify:

```txt
1. Add 6 items.
2. Open Split.
3. Assign one item Rp 14.000 to Bill A; leave Bill B empty.
4. Click Bayar Bill A.
   Expected: no "Data pembayaran tidak valid".
5. Backend either saves Bill A payment or returns specific business error.
6. Add Multi payment: CASH 50.000 + QRIS 140.900.
7. Before submit, UI must not say "Terbayar"; it must say pending/input wording.
8. Click Selesaikan Pembayaran.
   Expected: if backend succeeds, success state comes from backend.
   If backend fails, lines stay and message says not saved.
9. No SQL/zod/parser/internal text appears in cashier toast.
```

## 12. Report update

Update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Add section:

```txt
## P9.7 Payment Submit Truth + Validation Final Fix
```

Include:

```txt
1. Screenshot problems analyzed.
2. Split zero-placeholder Bill B root cause.
3. Split payload/clientBillId fix.
4. Multi local "Terbayar" wording fix.
5. Multi submit failure root cause and fix.
6. Files changed.
7. Tests/manual checks.
8. Remaining limitations.
```

## 13. Acceptance checklist

```txt
- [ ] Split Bill A submit works even when Bill B is empty/zero.
- [ ] Frontend does not send zero-amount placeholder bills unless backend explicitly supports them.
- [ ] Backend does not reject valid selected Bill A because of empty non-selected bill.
- [ ] Backend still rejects selected bill with zero amount.
- [ ] clientBillId and orderBillSplitId are not mixed.
- [ ] Multi local status does not say "Terbayar" before backend success.
- [ ] Multi submit success/failure state comes from backend response.
- [ ] Multi failure keeps entered lines for retry.
- [ ] Split failure keeps item assignments for retry.
- [ ] Cashier sees specific safe error where possible.
- [ ] No SQL/zod/parser/internal error appears in toast.
- [ ] No provider/card/e-wallet/gateway/NorthFlow logic added.
- [ ] No legacy compatibility added.
- [ ] Report updated.
```

## 14. Commit message

```txt
fix(pos): correct payment submit validation and pending state
```
