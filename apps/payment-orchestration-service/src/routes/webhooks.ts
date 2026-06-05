/**
 * webhooks — placeholder webhook routes for payment-orchestration-service.
 *
 * Phase 8A: returns 501 Not Implemented.
 * Phase 8E: HandlePaymentProviderWebhook use case will be wired here.
 *
 * Route: POST /v1/webhooks/:provider
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

export function createWebhooksRouter(): Router {
  const router = Router();

  /**
   * POST /v1/webhooks/:provider
   * TODO(Phase 8E): wire to HandlePaymentProviderWebhook use case.
   */
  router.post('/:provider', (req: Request, res: Response) => {
    const provider = req.params['provider'];
    res.status(501).json({
      ok: false,
      error: 'NOT_IMPLEMENTED',
      message:
        `POST /v1/webhooks/${provider} is not yet implemented. ` +
        `Real provider webhook ingestion is planned for Phase 8E.`,
      phase: '8E',
    });
  });

  return router;
}
