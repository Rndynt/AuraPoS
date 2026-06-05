/**
 * route utils — shared helpers for payment-orchestration-service routes.
 *
 * Phase 8D Hardening: merchantId resolution with header fallback.
 */

import type { Request } from 'express';

/**
 * resolveMerchantId — resolve merchantId from request body field or header fallback.
 *
 * Resolution order:
 *   1. bodyValue (explicit body field)
 *   2. x-payment-merchant-id request header
 *
 * Returns null if neither is present.
 */
export function resolveMerchantId(req: Request, bodyValue?: unknown): string | null {
  if (typeof bodyValue === 'string' && bodyValue.trim().length > 0) {
    return bodyValue;
  }
  const header = req.headers['x-payment-merchant-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }
  return null;
}

/**
 * resolveMerchantIdQuery — resolve merchantId from query param or header fallback.
 *
 * Resolution order:
 *   1. ?merchantId= query param
 *   2. x-payment-merchant-id request header
 *
 * Returns null if neither is present.
 */
export function resolveMerchantIdQuery(req: Request): string | null {
  const query = req.query['merchantId'];
  if (typeof query === 'string' && query.trim().length > 0) {
    return query;
  }
  const header = req.headers['x-payment-merchant-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }
  return null;
}
