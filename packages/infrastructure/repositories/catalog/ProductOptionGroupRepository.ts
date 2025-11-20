/**
 * Product Option Group Repository
 * Handles option group CRUD operations with tenant isolation
 */

import { Database, DbClient } from '../../database';
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
  create(optionGroup: InsertProductOptionGroup, tenantId: string, client?: DbClient): Promise<ProductOptionGroup>;
  update(id: string, optionGroup: Partial<InsertProductOptionGroup>, tenantId: string): Promise<ProductOptionGroup>;
  deleteByProductId(productId: string, tenantId: string, client?: DbClient): Promise<void>;
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
    tenantId: string,
    client?: DbClient
  ): Promise<ProductOptionGroup> {
    try {
      const dbClient = client ?? this.db;
      const data = this.injectTenantId(optionGroup, tenantId);
      const result = await dbClient
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

  /**
   * Delete all option groups for a product
   * Cascade delete will automatically remove associated options
   * Includes explicit tenant ownership verification before deletion
   */
  async deleteByProductId(productId: string, tenantId: string, client?: DbClient): Promise<void> {
    try {
      const dbClient = client ?? this.db;
      
      // Step 1: Verify tenant ownership - find all option groups for this product
      const existingGroups = await dbClient
        .select()
        .from(productOptionGroups)
        .where(eq(productOptionGroups.productId, productId));

      // Step 2: Validate that all groups belong to the correct tenant
      if (existingGroups.length > 0) {
        const groupsNotOwnedByTenant = existingGroups.filter(
          (group) => group.tenantId !== tenantId
        );

        if (groupsNotOwnedByTenant.length > 0) {
          throw new RepositoryError(
            `Cannot delete option groups for product '${productId}': ` +
            `${groupsNotOwnedByTenant.length} group(s) do not belong to tenant '${tenantId}'`,
            'FORBIDDEN',
            null
          );
        }
      }

      // Step 3: Perform the deletion with tenant scoping
      const result = await dbClient
        .delete(productOptionGroups)
        .where(
          and(
            eq(productOptionGroups.productId, productId),
            eq(productOptionGroups.tenantId, tenantId)
          )
        )
        .returning();

      console.log(
        `[ProductOptionGroupRepository] Deleted ${result.length} option group(s) for product '${productId}' ` +
        `owned by tenant '${tenantId}'`
      );
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('delete option groups by product id', error);
    }
  }
}
