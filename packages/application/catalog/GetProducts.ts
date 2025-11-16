/**
 * GetProducts Use Case
 * Fetches products with option groups for a tenant
 */

import type { Product, ProductOptionGroup, ProductOption } from '@pos/domain/catalog/types';

export interface ProductWithOptions extends Product {
  option_groups?: ProductOptionGroup[];
}

export interface IProductRepository {
  findByTenantId(tenantId: string): Promise<Product[]>;
  findOptionGroupsByProductIds(productIds: string[]): Promise<Map<string, ProductOptionGroup[]>>;
  findOptionsByGroupIds(groupIds: string[]): Promise<Map<string, ProductOption[]>>;
}

export interface GetProductsInput {
  tenantId: string;
  category?: string;
  isActive?: boolean;
}

export interface GetProductsOutput {
  products: ProductWithOptions[];
  total: number;
}

export class GetProducts {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: GetProductsInput): Promise<GetProductsOutput> {
    try {
      let products = await this.productRepository.findByTenantId(input.tenantId);

      if (input.category) {
        products = products.filter(p => p.category === input.category);
      }

      if (input.isActive !== undefined) {
        products = products.filter(p => p.is_active === input.isActive);
      }

      if (products.length === 0) {
        return { products: [], total: 0 };
      }

      const productIds = products.map(p => p.id);
      const optionGroupsMap = await this.productRepository.findOptionGroupsByProductIds(productIds);

      const allGroupIds: string[] = [];
      for (const groups of Array.from(optionGroupsMap.values())) {
        allGroupIds.push(...groups.map((g: ProductOptionGroup) => g.id));
      }

      const optionsMap = allGroupIds.length > 0
        ? await this.productRepository.findOptionsByGroupIds(allGroupIds)
        : new Map();

      const productsWithOptions: ProductWithOptions[] = products.map(product => {
        const groups = optionGroupsMap.get(product.id) || [];
        const groupsWithOptions = groups.map(group => ({
          ...group,
          options: optionsMap.get(group.id) || [],
        }));

        return {
          ...product,
          option_groups: groupsWithOptions,
        };
      });

      return {
        products: productsWithOptions,
        total: productsWithOptions.length,
      };
    } catch (error) {
      throw new Error(`Failed to get products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
