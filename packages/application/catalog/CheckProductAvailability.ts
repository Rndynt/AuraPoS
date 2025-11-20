/**
 * CheckProductAvailability Use Case
 * Checks if a product has sufficient stock and is available for purchase
 */

import type { Product } from '@pos/domain/catalog/types';

export interface IProductRepository {
  findById(productId: string): Promise<Product | null>;
}

export interface CheckProductAvailabilityInput {
  productId: string;
  tenantId: string;
  requestedQuantity: number;
}

export interface CheckProductAvailabilityOutput {
  isAvailable: boolean;
  product: Product | null;
  availableQuantity?: number;
  reason?: string;
}

export class CheckProductAvailability {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: CheckProductAvailabilityInput): Promise<CheckProductAvailabilityOutput> {
    try {
      if (input.requestedQuantity <= 0) {
        return {
          isAvailable: false,
          product: null,
          availableQuantity: 0,
          reason: 'Requested quantity must be greater than zero',
        };
      }

      const product = await this.productRepository.findById(input.productId);

      if (!product) {
        return {
          isAvailable: false,
          product: null,
          reason: 'Product not found',
        };
      }

      if (product.tenant_id !== input.tenantId) {
        return {
          isAvailable: false,
          product: null,
          reason: 'Product does not belong to the specified tenant',
        };
      }

      if (!product.is_active) {
        return {
          isAvailable: false,
          product,
          reason: 'Product is not active',
        };
      }

      if (!product.stock_tracking_enabled) {
        return {
          isAvailable: true,
          product,
          reason: 'Stock tracking is disabled - product is available',
        };
      }

      const stockQty = product.stock_qty ?? 0;

      if (stockQty < input.requestedQuantity) {
        return {
          isAvailable: false,
          product,
          availableQuantity: stockQty,
          reason: `Insufficient stock. Available: ${stockQty}, Requested: ${input.requestedQuantity}`,
        };
      }

      return {
        isAvailable: true,
        product,
        availableQuantity: stockQty,
        reason: 'Product is available',
      };
    } catch (error) {
      throw new Error(`Failed to check product availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
