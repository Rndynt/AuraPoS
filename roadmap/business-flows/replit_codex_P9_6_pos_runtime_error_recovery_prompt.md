# Replit/Codex Prompt P9.6 — POS Runtime Error Recovery: Order Type Bootstrap, Split Submit JSON Boundary, CFD UUID Fix

Repository: `Rndynt/AuraPoS`

## 1. Goal

Fix the runtime errors that still block cashier usage after the payment dialog redesign.

Current observed problems from manual testing:

```txt
1. POS shows: "Tipe pesanan belum tersedia. Muat ulang POS atau aktifkan tipe pesanan terlebih dahulu."
2. Cashier does not know what "tipe pesanan" means or why it is unavailable.
3. Split payment submit shows: "Unexpected token '<', '<!DOCTYPE' ... is not valid JSON".
4. Backend logs show CFD session-token 500:
   PostgreSQL invalid input syntax for type uuid: "<nanoid-like string>"
5. Split Bill UI can assign item and press pay, but payment cannot complete because runtime/API boundary still breaks.
```

This patch must make the POS usable. Do not only change the wording. Fix the cause.

Expected user-facing result:

```txt
- New/dev tenant can open POS and pay without being blocked by missing order type setup.
- If order types are missing, the app auto-recovers with a safe default setup where possible.
- If auto-recovery is impossible, the message tells cashier/owner exactly what happened and what to do.
- Split payment submit never shows raw HTML/JSON parse errors.
- CFD session-token no longer crashes because of invalid UUID device id.
```

## 2. Non-negotiable direction

```txt
- Do not add legacy compatibility branches.
- Do not add provider/gateway/card/e-wallet/NorthFlow logic.
- Do not hide errors by swallowing them silently.
- Do not leave cashier with unclear error text.
- Do not make payment UI responsible for database setup.
- Do not require manual database edits for normal development flow.
- Do not expose SQL, UUID, JSON parser, HTML, stack trace, or internal route errors to cashier.
```

## 3. Diagnose before coding

Inspect these files first:

```txt
apps/pos-terminal-web/src/features/pos-flows/shared/orderTypeGuard.ts
apps/pos-terminal-web/src/features/pos-flows/retail/useRetailStandardPOSFlow.ts
apps/pos-terminal-web/src/features/pos-flows/restaurant/useRestaurantTableServicePOSFlow.ts
apps/pos-terminal-web/src/lib/api/hooks.ts
apps/pos-terminal-web/vite.config.ts
apps/api/src/http/controllers/OrderTypesController.ts
apps/api/src/http/controllers/POSPaymentController.ts
apps/api/src/http/controllers/OrdersController.ts
apps/api/src/http/routes/pos.ts
apps/api/src/http/routes/orders.ts
apps/api/src/http/routes/index.ts
packages/infrastructure/repositories/orders/OrderTypeRepository.ts
packages/infrastructure/repositories/payments/DrizzlePOSPaymentOrderTypeRepository.ts
packages/infrastructure/db/schema/businessFlow.schema.ts
apps/api/src/realtime/cfd/CfdAuthService.ts
apps/api/src/realtime/cfd/CfdHttpController.ts
apps/api/src/routes.ts
```

Run:

```bash
rg -n "Tipe pesanan belum tersedia|ORDER_TYPE_UNAVAILABLE|resolveValidOrderTypeSelection|findByTenant|enableForTenant|tenantOrderTypes|orderTypes" apps packages

rg -n "SubmitPOSPayment|/api/pos/payments/submit|posRoutes|payments/submit|mutateWithTenantHeader|res\.json\(\)|Unexpected token|DOCTYPE" apps packages

rg -n "cfd/session-token|createSessionToken|nanoid\(|cfd_devices|deviceId|invalid input syntax for type uuid|string_to_uuid" apps packages migrations
```

Expected findings to verify:

```txt
- OrderTypeRepository.findByTenant uses an inner join to tenant_order_types. If a tenant has no enabled tenant_order_types rows, the frontend gets an empty order type list.
- The frontend guard correctly blocks stale/missing order type, but the product expectation is wrong: POS must not be unusable for a new/dev tenant.
- CfdAuthService.createSessionToken uses nanoid() for deviceId while cfd_devices.id appears to be a UUID column, causing PostgreSQL string_to_uuid error.
- The frontend API helper can still try res.json() on a non-JSON HTML response, producing "Unexpected token '<'" instead of a useful API error.
```

## 4. Fix A — Order type bootstrap / recovery

Problem:

```txt
"Tipe pesanan belum tersedia" means activeOrderTypes is empty.
That happens when the tenant has no enabled order types in tenant_order_types, or the order type endpoint returns no usable order types.
For a POS app, this cannot be a dead-end cashier error.
```

Required behavior:

```txt
- POS must have at least one usable order type by default for every tenant.
- For development/new tenant, backend should auto-bootstrap sane default order types if tenant has none.
- Frontend should still guard, but it should trigger or benefit from backend recovery instead of only showing a dead-end error.
```

### Backend order type recovery

Update repository/controller path used by:

```txt
GET /api/orders/order-types or GET /api/order-types, whichever the frontend actually calls.
```

Implement one clean method in repository/application boundary, for example:

```ts
findOrBootstrapForTenant(tenantId: string): Promise<OrderType[]>
```

Rules:

```txt
1. Query active enabled order types for tenant.
2. If result is not empty, return it.
3. If result is empty:
   - ensure master order types exist for core POS defaults.
   - enable a minimal default set for tenant.
   - return the newly enabled active order types.
4. Do not create duplicate master order types.
5. Do not create duplicate tenant_order_types rows.
6. Do not require legacy migration repair scripts.
```

Default set should be simple and POS-safe:

```txt
TAKE_AWAY / Take Away
DINE_IN / Dine In
DELIVERY / Delivery
```

If the project already has canonical codes/names, use those existing constants/schema conventions. Do not invent conflicting code strings.

### Frontend message if still missing

If backend recovery fails and active order types are still empty, show a useful message:

```txt
POS belum memiliki tipe pesanan aktif untuk tenant ini. Sistem sudah mencoba menyiapkan default, tetapi belum berhasil. Buka Setup Tipe Pesanan atau hubungi admin.
```

Do not use a vague message that only says "aktifkan tipe pesanan terlebih dahulu" without context.

## 5. Fix B — Split payment submit must never show HTML/JSON parser errors

Observed error:

```txt
Unexpected token '<', '<!DOCTYPE' ... is not valid JSON
```

Meaning:

```txt
Frontend expected JSON from an API call but received HTML, often from Vite SPA fallback, wrong route, proxy miss, auth redirect, or 404 HTML page.
```

Required behavior:

```txt
- API calls must validate content-type before parsing JSON.
- If response is HTML or non-JSON, throw a controlled user-safe API error.
- The cashier must never see "Unexpected token '<'".
- The report must identify which split submit request produced HTML and why.
```

### Frontend API helper fix

Update `apps/pos-terminal-web/src/lib/api/hooks.ts` helpers:

```txt
fetchWithTenantHeader
mutateWithTenantHeader
```

Required parsing algorithm:

```txt
1. Read response content-type.
2. Read raw text once.
3. If content-type includes application/json, parse JSON safely.
4. If content-type is not JSON:
   - if url starts with /api, throw user-safe API route/proxy error.
   - include status and a short sanitized preview only in console/dev diagnostics, not cashier toast.
5. If JSON parse fails, throw user-safe API response error.
6. Never call res.json() directly without content-type guard.
```

Suggested user-safe message:

```txt
Layanan POS tidak mengembalikan data yang valid. Periksa koneksi API lalu coba lagi.
```

For payment submit specifically, map to:

```txt
Pembayaran gagal dikirim ke server POS. Periksa koneksi API lalu coba lagi.
```

### Backend API boundary fix

Verify API routing:

```txt
- /api/pos/payments/submit exists and is mounted before any SPA fallback.
- Express returns JSON 404 for unknown /api/* routes.
- Vite/PWA fallback does not serve index.html for /api/*.
- Dev/proxy setup routes frontend /api calls to backend consistently.
```

If needed, update Vite dev proxy or server routing so `/api/*` cannot return HTML for API calls.

## 6. Fix C — CFD session-token UUID crash

Observed backend log:

```txt
[cfd/session-token] PostgreSQLError: invalid input syntax for type uuid: "<nanoid-like string>"
routine: string_to_uuid
```

Likely cause:

```txt
CfdAuthService.createSessionToken uses nanoid() for deviceId, but cfd_devices.id is a UUID column.
```

Required fix:

```txt
- Keep raw CFD token as nanoid or current secure token format.
- Change cfd_devices.id value to a real UUID when inserting into DB.
- Use crypto.randomUUID() or existing project UUID helper.
- Do not change token hashing behavior.
- Do not let CFD optional feature break cashier payment flow.
```

Expected implementation:

```ts
import { randomUUID } from "node:crypto";

const deviceId = randomUUID();
```

Also add validation/error mapping:

```txt
- If admin session user id or tenant id is invalid, return JSON 400/403, not SQL crash.
- /api/cfd/session-token must always return JSON on error.
```

## 7. Fix D — Split Bill payment submit end-to-end smoke

Split Bill must be manually usable after the fixes.

Minimum expected runtime path:

```txt
1. Add items to cart.
2. Open Split.
3. Assign item to Bill A.
4. Select method.
5. Click Bayar Bill A.
6. Frontend POSTs JSON to /api/pos/payments/submit.
7. Backend responds JSON.
8. UI shows paid/partial result, not JSON parser error.
```

If backend rejects payment due business rule, show business error, not parser/HTML/SQL error.

## 8. User-facing error wording rules

Replace unclear/dead-end errors.

### Missing order type

Bad:

```txt
Tipe pesanan belum tersedia. Muat ulang POS atau aktifkan tipe pesanan terlebih dahulu.
```

Better:

```txt
POS belum memiliki tipe pesanan aktif. Sistem akan menyiapkan default Take Away/Dine In/Delivery. Coba lagi beberapa detik.
```

If auto-recovery fails:

```txt
POS belum memiliki tipe pesanan aktif untuk tenant ini. Buka Setup Tipe Pesanan atau hubungi admin.
```

### API returned HTML/non-JSON

Bad:

```txt
Unexpected token '<', '<!DOCTYPE' ... is not valid JSON
```

Better:

```txt
Layanan POS tidak mengembalikan data yang valid. Periksa koneksi API lalu coba lagi.
```

### CFD session token

Bad:

```txt
invalid input syntax for type uuid
```

Better:

```txt
Customer Display belum bisa tersambung. Fitur kasir tetap dapat digunakan.
```

Do not show CFD errors as payment errors unless CFD is the actual active user action.

## 9. Tests required

Add/update tests where practical.

```txt
1. OrderTypeRepository returns existing enabled order types unchanged.
2. OrderTypeRepository bootstraps default order types when tenant has none.
3. Bootstrap is idempotent and does not duplicate tenant_order_types rows.
4. Frontend orderTypeGuard message is actionable and not a dead-end vague text.
5. API helper converts HTML/non-JSON API response into user-safe error, not Unexpected token.
6. mutateWithTenantHeader parses JSON errors once and safely.
7. CfdAuthService.createSessionToken inserts UUID device id, not nanoid id.
8. /api/cfd/session-token error response remains JSON.
```

If full integration tests are not practical, add focused unit tests and document manual verification in report.

## 10. Manual verification checklist

Verify in running app:

```txt
1. Fresh/new tenant opens POS and does not get stuck with missing order type.
2. If order types were missing, default order types appear after reload/retry.
3. Adding item and opening payment no longer shows vague order type blocker.
4. Split Bill pay Bill A does not show Unexpected token '<'.
5. Unknown /api route returns JSON error, not index.html.
6. CFD session-token no longer logs invalid UUID.
7. CFD failure, if any, does not block payment flow.
8. Cashier-facing errors are Indonesian and actionable.
```

## 11. Report update

Update:

```txt
roadmap/business-flows/P9_4_payment_ux_finalization_report.md
```

Add section:

```txt
## P9.6 POS Runtime Error Recovery
```

Include:

```txt
1. Root cause of missing order type.
2. Order type bootstrap/recovery behavior.
3. Split submit HTML/non-JSON root cause and fix.
4. CFD UUID root cause and fix.
5. Files changed.
6. Tests added/updated.
7. Manual verification output.
8. Remaining limitations.
```

## 12. Acceptance checklist

```txt
- [ ] POS does not dead-end on missing tenant order types.
- [ ] Backend can bootstrap default order types for a tenant with none.
- [ ] Bootstrap is idempotent.
- [ ] Order type error wording is understandable and actionable.
- [ ] Split payment submit never shows Unexpected token '<'.
- [ ] API helper never blindly calls res.json() for API responses.
- [ ] Unknown /api/* returns JSON, not HTML.
- [ ] /api/pos/payments/submit route is correctly mounted and reachable.
- [ ] CFD session-token uses UUID device id for DB insert.
- [ ] CFD errors return JSON and do not block cashier payment flow.
- [ ] No SQL/FK/UUID/parser/internal errors are shown to cashier.
- [ ] No provider/card/e-wallet/gateway/NorthFlow logic added.
- [ ] No legacy compatibility added.
- [ ] Report updated.
```

## 13. Commit message

```txt
fix(pos): recover order type setup and api runtime errors
```
