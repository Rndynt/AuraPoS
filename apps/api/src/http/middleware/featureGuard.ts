/**
 * Feature & Module Guard Middleware
 * Protects API routes by checking tenant's active features and module configs.
 * Call requireFeature / requireModule before the route handler.
 */

import type { Request, Response, NextFunction } from 'express';
import { db } from '@pos/infrastructure/database';
import { tenantFeatures, tenantModuleConfigs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Middleware: reject request with 403 if the tenant does not have the given feature active.
 * Usage: router.get('/variants', requireFeature('product_variants'), handler)
 */
export function requireFeature(featureCode: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ success: false, error: 'Tenant not identified', code: 'NO_TENANT' });
      return;
    }

    try {
      const rows = await db
        .select({ id: tenantFeatures.id })
        .from(tenantFeatures)
        .where(
          and(
            eq(tenantFeatures.tenantId, tenantId),
            eq(tenantFeatures.featureCode, featureCode),
            eq(tenantFeatures.isActive, true),
          ),
        )
        .limit(1);

      if (!rows.length) {
        res.status(403).json({
          success: false,
          error: `Fitur '${featureCode}' tidak aktif untuk tenant ini.`,
          code: 'FEATURE_DISABLED',
          feature_code: featureCode,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[featureGuard] requireFeature error:', err);
      next(err);
    }
  };
}

/**
 * Middleware: reject request with 403 if the tenant does not have the given module enabled.
 * moduleKey should match the camelCase column name in tenant_module_configs
 * (e.g. 'enableKitchenTicket', 'enableTableManagement', 'enableInventory').
 */
export function requireModule(moduleKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(403).json({ success: false, error: 'Tenant not identified', code: 'NO_TENANT' });
      return;
    }

    try {
      const rows = await db
        .select()
        .from(tenantModuleConfigs)
        .where(eq(tenantModuleConfigs.tenantId, tenantId))
        .limit(1);

      const config = rows[0] as Record<string, unknown> | undefined;

      if (!config || !config[moduleKey]) {
        res.status(403).json({
          success: false,
          error: `Modul '${moduleKey}' tidak aktif untuk tenant ini.`,
          code: 'MODULE_DISABLED',
          module_key: moduleKey,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[featureGuard] requireModule error:', err);
      next(err);
    }
  };
}
