# Marketplace Offer Price Visibility Patch Report

## Status

Complete.

## Problem

Marketplace showed only `receipt_compact` as priced/purchasable for Starter tenants, while other priced add-ons existed in `ENTITLEMENT_CATALOG.offers`.

It also showed `/bln` in the detail drawer even when an offer was changed to non-monthly / non-expiring.

## Root cause

Two separate UI issues:

1. Price badge was rendered only when `status === "purchasable"`.
   - Starter tenant can purchase Starter-level offers only.
   - Other priced offers with `requiredPlan: "growth"` were marked `locked`, so their price was hidden.

2. Detail drawer hardcoded the suffix:

```tsx
{formatPrice(offer.price)}/bln
```

This ignored `offer.billingInterval` from the SOT.

## Fix

Updated:

```txt
apps/pos-terminal-web/src/pages/marketplace.tsx
```

Changes:

```txt
- Added offer price formatter based on offer.billingInterval.
- monthly => /bulan
- yearly => /tahun
- one_time => sekali
- none => no suffix
- Show offer price badge for all offers that are not active/included, including locked offers.
- Locked priced offers now display required plan text, e.g. “Butuh paket Growth untuk add-on ini”.
- Detail drawer no longer hardcodes /bln.
- Detail drawer shows add-on price and required plan when locked.
```

## Current catalog interpretation

Current SOT has:

```txt
receipt_compact_monthly:
  entitlement: receipt_compact
  price: 15000
  billingInterval: none
  expires: false
```

With this patch, Marketplace should render it without `/bulan`.

Other priced offers such as:

```txt
inventory_advanced_stock_addon
orders_queue_addon
integrations_webhook_monthly
```

will display their prices even if the tenant is still Starter, but they remain locked until the tenant reaches the required plan.

## Safety

- No entitlement resolution logic changed.
- No grant/purchase API behavior changed.
- No backend behavior changed.
- Only marketplace presentation and price-label formatting changed.

## Commit

```txt
fix(marketplace): show offer prices with correct billing labels
```
