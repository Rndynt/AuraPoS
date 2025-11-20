/**
 * CreateOrUpdateProduct Use Case
 * Handles product creation and updates with option groups atomically with transaction support
 */

import type { Product } from '@pos/domain/catalog/types';
import type { 
  ProductOptionGroup as DomainProductOptionGroup,
  ProductOption as DomainProductOption 
} from '@pos/domain/catalog/types';
import type { 
  InsertProduct, 
  InsertProductOptionGroup, 
  InsertProductOption,
  ProductOptionGroup as DBProductOptionGroup,
  ProductOption as DBProductOption,
  Tenant
} from '../../../shared/schema';
import type { Database, DbClient } from '@pos/infrastructure/database';

/**
 * Input type for option within an option group
 */
export interface CreateOrUpdateProductOptionInput {
  name: string;
  price_delta: number;
  inventory_sku?: string;
  is_available?: boolean;
  display_order?: number;
}

/**
 * Input type for option group
 */
export interface CreateOrUpdateProductOptionGroupInput {
  name: string;
  selection_type: 'single' | 'multiple';
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  display_order?: number;
  options: CreateOrUpdateProductOptionInput[];
}

/**
 * Use case input
 */
export interface CreateOrUpdateProductInput {
  tenant_id: string;
  product_id?: string;
  name: string;
  description?: string;
  base_price: number;
  category: string;
  image_url?: string;
  metadata?: {
    service_duration_minutes?: number;
    weight_based?: boolean;
    weight_unit?: 'kg' | 'lbs' | 'gr';
    sku_type?: 'physical' | 'digital' | 'service' | 'ppob';
    [key: string]: any;
  };
  has_variants?: boolean;
  stock_tracking_enabled?: boolean;
  stock_qty?: number;
  sku?: string;
  is_active?: boolean;
  option_groups?: CreateOrUpdateProductOptionGroupInput[];
}

/**
 * Use case output
 */
export interface CreateOrUpdateProductOutput {
  product: Product & { option_groups?: DomainProductOptionGroup[] };
  isNew: boolean;
}

/**
 * Repository interfaces with proper typing
 */
export interface IProductRepository {
  findById(id: string, tenantId: string, client?: DbClient): Promise<Product | null>;
  create(product: InsertProduct, tenantId: string, client?: DbClient): Promise<Product>;
  update(id: string, product: Partial<InsertProduct>, tenantId: string, client?: DbClient): Promise<Product>;
  findByIdWithOptions(id: string, tenantId: string, client?: DbClient): Promise<Product & { option_groups?: DomainProductOptionGroup[] } | null>;
}

export interface IProductOptionGroupRepository {
  create(optionGroup: InsertProductOptionGroup, tenantId: string, client?: DbClient): Promise<DBProductOptionGroup>;
  deleteByProductId(productId: string, tenantId: string, client?: DbClient): Promise<void>;
}

export interface IProductOptionRepository {
  create(option: InsertProductOption, tenantId: string, client?: DbClient): Promise<DBProductOption>;
}

export interface ITenantRepository {
  findById(tenantId: string): Promise<Tenant | null>;
}

/**
 * CreateOrUpdateProduct Use Case
 * Atomically creates or updates a product with its option groups and options using database transactions
 */
export class CreateOrUpdateProduct {
  constructor(
    private readonly db: Database,
    private readonly productRepository: IProductRepository,
    private readonly productOptionGroupRepository: IProductOptionGroupRepository,
    private readonly productOptionRepository: IProductOptionRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  async execute(input: CreateOrUpdateProductInput): Promise<CreateOrUpdateProductOutput> {
    try {
      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Verify tenant exists (outside transaction - read-only check)
      const tenant = await this.tenantRepository.findById(input.tenant_id);
      if (!tenant) {
        throw new Error(`Tenant with ID '${input.tenant_id}' not found`);
      }

      // Step 3: Determine if this is a create or update operation (outside transaction - read-only check)
      let existingProduct: Product | null = null;
      let isCreating = false;
      
      if (input.product_id) {
        existingProduct = await this.productRepository.findById(
          input.product_id,
          input.tenant_id
        );
        
        if (!existingProduct) {
          throw new Error(
            `Product with ID '${input.product_id}' not found for tenant '${input.tenant_id}'`
          );
        }
        
        if (existingProduct.tenant_id !== input.tenant_id) {
          throw new Error(
            `Product '${input.product_id}' does not belong to tenant '${input.tenant_id}'`
          );
        }
        isCreating = false;
      } else {
        isCreating = true;
      }

      // Step 4: Execute all write operations within a transaction for atomicity
      const result = await this.db.transaction(async (tx) => {
        let product: Product;

        // Create or update product
        if (isCreating) {
          console.log(`[CreateOrUpdateProduct] Creating new product: ${input.name}`);
          const productData = this.prepareCreateData(input);
          product = await this.productRepository.create(productData, input.tenant_id, tx);
          console.log(`[CreateOrUpdateProduct] Product created with ID: ${product.id}`);
        } else {
          console.log(`[CreateOrUpdateProduct] Updating product: ${input.product_id}`);
          const productData = this.prepareUpdateData(input);
          product = await this.productRepository.update(
            input.product_id!,
            productData,
            input.tenant_id,
            tx
          );
          console.log(`[CreateOrUpdateProduct] Product updated successfully`);
          
          // For updates, delete existing option groups if option_groups field is provided
          // (cascade will delete options automatically)
          // This allows clearing all groups by passing an empty array
          if (input.option_groups !== undefined) {
            console.log(`[CreateOrUpdateProduct] Deleting existing option groups for product: ${input.product_id}`);
            await this.productOptionGroupRepository.deleteByProductId(
              input.product_id!,
              input.tenant_id,
              tx
            );
            console.log(`[CreateOrUpdateProduct] Existing option groups deleted`);
          }
        }

        // Create option groups and options (if provided)
        if (input.option_groups && input.option_groups.length > 0) {
          console.log(`[CreateOrUpdateProduct] Creating ${input.option_groups.length} option groups`);
          
          for (let index = 0; index < input.option_groups.length; index++) {
            const optionGroupInput = input.option_groups[index];
            
            // Validate option group
            this.validateOptionGroup(optionGroupInput);
            
            // Prepare option group data with proper types
            const optionGroupData: InsertProductOptionGroup = {
              productId: product.id,
              tenantId: input.tenant_id,
              name: optionGroupInput.name,
              selectionType: optionGroupInput.selection_type,
              minSelections: optionGroupInput.min_selections,
              maxSelections: optionGroupInput.max_selections,
              isRequired: optionGroupInput.is_required,
              displayOrder: optionGroupInput.display_order ?? index,
            };
            
            const createdOptionGroup = await this.productOptionGroupRepository.create(
              optionGroupData,
              input.tenant_id,
              tx
            );
            
            console.log(`[CreateOrUpdateProduct] Option group created: ${createdOptionGroup.id} - ${optionGroupInput.name}`);
            
            // Create options for this group
            if (optionGroupInput.options && optionGroupInput.options.length > 0) {
              console.log(`[CreateOrUpdateProduct] Creating ${optionGroupInput.options.length} options for group: ${optionGroupInput.name}`);
              
              for (let optionIndex = 0; optionIndex < optionGroupInput.options.length; optionIndex++) {
                const optionInput = optionGroupInput.options[optionIndex];
                
                // Prepare option data with proper types
                // Convert number to string only at database boundary (Drizzle decimal field requirement)
                const optionData: InsertProductOption = {
                  optionGroupId: createdOptionGroup.id,
                  tenantId: input.tenant_id,
                  name: optionInput.name,
                  priceDelta: optionInput.price_delta.toString(),
                  inventorySku: optionInput.inventory_sku,
                  isAvailable: optionInput.is_available ?? true,
                  displayOrder: optionInput.display_order ?? optionIndex,
                };
                
                const createdOption = await this.productOptionRepository.create(
                  optionData,
                  input.tenant_id,
                  tx
                );
                
                console.log(`[CreateOrUpdateProduct] Option created: ${createdOption.id} - ${optionInput.name}`);
              }
            }
          }
          
          console.log(`[CreateOrUpdateProduct] All option groups and options created successfully`);
        }

        return product;
      });

      // Step 5: Retrieve the complete product with option groups (outside transaction)
      const productWithOptions = await this.productRepository.findByIdWithOptions(
        result.id,
        input.tenant_id
      );

      if (!productWithOptions) {
        throw new Error(
          `Failed to retrieve ${isCreating ? 'created' : 'updated'} product with ID: ${result.id}`
        );
      }

      console.log(`[CreateOrUpdateProduct] Product ${isCreating ? 'creation' : 'update'} completed successfully`);

      return {
        product: productWithOptions,
        isNew: isCreating,
      };
    } catch (error) {
      // Enhanced error handling with detailed context
      const operation = input.product_id ? 'update' : 'create';
      console.error(`[CreateOrUpdateProduct] Error during product ${operation}:`, error);
      
      if (error instanceof Error) {
        throw new Error(
          `Failed to ${operation} product '${input.name}' for tenant '${input.tenant_id}': ${error.message}`
        );
      }
      
      throw new Error(
        `Failed to ${operation} product '${input.name}' for tenant '${input.tenant_id}': Unknown error occurred`
      );
    }
  }

  /**
   * Validate input data
   */
  private validateInput(input: CreateOrUpdateProductInput): void {
    // Validate tenant ID
    if (!input.tenant_id || input.tenant_id.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }

    // Validate product name
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Product name is required and cannot be empty');
    }

    // Validate base price
    if (input.base_price < 0) {
      throw new Error('Base price must be greater than or equal to 0');
    }

    // Validate category
    if (!input.category || input.category.trim().length === 0) {
      throw new Error('Product category is required');
    }

    // Validate stock quantity if stock tracking is enabled
    if (input.stock_tracking_enabled && input.stock_qty !== undefined && input.stock_qty < 0) {
      throw new Error('Stock quantity must be greater than or equal to 0');
    }
  }

  /**
   * Validate option group data
   */
  private validateOptionGroup(optionGroup: CreateOrUpdateProductOptionGroupInput): void {
    // Validate name
    if (!optionGroup.name || optionGroup.name.trim().length === 0) {
      throw new Error('Option group name is required');
    }

    // Validate selection type
    if (optionGroup.selection_type !== 'single' && optionGroup.selection_type !== 'multiple') {
      throw new Error(
        `Invalid selection type '${optionGroup.selection_type}'. Must be 'single' or 'multiple'`
      );
    }

    // Validate min_selections <= max_selections
    if (optionGroup.min_selections > optionGroup.max_selections) {
      throw new Error(
        `Invalid option group '${optionGroup.name}': min_selections (${optionGroup.min_selections}) ` +
        `must be less than or equal to max_selections (${optionGroup.max_selections})`
      );
    }

    // Validate required groups have min_selections >= 1
    if (optionGroup.is_required && optionGroup.min_selections < 1) {
      throw new Error(
        `Invalid option group '${optionGroup.name}': Required option groups must have ` +
        `min_selections >= 1 (current: ${optionGroup.min_selections})`
      );
    }

    // Validate that min/max selections are non-negative
    if (optionGroup.min_selections < 0) {
      throw new Error(
        `Invalid option group '${optionGroup.name}': min_selections must be >= 0`
      );
    }

    if (optionGroup.max_selections < 1) {
      throw new Error(
        `Invalid option group '${optionGroup.name}': max_selections must be >= 1`
      );
    }

    // Validate options
    if (!optionGroup.options || optionGroup.options.length === 0) {
      throw new Error(
        `Option group '${optionGroup.name}' must have at least one option`
      );
    }

    // Validate each option
    for (const option of optionGroup.options) {
      if (!option.name || option.name.trim().length === 0) {
        throw new Error(
          `Option name is required in option group '${optionGroup.name}'`
        );
      }

      if (option.price_delta === undefined || option.price_delta === null) {
        throw new Error(
          `Price delta is required for option '${option.name}' in group '${optionGroup.name}'`
        );
      }
    }
  }

  /**
   * Prepare product data for create operations with defaults
   * Convert number to string only at database boundary (Drizzle decimal field requirement)
   */
  private prepareCreateData(input: CreateOrUpdateProductInput): InsertProduct {
    return {
      tenantId: input.tenant_id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price.toString(),
      category: input.category,
      imageUrl: input.image_url,
      metadata: input.metadata,
      hasVariants: input.has_variants ?? false,
      stockTrackingEnabled: input.stock_tracking_enabled ?? false,
      stockQty: input.stock_qty,
      sku: input.sku,
      isActive: input.is_active ?? true,
    };
  }

  /**
   * Prepare product data for update operations - only includes explicitly provided fields
   * This preserves existing values for omitted fields
   * Convert number to string only at database boundary (Drizzle decimal field requirement)
   */
  private prepareUpdateData(input: CreateOrUpdateProductInput): Partial<InsertProduct> {
    const updateData: Partial<InsertProduct> = {
      tenantId: input.tenant_id,
      name: input.name,
      basePrice: input.base_price.toString(),
      category: input.category,
    };

    // Only include optional fields if explicitly provided
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.image_url !== undefined) {
      updateData.imageUrl = input.image_url;
    }

    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata;
    }

    // Optional booleans - only include if explicitly provided
    if (input.has_variants !== undefined) {
      updateData.hasVariants = input.has_variants;
    }

    if (input.stock_tracking_enabled !== undefined) {
      updateData.stockTrackingEnabled = input.stock_tracking_enabled;
    }

    if (input.is_active !== undefined) {
      updateData.isActive = input.is_active;
    }

    if (input.stock_qty !== undefined) {
      updateData.stockQty = input.stock_qty;
    }

    if (input.sku !== undefined) {
      updateData.sku = input.sku;
    }

    return updateData;
  }
}
