# Payment Orchestration Service — Smoke Test Guide

**Phase:** 8D Hardening  
**Last updated:** 2026-06-05

This guide describes how to manually or programmatically verify the payment-orchestration-service standalone API.

---

## Prerequisites

1. Service running on port 5100 (or override with `PAYMENT_ORCHESTRATION_SERVICE_PORT`).
2. `PAYMENT_ORCHESTRATION_SERVICE_TOKEN` set (any value in non-production).
3. PostgreSQL accessible at `PAYMENT_ORCHESTRATION_DATABASE_URL` or `DATABASE_URL`.

**Quick start (development):**
```bash
NODE_ENV=development PAYMENT_ORCHESTRATION_SERVICE_TOKEN=dev-token npx tsx \
  --tsconfig apps/payment-orchestration-service/tsconfig.json \
  apps/payment-orchestration-service/src/index.ts
```

---

## Step-by-step smoke test

All requests below assume:
```bash
BASE=http://localhost:5100
TOKEN=dev-token
```

---

### 1. Health check

```bash
curl -s $BASE/health | jq
# Expected: { "ok": true, "service": "payment-orchestration-service" }
```

---

### 2. Create merchant

```bash
MERCHANT=$(curl -s -X POST $BASE/v1/merchants \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Warung Test","sourceApp":"smoke","externalRef":"smoke-001"}' | jq -r '.data.id')
echo "Merchant: $MERCHANT"
```

---

### 3. Create provider account

```bash
PA=$(curl -s -X POST $BASE/v1/merchants/$MERCHANT/provider-accounts \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"fake_gateway","environment":"test","providerAccountRef":"smoke-ref-001"}' | jq -r '.data.id')
echo "ProviderAccount: $PA"
# Verify: response includes providerAccountRef, NOT credentialsRef
```

---

### 4. Create payment intent

```bash
INTENT=$(curl -s -X POST $BASE/v1/payment-intents \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"merchantId\":\"$MERCHANT\",\"externalPayableType\":\"order\",\"externalPayableId\":\"order-smoke-001\",\"currency\":\"IDR\",\"amountDue\":100000}" | jq -r '.data.id')
echo "Intent: $INTENT"
```

Alternatively, use `x-payment-merchant-id` header instead of body field:

```bash
INTENT=$(curl -s -X POST $BASE/v1/payment-intents \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "x-payment-merchant-id: $MERCHANT" \
  -H "Content-Type: application/json" \
  -d '{"externalPayableType":"order","externalPayableId":"order-smoke-002","currency":"IDR","amountDue":50000}' | jq -r '.data.id')
```

---

### 5. Create gateway payment (QRIS — requires confirmation)

```bash
TX=$(curl -s -X POST $BASE/v1/payment-intents/$INTENT/gateway-payments \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"merchantId\":\"$MERCHANT\",\"provider\":\"fake_gateway\",\"method\":\"qris\",\"amount\":100000,\"metadata\":{\"scenario\":\"qris\"}}" | jq -r '.data.transaction.id')
echo "Transaction: $TX"
# Expected: transaction.status = requires_action, intent.status = requires_payment
```

**With idempotency key:**
```bash
curl -s -X POST $BASE/v1/payment-intents/$INTENT/gateway-payments \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"merchantId\":\"$MERCHANT\",\"provider\":\"fake_gateway\",\"method\":\"qris\",\"amount\":100000,\"idempotencyKey\":\"smoke-idem-001\",\"metadata\":{\"scenario\":\"qris\"}}"
# Second call with same key: returns HTTP 200 + idempotentReplay: true
```

---

### 6. Check status (with header fallback)

```bash
curl -s "$BASE/v1/payment-intents/$INTENT/status" \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "x-payment-merchant-id: $MERCHANT" | jq
# Expected: intent.status=requires_payment, requiresAction=true
```

---

### 7. Confirm FakeGateway payment (dev only)

```bash
curl -s -X POST "$BASE/v1/dev/fake-gateway/transactions/$TX/confirm" \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "x-payment-merchant-id: $MERCHANT" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: transaction.status=succeeded, intent.status=paid
# alreadyConfirmed=false on first call, true on second call (idempotent)
```

---

### 8. Check refundability

```bash
curl -s "$BASE/v1/payment-intents/$INTENT/refundability" \
  -H "x-payment-orchestration-service-token: $TOKEN" \
  -H "x-payment-merchant-id: $MERCHANT" | jq
# Expected: totalRefundable=100000, transactions=[{amountRefundable:100000,...}]
```

---

## Automated test suites

Run without a running DB or service:

```bash
# Use-case level (in-memory repos, fast)
npx tsx --tsconfig apps/api/tsconfig.node.json --test \
  apps/api/src/__tests__/payment-orchestration-service-fakegateway-flow.test.ts

# HTTP/auth level (real Express, in-memory repos, port 0)
npx tsx --tsconfig apps/api/tsconfig.node.json --test \
  apps/api/src/__tests__/payment-orchestration-service-http-auth.test.ts
```

Expected:
```
# tests 20   # pass 20   # fail 0   (fakegateway-flow)
# tests 13   # pass 13   # fail 0   (http-auth)
```

---

## Key API contracts

### merchantId resolution

All routes accept `merchantId` via the `x-payment-merchant-id` header as a fallback when not provided in the request body or query param. This allows SDK clients to set it once in config and omit it from every call.

### Provider accounts

- `providerAccountRef` — the provider's own account identifier. **Always returned** in responses.
- `credentialsRef` — opaque secret-store reference. **Never returned** in any response.

### Idempotency (gateway payments)

- Pass `idempotencyKey` in the request body.
- Same key + same params → HTTP 200 + `idempotentReplay: true` (no provider call).
- Same key + different params → HTTP 409 `IDEMPOTENCY_CONFLICT`.

### Gateway payment response (Phase 8D)

```json
{
  "ok": true,
  "data": {
    "transaction": { "id": "tx_...", "status": "requires_action", ... },
    "intent": { "id": "pi_...", "status": "requires_payment", ... },
    "idempotentReplay": false
  }
}
```

---

## Phase 8E roadmap

- Real provider webhook ingestion (`POST /v1/webhooks/:provider`).
- Xendit sandbox integration.
- Atomic conditional UPDATE for concurrent confirmation.
- DB-backed idempotency key cleanup (TTL expiry).
