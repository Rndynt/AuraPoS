/**
 * env — Payment Engine Service configuration loader.
 *
 * Reads only from environment variables. No hard-coded defaults for secrets.
 * No AuraPoS tenant/session dependencies.
 *
 * Port resolution order:
 *   PAYMENT_ENGINE_SERVICE_PORT → PORT → 5100 (default)
 *   (Intentionally avoids 5000 which is reserved for apps/api)
 */

export interface PaymentEngineServiceConfig {
  port: number;
  nodeEnv: string;
  serviceToken: string;
  version: string;
  phase: string;
}

export function loadEnv(): PaymentEngineServiceConfig {
  const port = parseInt(
    process.env['PAYMENT_ENGINE_SERVICE_PORT'] ?? process.env['PORT'] ?? '5100',
    10,
  );
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  const serviceToken = process.env['PAYMENT_ENGINE_SERVICE_TOKEN'] ?? '';
  const version = '0.1.0';
  const phase = '8A';

  return { port, nodeEnv, serviceToken, version, phase };
}
