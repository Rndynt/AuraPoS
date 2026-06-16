# Entitlement Alias Import Crash Fix Report

## Status

Complete.

## Problem

Replit preview crashed on API startup because `entitlementEngine.ts` still imported `ENTITLEMENT_ALIASES` from `entitlementCatalog.ts`, while the catalog no longer exported it.

Error:

```txt
SyntaxError: The requested module './entitlementCatalog' does not provide an export named 'ENTITLEMENT_ALIASES'
```

## Fix

Updated:

```txt
packages/application/entitlements/entitlementEngine.ts
```

Changes:

```txt
- Removed ENTITLEMENT_ALIASES import.
- Removed AnyEntitlementCode type dependency.
- Replaced alias resolution with canonical entitlement code resolution.
- Only keys present in ENTITLEMENT_CATALOG.entitlements are treated as valid entitlement codes.
```

## Reason

AuraPoS is still development-only, so old alias behavior is not needed.

## Commits

```txt
fix(entitlement): remove add-on offers for plan-included features
fix(entitlement): remove alias import from engine
```
