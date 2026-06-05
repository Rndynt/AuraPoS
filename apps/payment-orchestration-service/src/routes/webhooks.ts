/**
 * webhooks — placeholder webhook routes for payment-orchestration-service.
 *
 * Phase 8A: returns 501 Not Implemented.
 * Phase 8D: HandlePaymentProviderWebhook use case wired here.
 *
 * Route: POST /v1/webhooks/:provider
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

export function createWebhooksRouter(): Router {
  const router = Router();

  /**
   * POST /v1/webhooks/:provider
   * TODO(Phase 8D): wire to HandlePaymentProviderWebhook use case.
   */
  router.post('/:provider', (req: Request, res: Response) => {
    const provider = req.params['provider'];
    res.status(501).json({
      ok: false,
      error: 'NOT_IMPLEMENTED',
      message:
        `POST /v1/webhooks/${provider} is not yet implemented. ` +
        `Use the embedded AuraPoS webhook route at /api/payment-engine/webhooks/${provider} until Phase 8D.`,
      phase: '8A',
    });
  });

  return router;
}
