---
name: Phase 8K frozen error envelope
description: The payment-orchestration-service error response shape frozen at Phase 8K — nested object, not flat string. Test assertion pattern for compatibility.
---

## Rule

All error responses from `apps/payment-orchestration-service` use the nested envelope:

```json
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "Human description", "details": null } }
```

This is frozen as of Phase 8K (version 0.3.0). Do NOT change to flat `{ error: "CODE" }`.

**Why:** SDK/API contract freeze — downstream clients (including future production consumers) depend on this stable shape. Additive changes only.

**How to apply:**
- Always call `apiErrorResponse(code, message, details?)` from `apps/payment-orchestration-service/src/routes/utils.ts` for all `{ ok: false }` responses in route handlers and middleware.
- The global error handler in `middleware/errors.ts` and 404 catch-all in `app.ts` also use this shape.
- When writing tests that check error codes, use `body.error?.code ?? body.error` so the assertion works against both the nested shape and any legacy flat shape in older tests.
- The SDK (`packages/payment-orchestration-client-sdk`) parses both: `parsed.error?.code ?? parsed.error` — backward compat for clients still on old format.
