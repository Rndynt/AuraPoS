/**
 * Tenant Feature Repository
 * Handles tenant feature activation and configuration
 */

import { Database } from '../../database';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  tenantFeatures,
  type TenantFeature,
  type InsertTenantFeature,
} from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface ITenantFeatureRepository {
  findActiveByTenant(tenantId: string): Promise<TenantFeature[]>;
  findByTenantAndFeature(tenantId: string, featureCode: string): Promise<TenantFeature | null>;
  create(tenantFeature: InsertTenantFeature): Promise<TenantFeature>;
  update(id: string, tenantFeature: Partial<InsertTenantFeature>): Promise<TenantFeature>;
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
      return result.filter((feature) => {
        if (!feature.expiresAt) return true; // No expiry
        return new Date(feature.expiresAt) > now; // Not expired
      });
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

      return result[0] || null;
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
      return result[0];
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

      return result[0];
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
}
