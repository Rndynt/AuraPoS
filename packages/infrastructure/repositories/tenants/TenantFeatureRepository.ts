/**
 * Tenant Feature Repository
 * Handles tenant feature activation and configuration
 */

import { Database } from '../../database';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  tenantFeatures,
  type TenantFeature as DBTenantFeature,
  type InsertTenantFeature,
} from '../../../../shared/schema';
import type { TenantFeature } from '../../../domain/tenants/types';
import { eq, and } from 'drizzle-orm';

/**
 * Map database tenant feature to domain tenant feature (camelCase -> snake_case)
 */
function mapTenantFeatureToDomain(dbFeature: DBTenantFeature): TenantFeature {
  return {
    id: dbFeature.id,
    tenant_id: dbFeature.tenantId,
    feature_code: dbFeature.featureCode,
    activated_at: dbFeature.activatedAt,
    expires_at: dbFeature.expiresAt || undefined,
    source: dbFeature.source as 'plan_default' | 'purchase' | 'manual_grant' | 'trial',
    is_active: dbFeature.isActive,
  };
}

export interface ITenantFeatureRepository {
  findActiveByTenant(tenantId: string): Promise<TenantFeature[]>;
  findByTenantAndFeature(tenantId: string, featureCode: string): Promise<TenantFeature | null>;
  create(tenantFeature: InsertTenantFeature): Promise<TenantFeature>;
  update(id: string, tenantFeature: Partial<InsertTenantFeature>): Promise<TenantFeature>;
  deleteByTenantId(tenantId: string): Promise<void>;
}

export class TenantFeatureRepository
  extends BaseRepository<TenantFeature, InsertTenantFeature>
  implements ITenantFeatureRepository
{
  protected table = tenantFeatures;
  protected entityName = 'TenantFeature';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all active features for a tenant
   * Only returns non-expired, active features
   */
  async findActiveByTenant(tenantId: string): Promise<TenantFeature[]> {
    try {
      const now = new Date();
      
      const result = await this.db
        .select()
        .from(tenantFeatures)
        .where(
          and(
            eq(tenantFeatures.tenantId, tenantId),
            eq(tenantFeatures.isActive, true)
          )
        );

      // Filter out expired features in code (since expiresAt can be null)
      const activeFeatures = result.filter((feature) => {
        if (!feature.expiresAt) return true; // No expiry
        return new Date(feature.expiresAt) > now; // Not expired
      });

      return activeFeatures.map(mapTenantFeatureToDomain);
    } catch (error) {
      this.handleError('find active features by tenant', error);
    }
  }

  /**
   * Find a specific feature for a tenant
   */
  async findByTenantAndFeature(
    tenantId: string,
    featureCode: string
  ): Promise<TenantFeature | null> {
    try {
      const result = await this.db
        .select()
        .from(tenantFeatures)
        .where(
          and(
            eq(tenantFeatures.tenantId, tenantId),
            eq(tenantFeatures.featureCode, featureCode)
          )
        )
        .limit(1);

      return result[0] ? mapTenantFeatureToDomain(result[0]) : null;
    } catch (error) {
      this.handleError('find feature by tenant and code', error);
    }
  }

  /**
   * Create a new tenant feature activation
   */
  async create(tenantFeature: InsertTenantFeature): Promise<TenantFeature> {
    try {
      const result = await this.db
        .insert(tenantFeatures)
        .values(tenantFeature)
        .returning();
      return mapTenantFeatureToDomain(result[0]);
    } catch (error) {
      this.handleError('create tenant feature', error);
    }
  }

  /**
   * Update an existing tenant feature
   */
  async update(
    id: string,
    tenantFeature: Partial<InsertTenantFeature>
  ): Promise<TenantFeature> {
    try {
      const result = await this.db
        .update(tenantFeatures)
        .set({ ...tenantFeature, updatedAt: new Date() })
        .where(eq(tenantFeatures.id, id))
        .returning();

      if (!result || result.length === 0) {
        throw new RepositoryError('Tenant feature not found', 'NOT_FOUND', null);
      }

      return mapTenantFeatureToDomain(result[0]);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('update tenant feature', error);
    }
  }

  /**
   * Alias for findActiveByTenant - used by GetActiveFeaturesForTenant use case
   */
  async findByTenantId(tenantId: string): Promise<TenantFeature[]> {
    return this.findActiveByTenant(tenantId);
  }

  /**
   * Delete all features for a tenant
   * Used for rollback in case of tenant creation failure
   */
  async deleteByTenantId(tenantId: string): Promise<void> {
    try {
      await this.db
        .delete(tenantFeatures)
        .where(eq(tenantFeatures.tenantId, tenantId));
    } catch (error) {
      this.handleError('delete features by tenant id', error);
    }
  }
}
