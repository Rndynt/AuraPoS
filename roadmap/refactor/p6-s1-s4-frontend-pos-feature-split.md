# P6 S1-S4 — Frontend POS Feature Split

Status: planned
Purpose: reduce `POSPage` responsibility and split POS frontend flow by feature.

## Goal

`apps/pos-terminal-web/src/pages/pos.tsx` should become a page-level UI orchestrator, not the owner of payment, KDS, CFD, printer, receipt, offline, and queue workflows.

## S1 — Create feature folder structure

Target structure:

```txt
apps/pos-terminal-web/src/features/pos/
  pages/POSPage.tsx
  components/POSLayout.tsx
  components/ProductSection.tsx
  components/CartSection.tsx
  components/OrderQueueSection.tsx
  hooks/usePOSCartFlow.ts
  hooks/usePOSPaymentFlow.ts
  hooks/usePOSKitchenFlow.ts
  hooks/usePOSCustomerDisplayFlow.ts
  hooks/usePOSReceiptFlow.ts
  hooks/usePOSOfflineFlow.ts
  services/posOrderService.ts
  services/posPaymentService.ts
  services/posPrinterService.ts
  mappers/cartToOrderPayload.ts
  mappers/orderToCart.ts
  mappers/receiptPayloadMapper.ts
```

Names may be adjusted, but responsibility separation must remain clear.

## S2 — Extract pure mappers first

Move safe pure logic first:

- cart to backend order payload
- order to cart state
- receipt payload mapping
- CFD item mapping if appropriate

Pure mappers must not call React hooks.

## S3 — Extract side-effect flows

Move side effects into hooks/services:

- payment dialog/confirm flow
- partial payment flow
- offline submit flow
- customer display updates
- KDS send/local kitchen ticket flow
- receipt print queue and Bluetooth print flow
- order queue SSE invalidation

## S4 — Reduce page responsibility

Final page responsibilities:

- compose layout
- connect high-level hooks
- pass handlers to components
- no direct long payment/KDS/CFD/printer/offline implementation blocks

## Hard rules

- Do not change POS UX behavior unless explicitly documented.
- Do not remove cash payment support.
- Do not remove partial payment support.
- Do not break offline order save/sync behavior.
- Do not break customer display messages.
- Do not break KDS/local kitchen ticket behavior.
- Do not move backend-specific infrastructure into frontend features.

## Validation commands

```bash
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/terminal-web build
pnpm type-check
```

Manual smoke checklist:

```txt
1. add product to cart
2. select variants/options
3. full cash payment
4. partial payment if feature enabled
5. save draft/continue order
6. send to kitchen if feature enabled
7. offline submit behavior
8. receipt print queue behavior
9. customer display ordering/payment/completed messages
```

## Definition of done

- POS page is substantially smaller.
- Payment/KDS/CFD/printer/offline concerns are separated.
- UI behavior remains stable.
- Type-check and build pass or baseline failures are documented.
