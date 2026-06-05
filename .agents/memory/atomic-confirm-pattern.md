---
name: Payment orchestration atomic confirm
description: Patterns and gotchas for the markSucceededIfConfirmable conditional UPDATE and surrounding test infrastructure.
---

## Rule
Use `markSucceededIfConfirmable({ id, merchantId })` for all transaction → succeeded transitions in ConfirmFakeGatewayPayment and HandleProviderWebhook. Never use read-then-write (TOCTOU race).

**Why:** Two concurrent HTTP confirms can both pass a status check and both call updateStatus, double-crediting the intent. Conditional UPDATE eliminates this.

**How to apply:**
- `changed === true` → only this caller updates intent totals.
- `changed === false` → reload TX; if succeeded → alreadyConfirmed; else → INVALID_TRANSACTION_STATUS.

## Idempotency scope
`CreateGatewayPayment` uses `IDEMPOTENCY_SCOPE = 'create_gateway_payment'` (NOT 'gateway_payment').
Always match this scope when pre-seeding failed keys in tests via `forceSetFailed(merchantId, 'create_gateway_payment', ...)`.

## assert.throws vs assert.rejects
`FakeGatewayWebhookHandler.parse()` throws synchronously. Use `assert.throws()` (not `assert.rejects()`) for synchronous throws. Using `assert.rejects` on a sync-throw function causes confusing test failures — the error appears caught but the test still fails.
