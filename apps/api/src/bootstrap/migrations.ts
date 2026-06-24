import type { ApiConfig } from './env';
import { log as defaultLog } from './logging';
import type { MigrationLogger } from '../migrations/migrationRunner';

export type BootMigrationPolicy = {
  shouldRun: boolean;
  reason: string;
};

export function evaluateBootMigrationPolicy(config: Pick<ApiConfig, 'isProduction' | 'autoMigrateOnBoot'>): BootMigrationPolicy {
  if (!config.autoMigrateOnBoot) {
    return {
      shouldRun: false,
      reason: 'API_AUTO_MIGRATE_ON_BOOT is not enabled; skipping boot-time DB migrations.',
    };
  }

  if (config.isProduction) {
    throw new Error('API_AUTO_MIGRATE_ON_BOOT=true is not allowed when NODE_ENV=production. Run `pnpm db:migrate` explicitly before starting the API.');
  }

  return {
    shouldRun: true,
    reason: 'API_AUTO_MIGRATE_ON_BOOT=true in non-production; boot-time DB migrations are enabled.',
  };
}

export type BootMigrationRunner = (log: MigrationLogger) => Promise<unknown>;

export type BootMigrationHandlerOptions = {
  log?: MigrationLogger;
  loadMigrationRunner?: () => Promise<{ runDbMigrations: BootMigrationRunner }>;
};

export async function handleBootMigrationPolicy(
  config: Pick<ApiConfig, 'isProduction' | 'autoMigrateOnBoot'>,
  options: BootMigrationHandlerOptions = {},
) {
  const policy = evaluateBootMigrationPolicy(config);

  if (!policy.shouldRun) return;

  const logger = options.log ?? defaultLog;
  logger(policy.reason, 'migrate');

  const { runDbMigrations } = options.loadMigrationRunner
    ? await options.loadMigrationRunner()
    : await import('../migrations/migrationRunner');

  await runDbMigrations(logger);
}
