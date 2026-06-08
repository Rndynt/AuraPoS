import type { InventoryPolicyPort } from '@pos/application/inventory/ports';
import {
  getInventoryConfigValue,
  normalizeInventoryPolicy,
  type InventoryPolicyResult,
} from '@pos/application/inventory/inventoryPolicy';
import type { TransactionContext } from '@pos/application/shared/ports';
import { eq } from 'drizzle-orm';
import { tenantModuleConfigs } from '../../../../shared/schema';
import { db, type DbClient } from '../../database';
import { DrizzleUnitOfWork } from '../../unit-of-work';

export class DrizzleInventoryPolicyRepository implements InventoryPolicyPort {
  constructor(private readonly database = db) {}

  async resolveInventoryPolicy(
    tenantId: string,
    context?: TransactionContext,
  ): Promise<InventoryPolicyResult> {
    const client: DbClient = DrizzleUnitOfWork.fromContext(context) ?? this.database;
    const rows = await client
      .select({
        enableInventory: tenantModuleConfigs.enableInventory,
        enableInventoryAdvanced: tenantModuleConfigs.enableInventoryAdvanced,
        config: tenantModuleConfigs.config,
      })
      .from(tenantModuleConfigs)
      .where(eq(tenantModuleConfigs.tenantId, tenantId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        policy: 'strict',
        enableInventory: true,
        enableInventoryAdvanced: false,
        source: 'missing_config_default',
      };
    }

    const snakeCasePolicy = normalizeInventoryPolicy(getInventoryConfigValue(row.config, 'inventory_policy'));
    if (snakeCasePolicy) {
      return {
        policy: snakeCasePolicy,
        enableInventory: row.enableInventory,
        enableInventoryAdvanced: row.enableInventoryAdvanced,
        source: 'tenant_module_config.config.inventory_policy',
      };
    }

    const camelCasePolicy = normalizeInventoryPolicy(getInventoryConfigValue(row.config, 'inventoryPolicy'));
    if (camelCasePolicy) {
      return {
        policy: camelCasePolicy,
        enableInventory: row.enableInventory,
        enableInventoryAdvanced: row.enableInventoryAdvanced,
        source: 'tenant_module_config.config.inventoryPolicy',
      };
    }

    return {
      policy: row.enableInventory ? 'strict' : 'allow_negative',
      enableInventory: row.enableInventory,
      enableInventoryAdvanced: row.enableInventoryAdvanced,
      source: 'module_default',
    };
  }
}
