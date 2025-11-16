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
import { eq } from 'drizzle-orm';

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
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
  async findById(id: string): Promise<Tenant | null> {
    try {
      const result = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.handleError('find tenant by id', error);
    }
  }

  /**
   * Find tenant by slug
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    try {
      const result = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.handleError('find tenant by slug', error);
    }
  }
}
