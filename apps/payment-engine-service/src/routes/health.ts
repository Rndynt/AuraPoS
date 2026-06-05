/**
 * health — /health and /version endpoints for payment-engine-service.
 *
 * No authentication required on health checks.
 * Returns minimal operational metadata — no secrets, no internal paths.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

export function createHealthRouter(config: { version: string; phase: string }): Router {
  const router = Router();

  /**
   * GET /health
   * Returns 200 { ok: true, service: 'payment-engine-service' } when service is up.
   * Used by load balancers and health-check probes.
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'payment-engine-service',
    });
  });

  /**
   * GET /version
   * Returns service metadata for debugging and deployment verification.
   */
  router.get('/version', (_req: Request, res: Response) => {
    res.json({
      service: 'payment-engine-service',
      version: config.version,
      phase: config.phase,
      description: 'Payment Engine Standalone Service — hybrid extraction scaffold',
      status: 'skeleton',
    });
  });

  return router;
}
