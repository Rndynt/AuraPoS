# Partial Payment Dialog Layering Patch Report

## Status

Complete.

## Problem

When settling a partial payment from the Orders page, the confirmation dialog was rendered behind the order detail bottom sheet on mobile.

Root cause:

```txt
Order detail bottom sheet z-index: z-[60]
Mobile overlay z-index: z-[55]
AlertDialog overlay/content z-index before patch: z-50
```

Because the Radix AlertDialog portal overlay/content used `z-50`, the order detail bottom sheet could visually sit above the confirmation dialog.

## Fix

Updated shared AlertDialog component:

```txt
apps/pos-terminal-web/src/components/ui/alert-dialog.tsx
```

New layering:

```txt
AlertDialogOverlay: z-[90]
AlertDialogContent: z-[100]
```

This keeps confirmation dialogs above the Orders bottom sheet and other mobile drawer surfaces.

## Why shared component was changed

The issue is a shared modal layering problem, not only a partial-payment issue. Any AlertDialog opened while a mobile sheet/drawer is visible should appear above the current surface.

## Expected behavior

Partial payment settlement flow:

```txt
Orders page
→ open order detail bottom sheet
→ click Lunasi Sisa
→ confirmation dialog appears above bottom sheet
→ payment method picker and action buttons are visible/clickable
```

## Safety

- No payment lifecycle logic changed.
- No API behavior changed.
- No order/payment status logic changed.
- Only AlertDialog overlay/content z-index was raised.

## Commit

```txt
fix(ui): keep alert dialogs above order bottom sheet
```
