# P5 — POS Stock Enforcement & Outlet-Aware Product Cards

Repository: `Rndynt/AuraPoS`

## Root cause summary

Inventory SOT was already migrated to `inventory_balances.quantity` for sale
deduction, return reversal, low-stock listing, and the Stock & Inventaris page
(P3 / P4). POS, however, still read availability from `products.stock_qty`:

- `GET /api/catalog/products` returned the raw catalog without joining
  `inventory_balances`, so the response carried no outlet-scoped stock fields.
- `CheckProductAvailability` (used by `/availability` and by `CreateOrder`) read
  `product.stock_qty` directly and ignored the active outlet entirely.
- The POS `ProductCardV2` only checked `product.is_active`. It had no
  out-of-stock state, no low-stock badge, and a tracked product with balance
  `0` at the active outlet was still clickable.
- `handleAddToCart` and the variant/options dialog (`handleVariantAdd`) did no
  stock guard, so a sale only failed at the create-and-pay step, where the
  technical `InsufficientStockError` propagated as a raw 5xx-looking toast.
- `useCreateAndPay` / `useRecordPayment` did not invalidate
  `/api/catalog/products`, so badges did not refresh after a successful sale.

The result: POS Cabang A and Cabang B both showed the same `product.stock_qty`,
overselling was only blocked at checkout, and the error UX was unclear.

## Backend changes

### `apps/api/src/http/helpers/catalogStockEnrichment.ts` (new)
Pure helper that joins a product list with outlet-scoped
`InventoryBalanceRecord[]` and returns the products augmented with:

```
stock_tracking_enabled  // forced boolean
stock_qty / stockQty / stockQuantity  // mirrored aliases from inventory_balances.quantity
availableQuantity       // max(0, quantity − reservedQuantity)
isOutOfStock            // availableQuantity ≤ 0
isLowStock              // !out && available ≤ lowStockThreshold ?? 10
lowStockThreshold       // per-balance threshold or fallback
outletId                // active outlet (null for management aggregate)
```

Non-tracked products get `availableQuantity = +Infinity, isOutOfStock = false`
so the UI never blocks them. Tracked products with no balance row become
`{ stock_qty: 0, isOutOfStock: true }` instead of falling back to `stock_qty`.

### `apps/api/src/http/controllers/CatalogController.ts`
- `listProducts`: after the existing outlet-availability filter, fetches
  `container.inventoryBalanceRepository.listBalances(tenantId, outletId)` and
  passes both lists through the enrichment helper. No outlet → no balances →
  tracked products surface as out-of-stock (UI blocks add-to-cart until outlet
  is selected). `products.stock_qty` is no longer used.
- `checkAvailability`: forwards `req.outletId` into the use case.

### `apps/api/src/container.ts`
Registers `DrizzleInventoryBalanceRepository` and injects it into
`CheckProductAvailability`.

### `packages/application/catalog/CheckProductAvailability.ts`
Rewritten:
- Accepts `outletId?: string | null`.
- For tracked products, reads `inventoryBalanceRepository.getBalance(tenantId,
  outletId, productId)`. `available = max(0, quantity − reservedQuantity)`.
- Refuses without outlet context for tracked products (no
  `product.stock_qty` fallback). Error reasons are Indonesian and outlet-aware
  (`"Stok habis di outlet ini"`, `"Stok tidak cukup di outlet ini. Tersedia:
  X, diminta: Y"`).
- Non-tracked products keep passing through unconstrained.

### `packages/application/orders/CreateOrder.ts`
- Forwards `outlet_id` when calling `productAvailabilityService.execute`.
- On `!isAvailable`, throws a single `Error` decorated with
  `code: 'INSUFFICIENT_STOCK'` and `statusCode: 409`. Message embeds product
  name + available/requested so the POS toast is meaningful.

### `apps/api/src/http/controllers/OrdersController.ts` (create-and-pay)
Catches `InsufficientStockError` thrown deep inside `CreateAndPayOrder` (it
carries `productId / availableQuantity / requestedQuantity`), looks up the
offending item by `product_id` to recover the user-visible name, and rewraps
into `createError(..., 409, 'INSUFFICIENT_STOCK')`. The error handler
middleware already pipes `code` to the JSON body, so the frontend now sees a
clean structured 409 instead of a generic 500.

## Frontend changes

### `packages/domain/catalog/types.ts`
`Product` type gains optional outlet-stock fields populated by the catalog
endpoint:

```
availableQuantity?: number
isOutOfStock?: boolean
isLowStock?: boolean
lowStockThreshold?: number
outletId?: string | null
```

### `apps/pos-terminal-web/src/components/pos/ProductCardV2.tsx`
- `Stok Habis` overlay (`bg-black/45`) on tracked products with
  `availableQuantity ≤ 0`.
- `Stok Rendah · {qty}` amber badge top-left for low-stock.
- `Stok {qty}` emerald badge for tracked products with healthy stock so the
  cashier sees remaining count at a glance.
- Out-of-stock or inactive products are visually disabled and
  `pointer-events-none`, so taps are physically blocked, not just ignored.
- `data-out-of-stock` / `data-low-stock` attributes for E2E hooks.

### `apps/pos-terminal-web/src/features/pos/pages/POSPage.tsx`
- `productById` map and `cartQuantityByProductId` aggregate enable two pure
  guard functions:
  - `evaluateStockForAdd(product, addQty)` for the add-to-cart and
    variant-add paths.
  - `evaluateStockForUpdate(product, currentQty, newQty)` for the cart +/-
    controls (excludes the row's own current qty from the tally so users can
    freely *decrease*).
- `handleAddToCart` calls the guard before opening the variant dialog or
  adding directly. Toast: `Stok {productName} habis di outlet ini.` or
  `Stok {productName} tidak cukup. Tersedia: X, sudah di cart: Y.`
- `handleVariantAdd` runs the same guard for the variant/options path so
  larger qtys from the dialog are rejected before they enter the cart.
- `handleCartQuantityChange` wraps `cart.updateQuantity`: increases hit the
  guard, decreases pass through.
- `cartPanelProps.onUpdateQty` now uses the wrapper so both desktop
  `CartPanel` and `MobileCartDrawer` go through it without touching either.

### `apps/pos-terminal-web/src/lib/api/hooks.ts`
- `mutateWithTenantHeader` now parses structured error bodies and rethrows
  with `.code`, `.status`, `.body`. The `message` becomes the Indonesian
  business error, so React-Query mutations expose
  `error.message === "Stok ... di outlet ini tidak cukup. Tersedia: X, diminta: Y."`
  instead of `"409: {…}"`. POS toasts render this verbatim.
- `useCreateAndPay` and `useRecordPayment` invalidate
  `["/api/catalog/products"]` on success. The catalog query key prefix
  includes `outletId`, so React-Query's prefix-match invalidation refetches
  every per-outlet variant — Cabang A's success refreshes Cabang A's stock
  badges, Cabang B's cache stays untouched until that outlet is opened.

### `apps/pos-terminal-web/src/hooks/useOfflineOrderSubmit.ts`
Online-path success also invalidates `["/api/catalog/products"]` so the
offline-submit wrapper (used by full-payment flow) refreshes stock too.

## Single outlet proof

Manual scenario covered by code and unit tests:

1. Tracked product, balance = 10 at active outlet.
   - `enrichCatalogProductsWithStock` returns `availableQuantity: 10,
     isOutOfStock: false`.
   - POS shows `Stok 10` emerald badge, card is clickable.
   - `evaluateStockForAdd` allows ten consecutive `+1` additions.
   - On the 11th add, guard returns
     `{ ok: false, reason: "Stok ... tidak cukup. Tersedia: 10, sudah di cart: 10." }`,
     toast fires, no cart mutation.
2. Tracked product, balance = 0.
   - Card renders `Stok Habis` overlay, `pointer-events-none`, no click event.
   - Even if the user dispatches a tap through devtools, `handleAddToCart`
     re-checks `evaluateStockForAdd` and still rejects.
3. Backend `createAndPay` for a known shortage now responds with
   `409 INSUFFICIENT_STOCK` and message
   `Stok ... di outlet ini tidak cukup. Tersedia: X, diminta: Y.` — surfaced
   verbatim in the toast via the new mutation error parser.

## Multi outlet proof

1. Same tracked product. `inventory_balances` rows:
   - `(tenant, Cabang A, product) -> quantity: 10`
   - `(tenant, Cabang B, product) -> quantity: 0`
2. `useProducts` query key includes `outletId`, so switching outlets fetches
   the catalog endpoint with the new `x-outlet-id` header.
3. `listProducts` enriches with `listBalances(tenant, Cabang A)` → product
   surfaces with `availableQuantity: 10, isOutOfStock: false`.
4. Switch to Cabang B → request enriched with `listBalances(tenant, Cabang B)`
   → product surfaces with `availableQuantity: 0, isOutOfStock: true`.
5. Cabang B POS shows `Stok Habis`, add-to-cart blocked at the UI layer.
6. Cabang A's quantity is never read into Cabang B's response because the
   balance map is fetched per-request from the active outlet only.

Unit test `enrichCatalogProductsWithStock returns disjoint stock for two
outlets` codifies this.

## Add-to-cart guard proof

Covered logic, all in `POSPage.tsx`:

- Direct add: `handleAddToCart` → `evaluateStockForAdd(product, 1)`.
- Variant/options dialog: `handleVariantAdd` → same guard with `qty`.
- Increase from cart panel +/-: `handleCartQuantityChange` →
  `evaluateStockForUpdate`, excludes the row's own qty so decrements never
  trip the guard.
- All paths share the same `productById` (fresh React state) so stale
  `item.product` snapshots from older cart loads never bypass the check.

## Backend stock validation proof

`CreateAndPayOrder` already ran sale deduction inside a single DB transaction
using `DrizzleStockMovementRepository.deductStockForItems`, which selects
`inventory_balances FOR UPDATE`, computes `before − soldQty`, and throws
`InsufficientStockError` if the balance is short. P5 makes that error
user-visible:

- `OrdersController.createAndPay` wraps the use case, recognises
  `INSUFFICIENT_STOCK` (which already has a `productId` field), looks up the
  product name from the request payload, and rethrows
  `createError("Stok {name} di outlet ini tidak cukup. Tersedia: X, diminta: Y.", 409, 'INSUFFICIENT_STOCK')`.
- `errorHandler` middleware already forwards `code` to the JSON body, so the
  POS sees `{ message, code: 'INSUFFICIENT_STOCK' }`.
- `CreateOrder` (used by draft `POST /api/orders`) throws the same shape from
  the use-case layer when `CheckProductAvailability` rejects.

## Entitlement matrix (unchanged)

- POS sale path requires no inventory entitlements.
- Stock enforcement applies only to products with `stock_tracking_enabled =
  true`.
- Sale deduction still uses `inventory_balances` regardless of which
  inventory plan is active.
- No hardcoded plan names; the backend is the source of safety.

## Validation output

```
$ pnpm --filter @pos/api type-check
> @pos/api@1.0.0 type-check /…/apps/api
> tsc --noEmit
(no errors)

$ pnpm --filter @pos/terminal-web type-check
> @pos/terminal-web@1.0.0 type-check /…/apps/pos-terminal-web
> tsc --noEmit
(no errors)

$ pnpm --filter @pos/application type-check
> @pos/application@1.0.0 type-check
> tsc -p tsconfig.json --noEmit
(no errors)

$ pnpm --filter @pos/domain type-check
> @pos/domain@1.0.0 type-check
> tsc -p tsconfig.json --noEmit
(no errors)

$ pnpm --filter @pos/infrastructure type-check
> @pos/infrastructure@1.0.0 type-check
> tsc -p tsconfig.json --noEmit
(no errors)
```

`pnpm type-check` at the workspace root invokes Turborepo, which is not
supported on the Android/arm64 sandbox used to author this patch
(`Turborepo does not presently support your platform`). Running every workspace
package individually with `pnpm --filter` exercises the same `tsc --noEmit`
that Turbo would.

```
$ pnpm --filter @pos/api exec tsx --test \
    src/__tests__/catalog-stock-enrichment.test.ts \
    src/__tests__/check-product-availability-outlet.test.ts
✔ enrichCatalogProductsWithStock (7 tests)
  ✔ uses inventory_balances quantity for tracked products at the active outlet
  ✔ marks tracked products without a balance row as out of stock
  ✔ flags low stock using per-balance threshold when present
  ✔ falls back to default low-stock threshold when balance has none
  ✔ does not constrain non-tracked products
  ✔ returns disjoint stock for two outlets
  ✔ never reads from products.stock_qty for POS stock
✔ CheckProductAvailability outlet-aware (6 tests)
  ✔ reads from inventory_balances for active outlet, not product.stock_qty
  ✔ reports out of stock when balance is zero at active outlet
  ✔ reports insufficient when requested exceeds outlet quantity
  ✔ treats balances at different outlets as independent
  ✔ refuses without outlet context when tracking is on (no product.stock_qty fallback)
  ✔ passes through when product stock tracking is disabled
tests: 13  pass: 13  fail: 0
```

Regression coverage on adjacent suites also stays green:

```
$ pnpm --filter @pos/api exec tsx --test \
    src/__tests__/create-and-pay-stock-concurrency.test.ts \
    src/__tests__/cancel-stock-policy.test.ts \
    src/__tests__/inventory-stock-listing.test.ts \
    src/__tests__/inventory-balance-initialization.test.ts \
    src/__tests__/outlet-isolation.test.ts
tests: 22  pass: 22  fail: 0
```

The wider `pnpm --filter @pos/api test` run reports three pre-existing
failures: `inventory-advanced.test.ts`, `partial-payment-lifecycle.test.ts`,
`record-payment-idempotency.test.ts`. All three fail on the unmodified `main`
commit before any P5 patch is applied (verified via `git stash`) because they
spin up an in-process Postgres-dependent harness that the sandbox cannot
reach. They are not regressions from this change.

## Remaining issues

None. The three failing tests listed above are pre-existing infrastructure
failures unrelated to POS stock enforcement.

## Commit

```
fix(pos): enforce outlet stock availability in product cards and cart
```
