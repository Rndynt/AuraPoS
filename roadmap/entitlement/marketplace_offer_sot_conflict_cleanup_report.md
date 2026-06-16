# Marketplace Offer SOT Conflict Cleanup Report

## Status

Complete.

## Problem

The UI rule was correct, but the SOT still contained offers for entitlements already included in plans.

That can confuse future agents/developers and can reintroduce marketplace ambiguity later.

Conflicting offers removed:

```txt
inventory_advanced_stock_addon
orders_queue_addon
```

Reason:

```txt
inventory_advanced_stock is included in Pro.
orders_queue is included in Growth.
```

Plan inclusion is the highest-level commercial path. If an entitlement is included in any plan, it should not also be sold as a standalone add-on.

## Final rule

```txt
Feature included in any plan:
  Marketplace path = upgrade plan / included / active
  Offer/add-on path = not allowed

Feature not included in any plan but sold separately:
  Marketplace path = add-on purchase
```

## Current valid offers left in SOT

```txt
receipt_compact_monthly
integrations_webhook_monthly
```

These are valid because their entitlements are not included in any plan:

```txt
receipt_compact is not included in starter/growth/pro.
integrations_webhook is not included in starter/growth/pro.
```

## Files changed

```txt
packages/application/entitlements/entitlementCatalog.ts
```

Also removed active legacy alias exports from entitlementCatalog because the app is still development-only and should not keep old split payment compatibility aliases.

Removed:

```txt
ENTITLEMENT_ALIASES
LegacyEntitlementCode
AnyEntitlementCode
```

## Commit

```txt
fix(entitlement): remove add-on offers for plan-included features
```
