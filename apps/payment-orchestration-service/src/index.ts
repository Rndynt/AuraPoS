/**
 * index — entry point for payment-orchestration-service.
 *
 * Phase 8A: skeletal service. Listens on PAYMENT_ORCHESTRATION_SERVICE_PORT (default 5100).
 * Does NOT share a port with apps/api (port 5000).
 *
 * Start command:
 *   npx tsx --tsconfig tsconfig.json src/index.ts
 *
 * Or via package script:
 *   pnpm --filter @northflow/payment-orchestration-service dev
 */

import { loadEnv } from './config/env.ts';
import { createContainer } from './container.ts';
import { createApp } from './app.ts';

const config = loadEnv();
const container = createContainer(config);
const app = createApp(container);

app.listen(config.port, () => {
  console.log(
    `[payment-orchestration-service] Phase ${config.phase} listening on port ${config.port} ` +
      `(NODE_ENV=${config.nodeEnv})`,
  );
  console.log(`  GET http://localhost:${config.port}/health`);
  console.log(`  GET http://localhost:${config.port}/version`);
  console.log('');
  console.log('  Placeholder routes (501 Not Implemented):');
  console.log(`  POST http://localhost:${config.port}/v1/payment-intents`);
  console.log(
    `  GET  http://localhost:${config.port}/v1/payment-intents/:id/status`,
  );
  console.log(
    `  GET  http://localhost:${config.port}/v1/payment-intents/:id/refundability`,
  );
  console.log(`  POST http://localhost:${config.port}/v1/webhooks/:provider`);
});
