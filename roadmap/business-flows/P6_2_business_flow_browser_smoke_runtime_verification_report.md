# P6.2 Business Flow Browser Smoke + Runtime Verification Report

Date: 2026-06-20

## 1. Summary

P6.2 verified the POS business-flow runtime after P5.1, P6, and P6.1 through source inspection, policy/routing tests, cleanup guards, and the required automated validation commands.

Browser/manual smoke could not be executed in this non-interactive terminal-only environment, so this report does **not** claim browser smoke passed. Instead, it records the runtime evidence that was practical to verify here:

- `retail_standard` routes to `RetailStandardPOSFlow`.
- `food_beverage` routes to `FoodBeveragePOSFlow`.
- `service` routes to `ServiceCorePOSFlow`.
- `core_standard`, `null`, `undefined`, and unknown profiles route to `CoreStandardPOSFlow` instead of `UnsupportedPOSFlow`.
- F&B/service/core baseline checkout remains product/catalog -> cart -> full payment/cash -> receipt via the shared retail/core composition.
- Full payment does not require `orders_queue`, table service, kitchen/KDS, split bill, partial payment, or multi-payment.
- No forbidden cashier runtime debug copy was found in `apps/pos-terminal-web/src/features/pos-flows`.
- No `GenericPOSPage`, old `features/pos/services`, or old `features/pos/mappers` imports were found in terminal-web source.

No code bugs requiring fixes were discovered during this runtime verification batch.

## 2. Environment used

| Item | Value |
|---|---|
| Repository path | `/workspace/AuraPoS` |
| Date | 2026-06-20 |
| Package manager | `pnpm` |
| Runtime available | Terminal/Node validation only |
| Browser UI available | Not available in this environment |
| Screenshot capture | Not available because browser smoke was not run |

## 3. Test tenant/business type matrix

These are the intended smoke tenants/business types and the verified resolver/routing expectation.

| Scenario | Tenant/business type input | Expected profile | Runtime flow | Verification status |
|---|---|---|---|---|
| Retail baseline | `RETAIL_MINIMARKET` or retail equivalent | `retail_standard` | `RetailStandardPOSFlow` | Automated/source verified |
| Food & Beverage baseline | `CAFE_RESTAURANT`, `restaurant`, `cafe`, `quick_service` | `food_beverage` | `FoodBeveragePOSFlow` | Automated/source verified |
| Service baseline | `LAUNDRY`, `SERVICE_APPOINTMENT`, service aliases | `service` | `ServiceCorePOSFlow` | Automated/source verified |
| Core fallback | `DIGITAL_PPOB`, `core_standard`, unknown, null, missing profile | `core_standard` | `CoreStandardPOSFlow` | Automated/source verified |
| Optional F&B entitlements | `restaurant_table_service`, `restaurant_kitchen_ops`, `orders_queue`, `payments_partial_payment`, `payments_multi_payment`, `payments_split_bill` | Optional capabilities only | Baseline full payment remains available | Automated/source verified |

## 4. Routing verification matrix

| Input/profile state | Expected route | Evidence |
|---|---|---|
| `retail_standard` | `RetailStandardPOSFlow` | `resolvePOSFlowComponent` terminal-web tests passed. |
| `food_beverage` | `FoodBeveragePOSFlow` | `resolvePOSFlowComponent` and F&B policy tests passed. |
| `service` | `ServiceCorePOSFlow` | `resolvePOSFlowComponent` and service policy tests passed. |
| `core_standard` | `CoreStandardPOSFlow` | `resolvePOSFlowComponent` tests passed. |
| `null` / `undefined` / unknown | `CoreStandardPOSFlow` | `resolvePOSFlowComponent` and application resolver tests passed. |

## 5. Retail smoke result

Status: **Automated/source verified; browser smoke not run.**

Verified evidence:

- Retail profile routing is covered by terminal-web root flow tests.
- Retail flow still owns the shared checkout view used by retail/core-compatible adapters.
- No F&B table/kitchen/debug panel copy was found under POS flow runtime source.
- Payment baseline policy remains independent from `orders_queue`.

Browser evidence still needed before release:

- Open a `RETAIL_MINIMARKET` tenant in browser.
- Confirm catalog/product grid is visible.
- Add an item to cart.
- Complete full cash payment.
- Confirm receipt behavior is available.
- Confirm no kitchen/table/raw entitlement/debug copy appears.

## 6. Food & Beverage smoke result

Status: **Automated/source verified; browser smoke not run.**

Verified evidence:

- `CAFE_RESTAURANT`, restaurant, cafe, and quick-service aliases resolve to `food_beverage`.
- `food_beverage` routes to `FoodBeveragePOSFlow`.
- `FoodBeveragePOSFlow` reuses the shared checkout view and does not mount the deleted debug/capability panel.
- F&B policy tests prove create-and-pay is allowed with empty optional capabilities.
- F&B policy tests prove `orders_queue`, table/floor, kitchen/KDS, split bill, partial payment, and multi-payment are optional capabilities, not full-payment requirements.
- Cleanup grep found no forbidden F&B debug panel text in POS flow runtime source.

Browser evidence still needed before release:

- Open a `CAFE_RESTAURANT` tenant in browser without paid F&B entitlements.
- Confirm catalog/product grid is visible.
- Add an item to cart.
- Complete full cash payment.
- Confirm receipt behavior is available.
- Confirm table selection, kitchen/KDS, split bill, partial payment, multi-payment, order queue, and internal entitlement text are not required for baseline checkout.

## 7. Service smoke result

Status: **Automated/source verified; browser smoke not run.**

Verified evidence:

- `LAUNDRY`, `SERVICE_APPOINTMENT`, and service aliases resolve to `service`.
- `service` routes to `ServiceCorePOSFlow`.
- `ServiceCorePOSFlow` reuses the shared checkout view and does not mount a service debug/capability panel.
- Service policy tests prove create-and-pay is allowed with empty optional capabilities.
- Appointment/progress modules are not required for full-payment checkout.
- Cleanup grep found no forbidden service debug panel text in POS flow runtime source.

Browser evidence still needed before release:

- Open a `LAUNDRY` or `SERVICE_APPOINTMENT` tenant in browser.
- Confirm product/service catalog is visible when seeded.
- Add an item/service to cart.
- Complete full cash payment.
- Confirm receipt behavior is available.
- Confirm no appointment/progress module is mandatory and no raw entitlement/debug copy appears.

## 8. Core fallback smoke result

Status: **Automated/source verified; browser smoke not run.**

Verified evidence:

- Unknown and null business types resolve to `core_standard` in application resolver tests.
- Terminal-web route tests prove null/undefined/unknown profile inputs route to `CoreStandardPOSFlow`.
- `CoreStandardPOSFlow` delegates to the retail baseline checkout and does not render `UnsupportedPOSFlow` for normal fallback.

Browser evidence still needed before release:

- Run a controlled tenant/profile case with missing or unknown profile.
- Confirm POS still opens checkout fallback.
- Confirm checkout is not blocked solely because profile is null/unknown.
- Confirm no unsupported/debug entitlement panel appears.

## 9. Capability separation result

Status: **Automated/source verified; browser smoke not run.**

Verified evidence:

- `resolveBusinessCapabilities` maps entitlement keys into optional capabilities only.
- Empty entitlements return every optional capability as `false`, while baseline checkout remains available.
- F&B and service flow policies keep `requiredCapabilitiesForFullPayment` empty.
- `orders_queue` is not required for full payment.
- Partial payment, multi-payment, and split bill are optional payment enhancements and do not block full cash payment.

Risk/note:

- The old `restaurant/RestaurantTableServicePOSFlow` implementation still exists as a separate specialized flow module, but the current baseline root routing does not select it for `food_beverage`. Future work must keep it hidden unless both entitlement and safe runtime support are intentionally wired.

## 10. Cashier UI debug-copy verification

Required guard checks were run:

```bash
rg -n "Food & Beverage mode|Service mode|Table & floor service|Kitchen / KDS|Entitlement aktif|Baseline:" apps/pos-terminal-web/src/features/pos-flows
rg -n "GenericPOSPage|features/pos/services|features/pos/mappers" apps/pos-terminal-web/src
```

Results:

- No matches were returned for forbidden cashier runtime/debug copy in POS flow source.
- No matches were returned for `GenericPOSPage`, `features/pos/services`, or `features/pos/mappers` in terminal-web source.
- The terminal-web `cashierCopyGuard.test.ts` also passed.

## 11. Automated validation output

Required commands:

| Command | Result | Notes |
|---|---|---|
| `pnpm --filter @pos/terminal-web type-check` | Pass | TypeScript completed successfully. |
| `pnpm --filter @pos/terminal-web test` | Pass | POS payment/lifecycle/flow/cashier-copy tests passed. |
| `pnpm type-check` | Pass | Turbo type-check passed for 10 packages. |

Additional practical commands:

| Command | Result | Notes |
|---|---|---|
| `pnpm --filter @pos/domain type-check` | Pass | Domain type-check passed. |
| `pnpm --filter @pos/application type-check` | Pass | Application type-check passed. |
| `pnpm --filter @pos/api type-check` | Pass | API type-check passed. |
| `pnpm --filter @pos/application test` | Pass | Application tests passed, including business-profile resolver tests. |
| `pnpm --filter @pos/api test` | Pass | API test suite passed. |
| `rg -n "Food & Beverage mode|Service mode|Table & floor service|Kitchen / KDS|Entitlement aktif|Baseline:" apps/pos-terminal-web/src/features/pos-flows` | Pass | No matches. |
| `rg -n "GenericPOSPage|features/pos/services|features/pos/mappers" apps/pos-terminal-web/src` | Pass | No matches. |

## 12. Bugs found and fixes made

No directly related runtime routing, checkout, or hidden-debug-panel bugs were found during this batch, so no source-code fixes were made.

Additional finding to track:

- Browser/manual smoke is still required because terminal-only validation cannot prove actual rendered catalog, payment dialog interaction, receipt UX, or real tenant/session behavior in the browser.

## 13. Manual smoke not-run statement

Browser/manual smoke was **not run** in this non-interactive terminal-only environment. No screenshots were captured. This report must not be interpreted as a completed browser smoke sign-off.

The next release gate should run the same matrix in a real browser against seeded tenants and record screenshots or detailed manual notes for each business type.

## 14. Recommended next phase

Recommended P6.3 / release-gate work:

1. Prepare seeded test tenants for `RETAIL_MINIMARKET`, `CAFE_RESTAURANT`, `LAUNDRY` or `SERVICE_APPOINTMENT`, and a controlled core fallback profile.
2. Run browser smoke for catalog visibility, add-to-cart, full cash payment, and receipt behavior for each tenant.
3. Capture screenshots or video plus route/profile evidence for each scenario.
4. If practical, add a lightweight Playwright/browser smoke harness around the existing dev server and seeded test data.
5. Keep optional paid controls hidden unless entitlement **and** safe runtime support are both present.
