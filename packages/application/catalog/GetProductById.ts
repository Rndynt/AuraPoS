/**
 * GetProductById Use Case
 * Retrieves a single product with full details including option groups and options
 */

import type { Product, ProductOptionGroup, ProductOption } from '@pos/domain/catalog/types';

export interface ProductWithFullDetails extends Product {
  option_groups?: ProductOptionGroup[];
}

export interface IProductRepository {
  findById(productId: string): Promise<Product | null>;
  findOptionGroupsByProductId(productId: string): Promise<ProductOptionGroup[]>;
  findOptionsByGroupIds(groupIds: string[]): Promise<Map<string, ProductOption[]>>;
}

export interface GetProductByIdInput {
  productId: string;
  tenantId: string;
}

export interface GetProductByIdOutput {
  product: ProductWithFullDetails | null;
}

export class GetProductById {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: GetProductByIdInput): Promise<GetProductByIdOutput> {
    try {
      const product = await this.productRepository.findById(input.productId);

      if (!product) {
        return { product: null };
      }

      if (product.tenant_id !== input.tenantId) {
        throw new Error('Product does not belong to the specified tenant');
      }

      const optionGroups = await this.productRepository.findOptionGroupsByProductId(product.id);

      if (optionGroups.length === 0) {
        return {
          product: {
            ...product,
            option_groups: [],
          },
        };
      }

      const groupIds = optionGroups.map(g => g.id);
      const optionsMap = await this.productRepository.findOptionsByGroupIds(groupIds);

      const groupsWithOptions = optionGroups.map(group => ({
        ...group,
        options: optionsMap.get(group.id) || [],
      }));

      return {
        product: {
          ...product,
          option_groups: groupsWithOptions,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get product by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
