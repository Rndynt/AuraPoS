/**
 * intents — placeholder payment intent routes for payment-engine-service.
 *
 * Phase 8A: returns 501 Not Implemented with clear messages.
 * Phase 8D: real Postgres + provider integration replaces stubs.
 *
 * Routes:
 *   POST /v1/payment-intents
 *   GET  /v1/payment-intents/:id/status
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

export function createIntentsRouter(): Router {
  const router = Router();

  /**
   * POST /v1/payment-intents
   * TODO(Phase 8D): wire to CreateStandalonePaymentIntent use case.
   */
  router.post('/', (_req: Request, res: Response) => {
    res.status(501).json({
      ok: false,
      error: 'NOT_IMPLEMENTED',
      message:
        'POST /v1/payment-intents is not yet implemented. ' +
        'Use the embedded AuraPoS payment engine at /api/payment-engine/intents until Phase 8D.',
      phase: '8A',
    });
  });

  /**
   * GET /v1/payment-intents/:id/status
   * TODO(Phase 8D): wire to GetPaymentIntentStatus use case.
   */
  router.get('/:id/status', (_req: Request, res: Response) => {
    res.status(501).json({
      ok: false,
      error: 'NOT_IMPLEMENTED',
      message:
        'GET /v1/payment-intents/:id/status is not yet implemented. ' +
        'Use the embedded AuraPoS payment engine at /api/payment-engine/intents/:id/status until Phase 8D.',
      phase: '8A',
    });
  });

  /**
   * POST /v1/payment-intents/:id/gateway-payments
   * TODO(Phase 8D): wire to CreateGatewayPayment use case.
   */
  router.post('/:id/gateway-payments', (_req: Request, res: Response) => {
    res.status(501).json({
      ok: false,
      error: 'NOT_IMPLEMENTED',
      message:
        'POST /v1/payment-intents/:id/gateway-payments is not yet implemented. Phase 8D.',
      phase: '8A',
    });
  });

  return router;
}
