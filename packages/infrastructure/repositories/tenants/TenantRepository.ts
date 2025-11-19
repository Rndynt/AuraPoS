/**
 * Tenant Repository
 * Handles tenant CRUD operations
 */

import { Database } from '../../database';
import { BaseRepository } from '../BaseRepository';
import {
  tenants,
  type Tenant,
  type InsertTenant,
} from '../../../../shared/schema';
import type { Tenant as DomainTenant } from '@pos/domain/tenants/types';
import { eq } from 'drizzle-orm';

/**
 * Map database tenant to domain tenant (camelCase -> snake_case)
 */
function mapTenantToDomain(dbTenant: Tenant): DomainTenant {
  return {
    id: dbTenant.id,
    name: dbTenant.name,
    slug: dbTenant.slug,
    business_name: dbTenant.businessName || undefined,
    business_address: dbTenant.businessAddress || undefined,
    business_phone: dbTenant.businessPhone || undefined,
    business_email: dbTenant.businessEmail || undefined,
    business_type: dbTenant.businessType as import('@pos/core').BusinessType,
    settings: dbTenant.settings || null,
    plan_tier: dbTenant.planTier as 'free' | 'starter' | 'professional' | 'enterprise',
    subscription_status: dbTenant.subscriptionStatus as 'active' | 'trial' | 'suspended' | 'cancelled',
    trial_ends_at: dbTenant.trialEndsAt || undefined,
    timezone: dbTenant.timezone,
    currency: dbTenant.currency,
    locale: dbTenant.locale,
    is_active: dbTenant.isActive,
    created_at: dbTenant.createdAt,
    updated_at: dbTenant.updatedAt,
  };
}

export interface ITenantRepository {
  findById(id: string): Promise<DomainTenant | null>;
  findBySlug(slug: string): Promise<DomainTenant | null>;
}

export class TenantRepository
  extends BaseRepository<Tenant, InsertTenant>
  implements ITenantRepository
{
  protected table = tenants;
  protected entityName = 'Tenant';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<DomainTenant | null> {
    try {
      const result = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);

      return result[0] ? mapTenantToDomain(result[0]) : null;
    } catch (error) {
      this.handleError('find tenant by id', error);
    }
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string): Promise<DomainTenant | null> {
    try {
      const result = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      return result[0] ? mapTenantToDomain(result[0]) : null;
    } catch (error) {
      this.handleError('find tenant by slug', error);
    }
  }
}
