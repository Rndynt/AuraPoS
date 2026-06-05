---
name: Webhook auth bypass ordering in Express app
description: How to register webhook routes so they bypass service-token auth middleware in payment-orchestration-service.
---

## Rule
In `app.ts`, register the webhook router BEFORE the global auth middleware:

```ts
// 1. Webhooks — NO service token required (provider signature verification inside handler)
app.use('/v1/webhooks', createWebhooksRouter(container));

// 2. Service-token auth for all other /v1/* routes
app.use('/v1', auth);

// 3. Protected routes
app.use('/v1/merchants', ...);
```

**Why:** `app.use('/v1', auth)` applies to ALL /v1/* subroutes including /v1/webhooks unless the webhook response is already sent. Registering webhooks first ensures they handle the request before auth middleware runs.

## Raw body capture for HMAC
```ts
app.use(express.json({
  verify: (req: Request, _res: Response, buf: Buffer) => {
    (req as any).rawBody = buf;
  },
}));
```
Must be set up ONCE at app level. In the webhook router, read `(req as any).rawBody` as Buffer when available; fall back to `req.body` (parsed object) when not.

## HMAC env var
`PAYMENT_ORCHESTRATION_FAKEGATEWAY_WEBHOOK_SECRET` — optional in non-production (unsigned accepted), required in production (403 if absent).
