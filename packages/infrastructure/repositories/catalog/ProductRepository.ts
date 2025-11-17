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
import type { 
  Product, 
  ProductOptionGroup, 
  ProductOption 
} from '../../../domain/catalog/types';
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

/**
 * Map database option group to domain option group (camelCase -> snake_case)
 */
function mapOptionGroupToDomain(dbGroup: DBProductOptionGroup, options: ProductOption[] = []): ProductOptionGroup {
  return {
    id: dbGroup.id,
    name: dbGroup.name,
    selection_type: dbGroup.selectionType as 'single' | 'multiple',
    min_selections: dbGroup.minSelections,
    max_selections: dbGroup.maxSelections,
    is_required: dbGroup.isRequired,
    display_order: dbGroup.displayOrder,
    options: options,
  };
}

/**
 * Map database option to domain option (camelCase -> snake_case)
 */
function mapOptionToDomain(dbOption: DBProductOption): ProductOption {
  return {
    id: dbOption.id,
    name: dbOption.name,
    price_delta: Number(dbOption.priceDelta || 0),
    inventory_sku: dbOption.inventorySku || undefined,
    is_available: dbOption.isAvailable ?? true,
  };
}

export interface ProductFilters {
  category?: string;
  isActive?: boolean;
}

export interface IProductRepository {
  findByTenant(tenantId: string, filters?: ProductFilters): Promise<Product[]>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findByIdWithOptions(id: string, tenantId: string): Promise<Product | null>;
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
  async findByIdWithOptions(id: string, tenantId: string): Promise<Product | null> {
    try {
      // Get the product first (already mapped to domain)
      const product = await this.findById(id, tenantId);
      if (!product) return null;

      // Get all option groups for this product (already mapped to domain)
      const optionGroups = await this.findOptionGroupsByProductId(id);
      
      if (optionGroups.length === 0) {
        return { ...product, option_groups: [] };
      }

      // Get all options for these groups (already mapped to domain)
      const groupIds = optionGroups.map(g => g.id);
      const optionsMap = await this.findOptionsByGroupIds(groupIds);
      
      // Combine groups with their options
      const groupsWithOptions = optionGroups.map(group => ({
        ...group,
        options: optionsMap.get(group.id) || [],
      }));
      
      return {
        ...product,
        option_groups: groupsWithOptions,
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
   * Returns a map of productId -> option groups (mapped to domain types)
   */
  async findOptionGroupsByProductIds(productIds: string[]): Promise<Map<string, ProductOptionGroup[]>> {
    try {
      if (productIds.length === 0) {
        return new Map();
      }

      const groups = await this.db
        .select()
        .from(productOptionGroups)
        .where(inArray(productOptionGroups.productId, productIds))
        .orderBy(productOptionGroups.displayOrder);

      const groupMap = new Map<string, ProductOptionGroup[]>();
      for (const group of groups) {
        if (!groupMap.has(group.productId)) {
          groupMap.set(group.productId, []);
        }
        // Map to domain type with snake_case fields
        groupMap.get(group.productId)!.push(mapOptionGroupToDomain(group));
      }

      return groupMap;
    } catch (error) {
      this.handleError('find option groups by product ids', error);
    }
  }

  /**
   * Find options for multiple option groups
   * Returns a map of groupId -> options (mapped to domain types)
   */
  async findOptionsByGroupIds(groupIds: string[]): Promise<Map<string, ProductOption[]>> {
    try {
      if (groupIds.length === 0) {
        return new Map();
      }

      const options = await this.db
        .select()
        .from(productOptions)
        .where(inArray(productOptions.optionGroupId, groupIds))
        .orderBy(productOptions.displayOrder);

      const optionMap = new Map<string, ProductOption[]>();
      for (const option of options) {
        if (!optionMap.has(option.optionGroupId)) {
          optionMap.set(option.optionGroupId, []);
        }
        // Map to domain type with snake_case fields
        optionMap.get(option.optionGroupId)!.push(mapOptionToDomain(option));
      }

      return optionMap;
    } catch (error) {
      this.handleError('find options by group ids', error);
    }
  }

  /**
   * Find option groups by product ID (for GetProductById use case)
   * Returns option groups mapped to domain types
   */
  async findOptionGroupsByProductId(productId: string): Promise<ProductOptionGroup[]> {
    try {
      const groups = await this.db
        .select()
        .from(productOptionGroups)
        .where(eq(productOptionGroups.productId, productId))
        .orderBy(productOptionGroups.displayOrder);
      
      // Map to domain types with snake_case fields
      return groups.map(group => mapOptionGroupToDomain(group));
    } catch (error) {
      this.handleError('find option groups by product id', error);
    }
  }
}
