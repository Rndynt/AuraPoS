/**
 * CheckProductAvailability Use Case
 *
 * Checks if a product has sufficient stock at the active outlet and is
 * available for purchase. The operational stock source is
 * `inventory_balances.quantity` scoped by `tenant_id + outlet_id + product_id`.
 *
 * `products.stock_qty` MUST NOT be used here (POS stock SOT — P5).
 */

import type { Product } from '@pos/domain/catalog/types';
import type { InventoryBalanceRepositoryPort } from '../inventory/ports/InventoryBalanceRepositoryPort';

export interface IProductRepository {
  findById(productId: string, tenantId: string): Promise<Product | null>;
}

export interface CheckProductAvailabilityInput {
  productId: string;
  tenantId: string;
  /**
   * Active outlet. When stock tracking is enabled this is required so the
   * check can read `inventory_balances` for the correct outlet.
   */
  outletId?: string | null;
  requestedQuantity: number;
}

export interface CheckProductAvailabilityOutput {
  isAvailable: boolean;
  product: Product | null;
  availableQuantity?: number;
  reason?: string;
}

export class CheckProductAvailability {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly inventoryBalanceRepository?: InventoryBalanceRepositoryPort,
  ) {}

  async execute(input: CheckProductAvailabilityInput): Promise<CheckProductAvailabilityOutput> {
    try {
      if (input.requestedQuantity <= 0) {
        return {
          isAvailable: false,
          product: null,
          availableQuantity: 0,
          reason: 'Jumlah yang diminta harus lebih dari nol',
        };
      }

      const product = await this.productRepository.findById(input.productId, input.tenantId);

      if (!product) {
        return {
          isAvailable: false,
          product: null,
          reason: 'Produk tidak ditemukan',
        };
      }

      if (product.tenant_id !== input.tenantId) {
        return {
          isAvailable: false,
          product: null,
          reason: 'Produk tidak terdaftar di tenant ini',
        };
      }

      if (!product.is_active) {
        return {
          isAvailable: false,
          product,
          reason: `${product.name} sedang tidak tersedia`,
        };
      }

      if (!product.stock_tracking_enabled) {
        return {
          isAvailable: true,
          product,
          reason: 'Stok tidak dilacak — produk tersedia',
        };
      }

      // Stock tracking is on: require an outlet so we can read inventory_balances.
      const outletId = input.outletId ?? null;
      if (!outletId) {
        return {
          isAvailable: false,
          product,
          availableQuantity: 0,
          reason: 'Outlet aktif belum dipilih untuk produk yang dilacak stok',
        };
      }

      if (!this.inventoryBalanceRepository) {
        // Without an inventory balance repository we must refuse rather than
        // fall back to the legacy product.stock_qty column.
        return {
          isAvailable: false,
          product,
          availableQuantity: 0,
          reason: 'Sumber stok outlet tidak terkonfigurasi',
        };
      }

      const balance = await this.inventoryBalanceRepository.getBalance(
        input.tenantId,
        outletId,
        product.id,
      );
      const quantity = balance?.quantity ?? 0;
      const reserved = balance?.reservedQuantity ?? 0;
      const available = Math.max(0, quantity - reserved);

      if (available <= 0) {
        return {
          isAvailable: false,
          product,
          availableQuantity: 0,
          reason: 'Stok habis di outlet ini',
        };
      }

      if (available < input.requestedQuantity) {
        return {
          isAvailable: false,
          product,
          availableQuantity: available,
          reason: `Stok tidak cukup di outlet ini. Tersedia: ${available}, diminta: ${input.requestedQuantity}`,
        };
      }

      return {
        isAvailable: true,
        product,
        availableQuantity: available,
        reason: 'Produk tersedia',
      };
    } catch (error) {
      throw new Error(
        `Failed to check product availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
