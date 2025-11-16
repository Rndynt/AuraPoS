/**
 * Product Option Repository
 * Handles product option CRUD operations with tenant isolation
 */

import { Database } from '../../database';
import { BaseRepository } from '../BaseRepository';
import {
  productOptions,
  type ProductOption,
  type InsertProductOption,
} from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface IProductOptionRepository {
  findByOptionGroup(optionGroupId: string, tenantId: string): Promise<ProductOption[]>;
  findById(id: string, tenantId: string): Promise<ProductOption | null>;
  create(option: InsertProductOption, tenantId: string): Promise<ProductOption>;
}

export class ProductOptionRepository
  extends BaseRepository<ProductOption, InsertProductOption>
  implements IProductOptionRepository
{
  protected table = productOptions;
  protected entityName = 'ProductOption';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all options for an option group
   */
  async findByOptionGroup(
    optionGroupId: string,
    tenantId: string
  ): Promise<ProductOption[]> {
    try {
      return await this.db
        .select()
        .from(productOptions)
        .where(
          and(
            eq(productOptions.optionGroupId, optionGroupId),
            eq(productOptions.tenantId, tenantId)
          )
        )
        .orderBy(productOptions.displayOrder);
    } catch (error) {
      this.handleError('find options by option group', error);
    }
  }

  /**
   * Find option by ID
   */
  async findById(id: string, tenantId: string): Promise<ProductOption | null> {
    try {
      const result = await this.db
        .select()
        .from(productOptions)
        .where(
          and(eq(productOptions.id, id), eq(productOptions.tenantId, tenantId))
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.handleError('find option by id', error);
    }
  }

  /**
   * Create a new option
   */
  async create(
    option: InsertProductOption,
    tenantId: string
  ): Promise<ProductOption> {
    try {
      const data = this.injectTenantId(option, tenantId);
      const result = await this.db.insert(productOptions).values(data).returning();
      return result[0];
    } catch (error) {
      this.handleError('create option', error);
    }
  }
}
