/**
 * Product Repository
 * Handles product CRUD operations with tenant isolation
 */

import { Database, DbClient } from '../../database';
import type { TransactionContext } from '@pos/application/shared/ports';
import type { ProductMutationData, ProductMutationUpdateData } from '@pos/application/catalog/CreateOrUpdateProduct';
import { DrizzleUnitOfWork } from '../../unit-of-work';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  products,
  productOptionGroups,
  productOptions,
  tenants,
  type Product as DBProduct,
  type InsertProduct,
  type ProductOptionGroup as DBProductOptionGroup,
  type ProductOption as DBProductOption,
} from '@pos/infrastructure/db/schema';
import type { 
  Product, 
  ProductOptionGroup, 
  ProductOption 
} from '../../../domain/catalog/types';
import { eq, and, inArray } from 'drizzle-orm';

type CatalogDbContext = DbClient | TransactionContext;

function resolveCatalogClient(defaultClient: DbClient, context?: CatalogDbContext): DbClient {
  if (!context) return defaultClient;
  return DrizzleUnitOfWork.fromContext(context as TransactionContext) ?? (context as DbClient);
}

function mapProductMutationData(product: ProductMutationData): InsertProduct {
  return {
    tenantId: product.tenantId,
    name: product.name,
    description: product.description,
    basePrice: product.basePrice.toString(),
    category: product.category,
    categoryId: product.categoryId,
    imageUrl: product.imageUrl,
    metadata: product.metadata,
    hasVariants: product.hasVariants,
    stockTrackingEnabled: product.stockTrackingEnabled,
    stockQty: product.stockQty,
    sku: product.sku,
    isActive: product.isActive,
  };
}

function mapProductMutationUpdateData(product: ProductMutationUpdateData): Partial<InsertProduct> {
  return {
    tenantId: product.tenantId,
    name: product.name,
    description: product.description,
    basePrice: product.basePrice === undefined ? undefined : product.basePrice.toString(),
    category: product.category,
    categoryId: product.categoryId,
    imageUrl: product.imageUrl,
    metadata: product.metadata,
    hasVariants: product.hasVariants,
    stockTrackingEnabled: product.stockTrackingEnabled,
    stockQty: product.stockQty,
    sku: product.sku,
    isActive: product.isActive,
  };
}

function isProductMutationData(product: InsertProduct | ProductMutationData): product is ProductMutationData {
  return typeof (product as ProductMutationData).basePrice === 'number';
}

function isProductMutationUpdateData(product: Partial<InsertProduct> | ProductMutationUpdateData): product is ProductMutationUpdateData {
  return typeof (product as ProductMutationUpdateData).basePrice === 'number';
}

/**
 * Map database product to domain product (camelCase -> snake_case)
 */
function mapProductToDomain(dbProduct: Pick<DBProduct, 'id' | 'tenantId' | 'name' | 'description' | 'basePrice' | 'category' | 'imageUrl' | 'metadata' | 'hasVariants' | 'stockTrackingEnabled' | 'stockQty' | 'sku' | 'isActive' | 'createdAt' | 'updatedAt'>): Product {
  return {
    id: dbProduct.id,
    tenant_id: dbProduct.tenantId,
    name: dbProduct.name,
    description: dbProduct.description || undefined,
    base_price: parseFloat(dbProduct.basePrice),
    category: dbProduct.category,
    image_url: dbProduct.imageUrl || undefined,
    metadata: dbProduct.metadata as Product['metadata'] || undefined,
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
  businessType?: string;
}

export interface IProductRepository {
  findByTenant(tenantId: string, filters?: ProductFilters, client?: CatalogDbContext): Promise<Product[]>;
  findById(id: string, tenantId: string, client?: CatalogDbContext): Promise<Product | null>;
  findByIdWithOptions(id: string, tenantId: string, client?: CatalogDbContext): Promise<Product | null>;
  create(product: InsertProduct | ProductMutationData, tenantId: string, client?: CatalogDbContext): Promise<Product>;
  update(id: string, product: Partial<InsertProduct> | ProductMutationUpdateData, tenantId: string, client?: CatalogDbContext): Promise<Product>;
  delete(id: string, tenantId: string, client?: CatalogDbContext): Promise<void>;
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
    filters?: ProductFilters,
    client?: CatalogDbContext
  ): Promise<Product[]> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      
      // If businessType filter is provided, need to join with tenants table
      if (filters?.businessType) {
        const conditions = [
          eq(products.tenantId, tenantId),
          eq(tenants.businessType, filters.businessType),
        ];

        if (filters.category) {
          conditions.push(eq(products.category, filters.category));
        }

        if (filters.isActive !== undefined) {
          conditions.push(eq(products.isActive, filters.isActive));
        }

        const result = await dbClient
          .select({
            id: products.id,
            tenantId: products.tenantId,
            name: products.name,
            description: products.description,
            basePrice: products.basePrice,
            category: products.category,
            imageUrl: products.imageUrl,
            metadata: products.metadata,
            hasVariants: products.hasVariants,
            stockTrackingEnabled: products.stockTrackingEnabled,
            stockQty: products.stockQty,
            sku: products.sku,
            isActive: products.isActive,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
          })
          .from(products)
          .innerJoin(tenants, eq(products.tenantId, tenants.id))
          .where(and(...conditions));

        return result.map(mapProductToDomain);
      }

      // Standard query without businessType filter
      const conditions = [eq(products.tenantId, tenantId)];

      if (filters?.category) {
        conditions.push(eq(products.category, filters.category));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(products.isActive, filters.isActive));
      }

      const dbProducts = await dbClient
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
  async findById(id: string, tenantId: string, client?: CatalogDbContext): Promise<Product | null> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      const result = await dbClient
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
  async findByIdWithOptions(id: string, tenantId: string, client?: CatalogDbContext): Promise<Product | null> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      
      // Get the product first (already mapped to domain)
      const product = await this.findById(id, tenantId, dbClient);
      if (!product) return null;

      // Get all option groups for this product (already mapped to domain)
      const optionGroups = await this.findOptionGroupsByProductId(id, dbClient);
      
      if (optionGroups.length === 0) {
        return { ...product, option_groups: [] };
      }

      // Get all options for these groups (already mapped to domain)
      const groupIds = optionGroups.map(g => g.id);
      const optionsMap = await this.findOptionsByGroupIds(groupIds, dbClient);
      
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
  async create(product: InsertProduct | ProductMutationData, tenantId: string, client?: CatalogDbContext): Promise<Product> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      const insertData = isProductMutationData(product) ? mapProductMutationData(product) : product;
      const data = this.injectTenantId(insertData, tenantId);
      const result = await dbClient.insert(products).values(data).returning();
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
    product: Partial<InsertProduct> | ProductMutationUpdateData,
    tenantId: string,
    client?: CatalogDbContext
  ): Promise<Product> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      await this.ensureTenantAccess(id, tenantId, dbClient);

      const result = await dbClient
        .update(products)
        .set({ ...(isProductMutationUpdateData(product) ? mapProductMutationUpdateData(product) : product), updatedAt: new Date() })
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
  async delete(id: string, tenantId: string, client?: CatalogDbContext): Promise<void> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      await this.ensureTenantAccess(id, tenantId, dbClient);

      await dbClient
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
  async findOptionGroupsByProductIds(productIds: string[], client?: CatalogDbContext): Promise<Map<string, ProductOptionGroup[]>> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      if (productIds.length === 0) {
        return new Map();
      }

      const groups = await dbClient
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
  async findOptionsByGroupIds(groupIds: string[], client?: CatalogDbContext): Promise<Map<string, ProductOption[]>> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      if (groupIds.length === 0) {
        return new Map();
      }

      const options = await dbClient
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
  async findOptionGroupsByProductId(productId: string, client?: CatalogDbContext): Promise<ProductOptionGroup[]> {
    try {
      const dbClient = resolveCatalogClient(this.db, client);
      const groups = await dbClient
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
