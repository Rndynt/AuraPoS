/**
 * Product Option Repository
 * Handles product option CRUD operations with tenant isolation
 */

import { Database, DbClient } from '../../database';
import type { TransactionContext } from '@pos/application/shared/ports';
import { DrizzleUnitOfWork } from '../../unit-of-work';
import { BaseRepository } from '../BaseRepository';
import {
  productOptions,
  type ProductOption,
  type InsertProductOption,
} from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import type { ProductOptionMutationData } from '@pos/application/catalog/CreateOrUpdateProduct';

type CatalogDbContext = DbClient | TransactionContext;
function resolveCatalogClient(defaultClient: DbClient, context?: CatalogDbContext): DbClient {
  if (!context) return defaultClient;
  return DrizzleUnitOfWork.fromContext(context as TransactionContext) ?? (context as DbClient);
}
function mapOptionMutationData(option: ProductOptionMutationData): InsertProductOption {
  return {
    optionGroupId: option.optionGroupId,
    tenantId: option.tenantId,
    name: option.name,
    priceDelta: option.priceDelta.toString(),
    inventorySku: option.inventorySku,
    isAvailable: option.isAvailable,
    displayOrder: option.displayOrder,
  };
}
function isOptionMutationData(option: InsertProductOption | ProductOptionMutationData): option is ProductOptionMutationData {
  return typeof (option as ProductOptionMutationData).priceDelta === 'number';
}

export interface IProductOptionRepository {
  findByOptionGroup(optionGroupId: string, tenantId: string): Promise<ProductOption[]>;
  findById(id: string, tenantId: string): Promise<ProductOption | null>;
  create(option: InsertProductOption | ProductOptionMutationData, tenantId: string, client?: CatalogDbContext): Promise<ProductOption>;
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
    option: InsertProductOption | ProductOptionMutationData,
    tenantId: string,
    client?: CatalogDbContext
  ): Promise<ProductOption> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      const insertData = isOptionMutationData(option) ? mapOptionMutationData(option) : option;
      const data = this.injectTenantId(insertData, tenantId);
      const result = await dbClient.insert(productOptions).values(data).returning();
      return result[0];
    } catch (error) {
      this.handleError('create option', error);
    }
  }
}
