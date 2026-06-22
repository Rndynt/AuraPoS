# Replit/Codex Prompt P9.8 — POS Order Type SOT + Payment Failure Root Fix

Repository: `Rndynt/AuraPoS`

## 1. Goal

Stop treating missing order type and payment submit failure as cashier problems.

The application must be usable. A cashier should not be blocked by internal setup rows, and a payment submit should not fail with generic text after the UI already says the amount is ready.

This patch must solve the root cause from two current screenshots:

```txt
1. POS page shows:
   "Tipe pesanan belum tersedia. Sistem mencoba mengaktifkan default secara otomatis — coba muat ulang halaman (F5). Jika masih gagal, hubungi administrator."

2. Multi/Split payment still shows:
   "Pembayaran gagal dicatat. Silakan coba lagi."
```

The expected result:

```txt
- Existing/dev tenants can order without manual order type setup.
- Order type defaults come from the project SOT/business-type template, not from cashier action.
- Missing tenant_order_types is repaired automatically by backend/app setup, not by telling the user to set it manually.
- Payment submit failures return the exact safe reason, not a generic dead-end.
- Multi/Split submit works end-to-end or explains a real business validation problem.
```

## 2. Current product problem

### 2.1 Missing order type is not a cashier problem

The cashier did not create the tenant. The cashier should not understand or manage `tenant_order_types`.

If POS needs order types, the system must guarantee them from SOT during:

```txt
- tenant registration
- app bootstrap
- POS order type endpoint read
- existing/dev tenant repair
```

Do not tell cashier to manually activate order types during normal POS use.

### 2.2 Payment failure is not debuggable

Generic toast:

```txt
Pembayaran gagal dicatat. Silakan coba lagi.
```

is not enough when development is still active. The app needs:

```txt
- specific safe user message
- structured error code
- server log with request summary and mapped root cause
- frontend console/dev diagnostics without exposing SQL/stack to cashier
```

## 3. Non-negotiable direction

```txt
- Do not add provider/gateway/card/e-wallet/NorthFlow logic.
- Do not add legacy compatibility aliases.
- Do not ask cashier to configure order types.
- Do not leave existing tenants broken just because registration baseline was missing.
- Do not show raw SQL/zod/stack/UUID/parser errors to cashier.
- Do not keep generic "Pembayaran gagal dicatat" when a known validation cause exists.
- Do not silently swallow backend errors.
- Do not break the P9.5 layout/payload contract.
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

## 4. Source of truth requirements

The project already documents that registration should create enabled `tenant_order_types` rows from the business type template.

Use the existing project SOT/template instead of inventing independent defaults.

Inspect:

```txt
docs/BUSINESS_TYPE_TEMPLATES.md
packages/application/entitlements/entitlementCatalog.ts
registration/onboarding code that creates tenant baseline
order type seed files/migrations
```

Required behavior:

```txt
- If tenant business type is CAFE_RESTAURANT, defaults should include DINE_IN, TAKE_AWAY, DELIVERY.
- If tenant business type is RETAIL_MINIMARKET, defaults should include WALK_IN.
- If business type is LAUNDRY, defaults should include WALK_IN and DELIVERY.
- If business type is unknown/missing during dev, choose the safest POS fallback: TAKE_AWAY or WALK_IN, based on available master order types.
- Do not hardcode random UUIDs.
- Do not create duplicate master order types.
- Do not create duplicate tenant_order_types rows.
```

If a true SOT file for business templates already exists in code, use that. If only documentation exists, create a small explicit application-level SOT module for order type defaults, for example:

```txt
packages/application/orders/orderTypeDefaults.ts
```

This module should be readable and boring:

```ts
export const DEFAULT_ORDER_TYPES_BY_BUSINESS_TYPE = {
  CAFE_RESTAURANT: ["DINE_IN", "TAKE_AWAY", "DELIVERY"],
  RETAIL_MINIMARKET: ["WALK_IN"],
  LAUNDRY: ["WALK_IN", "DELIVERY"],
  SERVICE_APPOINTMENT: ["WALK_IN"],
  DIGITAL_PPOB: ["WALK_IN"],
} as const;
```

Only use codes that exist in seeded master `order_types`.

## 5. Inspect before coding

Inspect these files first:

```txt
docs/BUSINESS_TYPE_TEMPLATES.md
packages/application/entitlements/entitlementCatalog.ts
packages/infrastructure/repositories/orders/OrderTypeRepository.ts
apps/api/src/http/controllers/OrderTypesController.ts
apps/api/src/http/controllers/OrdersController.ts
apps/api/src/http/controllers/POSPaymentController.ts
apps/api/src/http/routes/orders.ts
apps/api/src/http/routes/index.ts
packages/infrastructure/repositories/payments/DrizzleSubmitPOSPaymentRepository.ts
packages/infrastructure/repositories/payments/DrizzlePOSPaymentOrderTypeRepository.ts
apps/pos-terminal-web/src/features/pos-flows/shared/orderTypeGuard.ts
apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
apps/pos-terminal-web/src/lib/api/hooks.ts
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Run:

```bash
rg -n "business_type|businessType|tenant.*business|tenant_order_types|tenantOrderTypes|orderTypes|findByTenant|enableForTenant|WALK_IN|DINE_IN|TAKE_AWAY|DELIVERY" apps packages migrations docs

rg -n "Pembayaran gagal dicatat|PAYMENT_ERROR|mapToUserSafeError|VALIDATION_ERROR|Data pembayaran tidak valid|Total multi payment|Jumlah pembayaran|Order sudah lunas|Bill yang dipilih" apps packages

rg -n "submitPOSPayment|buildSubmitPOSPaymentRequest|paymentDetails|MULTI_PAYMENT|SPLIT_BILL|clientBillId|orderBillSplitId|splitId" apps packages
```

## 6. Fix A — Backend order type SOT repair for existing tenants

Implement a single backend path that guarantees usable order types for POS.

Preferred place:

```txt
packages/infrastructure/repositories/orders/OrderTypeRepository.ts
```

Add a method similar to:

```ts
findOrBootstrapForTenant(tenantId: string, businessType?: string | null): Promise<OrderType[]>
```

Required algorithm:

```txt
1. Query active enabled order types for tenant.
2. If any exist, return them.
3. If none exist:
   a. Resolve tenant business type.
   b. Resolve default order type codes from SOT/template.
   c. Query master order_types by those codes and active=true.
   d. If no matching master defaults exist, fallback to first active master order type only for dev safety.
   e. Insert/enable tenant_order_types rows idempotently.
   f. Re-query and return active enabled order types.
4. If still none exist, return a structured setup error, not raw empty array dead-end.
```

Idempotency requirements:

```txt
- Existing disabled tenant_order_types rows should be re-enabled.
- Existing enabled rows should remain unchanged.
- Missing rows should be inserted.
- No duplicates for same tenantId + orderTypeId.
```

Do not put this logic in frontend.

## 7. Fix B — Order type API must self-heal

Update the endpoint used by frontend order types:

```txt
GET /api/orders/order-types or equivalent
```

Required behavior:

```txt
- It calls findOrBootstrapForTenant, not findByTenant only.
- It returns active order types after bootstrap.
- It returns JSON only.
- It includes enough metadata for debugging if bootstrap failed, but not SQL internals.
```

Example response on success:

```json
{
  "success": true,
  "data": {
    "orderTypes": [
      { "id": "...", "code": "TAKE_AWAY", "name": "Take Away" }
    ],
    "bootstrapped": true
  }
}
```

Keep frontend mapper compatibility if it expects only an array/data shape.

## 8. Fix C — Frontend order type guard must not dead-end user

Frontend should become a safety net, not the main repair mechanism.

Update:

```txt
apps/pos-terminal-web/src/features/pos-flows/shared/orderTypeGuard.ts
apps/pos-terminal-web/src/lib/api/hooks.ts
```

Required behavior:

```txt
- If activeOrderTypes is empty, trigger refetch once if available.
- Message should say the system is preparing POS setup, not that user must configure it.
- If still empty after refetch/bootstrap, block action with owner/admin-readable message.
```

Cashier message:

```txt
POS sedang menyiapkan tipe pesanan default. Coba lagi beberapa detik.
```

Final failure message:

```txt
POS belum memiliki tipe pesanan aktif. Hubungi admin untuk mengecek setup tenant.
```

Do not mention F5 as the primary solution.

## 9. Fix D — Payment failure must return exact safe error

Current generic result is not useful.

Update:

```txt
apps/api/src/http/controllers/POSPaymentController.ts
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
apps/pos-terminal-web/src/lib/api/hooks.ts
```

Required mapping:

```txt
VALIDATION_ERROR from zod:
- include safe field path and reason in server log
- cashier message should be specific when known:
  - payment.splits amountDue <= 0:
    "Bill kosong tidak perlu dikirim. Pilih item bill yang ingin dibayar."
  - payment.lines amount mismatch:
    "Jumlah pembayaran tidak sesuai sisa tagihan."
  - missing order.items:
    "Keranjang kosong atau data order tidak lengkap. Muat ulang POS lalu coba lagi."

Known business errors:
- Total multi payment harus sama dengan sisa tagihan.
- Jumlah pembayaran melebihi sisa tagihan.
- Order sudah lunas. Pembayaran baru tidak dapat dicatat.
- Bill yang dipilih sudah lunas.
- Jumlah pembayaran harus sama dengan sisa bill yang dipilih.
```

Do not collapse known safe errors into:

```txt
Pembayaran gagal dicatat. Silakan coba lagi.
```

That generic message is only allowed for truly unknown server errors.

## 10. Fix E — Split empty Bill B must not invalidate Bill A payment

If UI creates placeholder Bill B with amount 0, do not send it as a real split row.

Update:

```txt
apps/pos-terminal-web/src/components/pos/PaymentMethodDialog.tsx
apps/pos-terminal-web/src/features/pos-core/services/posPaymentSubmissionService.ts
```

Required behavior:

```txt
- Split submit includes selected bill if selected amount > 0.
- Split submit includes non-selected bills only when amountDue > 0.
- Placeholder bills with amountDue = 0 stay UI-only.
- Backend selected bill invariant remains strict.
```

Valid screenshot payload:

```ts
payment: {
  flow: "SPLIT_BILL",
  paymentKind: "SPLIT_BILL_LINE",
  targetBillId: "A",
  lines: [{ method: "CASH", amount: 14000, clientBillId: "A" }],
  splits: [{ clientBillId: "A", label: "Bill A", splitNo: 1, amountDue: 14000, amountPaid: 0, status: "UNPAID" }]
}
```

## 11. Fix F — Multi failure root cause must be found, not masked

Multi currently reaches:

```txt
Dimasukkan Rp 190.900 · Kurang Rp 0
```

Then submit fails generically.

Required analysis:

```txt
- Capture the exact payload sent to /api/pos/payments/submit in dev log.
- Capture response code and response JSON code in frontend dev log.
- Check if order_type_id is valid and present.
- Check if cartPayload items are valid and non-empty.
- Check if total amount equals backend computed total.
- Check if idempotency key reused an already paid order.
- Check if previous failed attempts actually created order/payment rows.
```

Required fix based on root cause:

```txt
- If order type missing, backend SOT repair should solve it.
- If amount mismatch due cartTotal vs backend computed total, use backend/cart payload total consistently and return specific mismatch message.
- If idempotency reused paid order, reset payment session id when cart changes or when retry creates a paid order.
- If response parse fails, fix API helper to show proper server error.
```

Do not mark complete until Multi submit either succeeds or gives a specific known business error.

## 12. Tests required

Add/update tests where practical:

```txt
1. findOrBootstrapForTenant returns existing order types unchanged.
2. findOrBootstrapForTenant enables SOT defaults for tenant with none.
3. Bootstrap is idempotent and does not duplicate rows.
4. Order type endpoint returns bootstrapped order types, not empty array, for tenant with master defaults.
5. Frontend guard message no longer tells cashier to manually activate order types as normal flow.
6. Split payload excludes zero-amount placeholder Bill B.
7. Split Bill A 14000 payload validates and reaches use case.
8. Multi submit failure maps known backend errors specifically.
9. Generic payment error is used only for unknown errors.
```

## 13. Manual verification checklist

Use running app:

```txt
1. Use an existing tenant that previously showed "tipe pesanan belum tersedia".
2. Open POS.
3. Order type defaults should auto-appear or become available after automatic backend bootstrap.
4. Add items and pay Multi: CASH + QRIS exactly total.
5. Multi should either succeed or show exact business reason.
6. Add items and pay Split Bill A while Bill B is zero.
7. Split should not fail because Bill B is zero placeholder.
8. No cashier toast shows SQL/zod/stack/parser/generic unknown error for known cases.
```

## 14. Report update

Update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Add section:

```txt
## P9.8 POS Order Type SOT + Payment Failure Root Fix
```

Include:

```txt
1. Why missing order type happened.
2. Which SOT/defaults are used.
3. How existing tenants are repaired.
4. Multi payment failure root cause and fix.
5. Split zero Bill B root cause and fix.
6. Files changed.
7. Tests/manual verification.
8. Remaining limitations.
```

## 15. Acceptance checklist

```txt
- [ ] Existing tenants with no tenant_order_types are auto-repaired from SOT/defaults.
- [ ] Cashier is not told to manually activate order types during normal POS flow.
- [ ] Order type endpoint returns usable defaults or a structured setup error.
- [ ] Bootstrap is idempotent.
- [ ] Multi payment no longer fails generically.
- [ ] Known Multi errors return specific safe messages.
- [ ] Split Bill A can be paid while Bill B is empty/zero placeholder.
- [ ] Zero placeholder bill is not sent/persisted as real split row.
- [ ] selected bill invariant remains strict.
- [ ] No SQL/zod/stack/internal text appears in cashier toast.
- [ ] No provider/card/e-wallet/gateway/NorthFlow logic added.
- [ ] No legacy compatibility added.
- [ ] Report updated.
```

## 16. Commit message

```txt
fix(pos): repair order type defaults and payment submit failures
```
