/**
 * Product Repository
 * Handles product CRUD operations with tenant isolation
 */

import { Database } from '../../database';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  products,
  productOptionGroups,
  productOptions,
  type Product as DBProduct,
  type InsertProduct,
  type ProductOptionGroup as DBProductOptionGroup,
  type ProductOption as DBProductOption,
} from '../../../../shared/schema';
import type { Product } from '../../../domain/catalog/types';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Map database product to domain product (camelCase -> snake_case)
 */
function mapProductToDomain(dbProduct: DBProduct): Product {
  return {
    id: dbProduct.id,
    tenant_id: dbProduct.tenantId,
    name: dbProduct.name,
    description: dbProduct.description || undefined,
    base_price: parseFloat(dbProduct.basePrice),
    category: dbProduct.category,
    image_url: dbProduct.imageUrl || undefined,
    has_variants: dbProduct.hasVariants,
    stock_tracking_enabled: dbProduct.stockTrackingEnabled,
    stock_qty: dbProduct.stockQty || undefined,
    sku: dbProduct.sku || undefined,
    is_active: dbProduct.isActive,
    created_at: dbProduct.createdAt,
    updated_at: dbProduct.updatedAt,
  };
}

export interface ProductFilters {
  category?: string;
  isActive?: boolean;
}

export interface IProductRepository {
  findByTenant(tenantId: string, filters?: ProductFilters): Promise<Product[]>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findByIdWithOptions(id: string, tenantId: string): Promise<any | null>;
  create(product: InsertProduct, tenantId: string): Promise<Product>;
  update(id: string, product: Partial<InsertProduct>, tenantId: string): Promise<Product>;
  delete(id: string, tenantId: string): Promise<void>;
}

export class ProductRepository
  extends BaseRepository<Product, InsertProduct>
  implements IProductRepository
{
  protected table = products;
  protected entityName = 'Product';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all products for a tenant with optional filters
   */
  async findByTenant(
    tenantId: string,
    filters?: ProductFilters
  ): Promise<Product[]> {
    try {
      const conditions = [eq(products.tenantId, tenantId)];

      if (filters?.category) {
        conditions.push(eq(products.category, filters.category));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(products.isActive, filters.isActive));
      }

      const dbProducts = await this.db
        .select()
        .from(products)
        .where(and(...conditions));

      return dbProducts.map(mapProductToDomain);
    } catch (error) {
      this.handleError('find products by tenant', error);
    }
  }

  /**
   * Find product by ID with basic option groups
   */
  async findById(id: string, tenantId: string): Promise<Product | null> {
    try {
      const result = await this.db
        .select()
        .from(products)
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .limit(1);

      return result[0] ? mapProductToDomain(result[0]) : null;
    } catch (error) {
      this.handleError('find product by id', error);
    }
  }

  /**
   * Find product by ID with all option groups and options
   */
  async findByIdWithOptions(id: string, tenantId: string): Promise<any | null> {
    try {
      // Get the product first (already mapped to domain)
      const product = await this.findById(id, tenantId);
      if (!product) return null;

      // Get all option groups for this product
      const groups = await this.db
        .select()
        .from(productOptionGroups)
        .where(
          and(
            eq(productOptionGroups.productId, id),
            eq(productOptionGroups.tenantId, tenantId)
          )
        )
        .orderBy(productOptionGroups.displayOrder);

      if (groups.length === 0) {
        return { ...product, option_groups: [] };
      }

      // Get all options for these groups
      const groupIds = groups.map((g) => g.id);
      const options = await this.db
        .select()
        .from(productOptions)
        .where(
          and(
            inArray(productOptions.optionGroupId, groupIds),
            eq(productOptions.tenantId, tenantId)
          )
        )
        .orderBy(productOptions.displayOrder);

      // Map options to their groups
      const optionsByGroup = options.reduce((acc, option) => {
        if (!acc[option.optionGroupId]) {
          acc[option.optionGroupId] = [];
        }
        acc[option.optionGroupId].push({
          id: option.id,
          name: option.name,
          price_delta: parseFloat(option.priceDelta || '0'),
          inventory_sku: option.inventorySku || undefined,
          is_available: option.isAvailable,
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Build the complete product with option groups
      const optionGroups = groups.map((group) => ({
        id: group.id,
        name: group.name,
        selection_type: group.selectionType as 'single' | 'multiple',
        min_selections: group.minSelections,
        max_selections: group.maxSelections,
        is_required: group.isRequired,
        display_order: group.displayOrder,
        options: optionsByGroup[group.id] || [],
      }));

      return {
        ...product,
        option_groups: optionGroups,
      };
    } catch (error) {
      this.handleError('find product with options', error);
    }
  }

  /**
   * Create a new product
   */
  async create(product: InsertProduct, tenantId: string): Promise<Product> {
    try {
      const data = this.injectTenantId(product, tenantId);
      const result = await this.db.insert(products).values(data).returning();
      return mapProductToDomain(result[0]);
    } catch (error) {
      this.handleError('create product', error);
    }
  }

  /**
   * Update an existing product
   */
  async update(
    id: string,
    product: Partial<InsertProduct>,
    tenantId: string
  ): Promise<Product> {
    try {
      await this.ensureTenantAccess(id, tenantId);

      const result = await this.db
        .update(products)
        .set({ ...product, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new RepositoryError('Product not found', 'NOT_FOUND', null);
      }

      return mapProductToDomain(result[0]);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('update product', error);
    }
  }

  /**
   * Delete a product (soft delete by setting isActive to false)
   */
  async delete(id: string, tenantId: string): Promise<void> {
    try {
      await this.ensureTenantAccess(id, tenantId);

      await this.db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('delete product', error);
    }
  }

  /**
   * Find products by tenant ID (alias for findByTenant)
   * Used by GetProducts use case
   */
  async findByTenantId(tenantId: string): Promise<Product[]> {
    return this.findByTenant(tenantId);
  }

  /**
   * Find option groups for multiple products
   * Returns a map of productId -> option groups
   */
  async findOptionGroupsByProductIds(productIds: string[]): Promise<Map<string, DBProductOptionGroup[]>> {
    try {
      if (productIds.length === 0) {
        return new Map();
      }

      const groups = await this.db
        .select()
        .from(productOptionGroups)
        .where(inArray(productOptionGroups.productId, productIds))
        .orderBy(productOptionGroups.displayOrder);

      const groupMap = new Map<string, DBProductOptionGroup[]>();
      for (const group of groups) {
        if (!groupMap.has(group.productId)) {
          groupMap.set(group.productId, []);
        }
        groupMap.get(group.productId)!.push(group);
      }

      return groupMap;
    } catch (error) {
      this.handleError('find option groups by product ids', error);
    }
  }

  /**
   * Find options for multiple option groups
   * Returns a map of groupId -> options
   */
  async findOptionsByGroupIds(groupIds: string[]): Promise<Map<string, DBProductOption[]>> {
    try {
      if (groupIds.length === 0) {
        return new Map();
      }

      const options = await this.db
        .select()
        .from(productOptions)
        .where(inArray(productOptions.optionGroupId, groupIds))
        .orderBy(productOptions.displayOrder);

      const optionMap = new Map<string, DBProductOption[]>();
      for (const option of options) {
        if (!optionMap.has(option.optionGroupId)) {
          optionMap.set(option.optionGroupId, []);
        }
        optionMap.get(option.optionGroupId)!.push(option);
      }

      return optionMap;
    } catch (error) {
      this.handleError('find options by group ids', error);
    }
  }

  /**
   * Find option groups by product ID (for GetProductById use case)
   */
  async findOptionGroupsByProductId(productId: string): Promise<DBProductOptionGroup[]> {
    try {
      return await this.db
        .select()
        .from(productOptionGroups)
        .where(eq(productOptionGroups.productId, productId))
        .orderBy(productOptionGroups.displayOrder);
    } catch (error) {
      this.handleError('find option groups by product id', error);
    }
  }
}
