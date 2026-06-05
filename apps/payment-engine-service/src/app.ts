/**
 * app — Express application factory for payment-engine-service.
 *
 * Returns a configured Express app instance.
 * Does NOT call app.listen() — that is the responsibility of src/index.ts.
 *
 * Design principles:
 * - No AuraPoS session/tenant middleware
 * - No POS order domain deps
 * - No static file serving
 * - JSON API only
 */

import express from 'express';
import { createHealthRouter } from './routes/health.ts';
import { createIntentsRouter } from './routes/intents.ts';
import { createWebhooksRouter } from './routes/webhooks.ts';
import type { ServiceContainer } from './container.ts';

export function createApp(container: ServiceContainer): express.Application {
  const app = express();

  app.use(express.json());

  // ── Utility ──────────────────────────────────────────────────────────────
  app.use(createHealthRouter(container.config));

  // ── API v1 ───────────────────────────────────────────────────────────────
  app.use('/v1/payment-intents', createIntentsRouter());
  app.use('/v1/webhooks', createWebhooksRouter());

  // ── 404 catch-all ────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      ok: false,
      error: 'NOT_FOUND',
      message: 'Route not found. Check the payment-engine-service API documentation.',
    });
  });

  return app;
}
