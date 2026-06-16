# Table Service Growth Access Report

## Status

Complete.

## Problem

A Pro tenant could not open Denah Meja because the route guard checks `restaurant_table_service`, but that entitlement was not resolved for Growth or Pro.

## Fix

Updated entitlement resolver so `restaurant_table_service` is included for Growth and above.

Because plan access is cumulative:

```txt
Starter < Growth < Pro
```

Pro now also receives `restaurant_table_service`.

## Files changed

```txt
packages/application/entitlements/entitlementEngine.ts
```

## Expected behavior

After pulling and restarting:

```txt
/api/me/entitlements.restaurant_table_service = true
```

for tenants with:

```txt
plan_tier = growth
plan_tier = pro
```

Then `/tables` / Denah Meja should open instead of showing upgrade/not found.

## Commit

```txt
fix(entitlement): include table service in growth plan and above
```
