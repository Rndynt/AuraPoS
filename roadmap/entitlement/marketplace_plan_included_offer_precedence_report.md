# Marketplace Plan-Included Offer Precedence Report

## Status

Complete.

## Problem

Some entitlements were included in a plan but also had a monthly add-on offer. Example:

```txt
orders_queue
```

This confused users because Marketplace could imply that after subscribing to a plan they still had to pay a monthly add-on for a feature already included in that plan.

## Product rule

Plan inclusion is the highest precedence for an entitlement.

If an entitlement is included in any plan, Marketplace must not present it as an add-on offer. The user should see the feature as:

```txt
- Active / Included if current plan already contains it.
- Locked with Upgrade Paket path if current plan is below the plan that includes it.
```

Add-ons should appear only for entitlements that are not included in any plan.

## Fix

Updated:

```txt
apps/pos-terminal-web/src/pages/marketplace.tsx
```

Changed row builder logic:

```txt
includedFromPlan is computed first.
If entitlement has includedFromPlan, offerCode is forced to null.
If entitlement is not included in any plan, offerCode may be mapped from ENTITLEMENT_CATALOG.offers.
```

This makes plan inclusion override catalog offers at marketplace presentation level.

## Expected behavior

### Feature included in higher plan

Example:

```txt
orders_queue included in Growth
current tenant Starter
```

Marketplace should show:

```txt
Locked
Upgrade Paket
No monthly add-on badge
No “Aktifkan Add-on” CTA
```

### Feature already included in current plan

Marketplace should show:

```txt
Termasuk Paket Aktif / Aktif
No add-on price
No add-on CTA
```

### Feature not included in any plan but sold as add-on

Marketplace may show:

```txt
Add-on price
Billing label from offer.billingInterval
Required plan if locked
Aktifkan Add-on if purchasable
```

## Safety

- No backend entitlement resolution changed.
- No grant data changed.
- No catalog data changed.
- Only marketplace offer precedence was fixed.

## Commit

```txt
fix(marketplace): prefer plan upgrade over add-on for included features
```
