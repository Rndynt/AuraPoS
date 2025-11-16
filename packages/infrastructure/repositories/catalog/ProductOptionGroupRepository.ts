/**
 * Product Option Group Repository
 * Handles option group CRUD operations with tenant isolation
 */

import { Database } from '../../database';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  productOptionGroups,
  type ProductOptionGroup,
  type InsertProductOptionGroup,
} from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface IProductOptionGroupRepository {
  findByProduct(productId: string, tenantId: string): Promise<ProductOptionGroup[]>;
  findById(id: string, tenantId: string): Promise<ProductOptionGroup | null>;
  create(optionGroup: InsertProductOptionGroup, tenantId: string): Promise<ProductOptionGroup>;
  update(id: string, optionGroup: Partial<InsertProductOptionGroup>, tenantId: string): Promise<ProductOptionGroup>;
}

export class ProductOptionGroupRepository
  extends BaseRepository<ProductOptionGroup, InsertProductOptionGroup>
  implements IProductOptionGroupRepository
{
  protected table = productOptionGroups;
  protected entityName = 'ProductOptionGroup';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all option groups for a product
   */
  async findByProduct(
    productId: string,
    tenantId: string
  ): Promise<ProductOptionGroup[]> {
    try {
      return await this.db
        .select()
        .from(productOptionGroups)
        .where(
          and(
            eq(productOptionGroups.productId, productId),
            eq(productOptionGroups.tenantId, tenantId)
          )
        )
        .orderBy(productOptionGroups.displayOrder);
    } catch (error) {
      this.handleError('find option groups by product', error);
    }
  }

  /**
   * Find option group by ID
   */
  async findById(id: string, tenantId: string): Promise<ProductOptionGroup | null> {
    try {
      const result = await this.db
        .select()
        .from(productOptionGroups)
        .where(
          and(
            eq(productOptionGroups.id, id),
            eq(productOptionGroups.tenantId, tenantId)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.handleError('find option group by id', error);
    }
  }

  /**
   * Create a new option group
   */
  async create(
    optionGroup: InsertProductOptionGroup,
    tenantId: string
  ): Promise<ProductOptionGroup> {
    try {
      const data = this.injectTenantId(optionGroup, tenantId);
      const result = await this.db
        .insert(productOptionGroups)
        .values(data)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create option group', error);
    }
  }

  /**
   * Update an existing option group
   */
  async update(
    id: string,
    optionGroup: Partial<InsertProductOptionGroup>,
    tenantId: string
  ): Promise<ProductOptionGroup> {
    try {
      await this.ensureTenantAccess(id, tenantId);

      const result = await this.db
        .update(productOptionGroups)
        .set({ ...optionGroup, updatedAt: new Date() })
        .where(
          and(
            eq(productOptionGroups.id, id),
            eq(productOptionGroups.tenantId, tenantId)
          )
        )
        .returning();

      if (!result || result.length === 0) {
        throw new RepositoryError('Option group not found', 'NOT_FOUND', null);
      }

      return result[0];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('update option group', error);
    }
  }
}
