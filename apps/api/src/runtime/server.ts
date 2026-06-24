import type { Server } from 'http';
import type { ApiConfig } from '../bootstrap/env';
import { log } from '../bootstrap/logging';

export function startServer(server: Server, config: Pick<ApiConfig, 'port' | 'isProduction' | 'autoMigrateOnBoot'>) {
  server.listen({
    port: config.port,
    host: '0.0.0.0',
    reusePort: true,
  }, () => {
    log(`serving on port ${config.port}`);
  });

  return server;
}
