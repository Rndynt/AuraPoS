import type { TransactionContext } from '../../shared/ports/UnitOfWorkPort';

export interface InventoryBalanceRecord {
  id: string;
  tenantId: string;
  outletId: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number | null;
  lastMovementId: string | null;
  lastCountedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertBalanceInput {
  tenantId: string;
  outletId: string;
  productId: string;
  quantityDelta: number;
  lastMovementId?: string | null;
}

export interface SetBalanceInput {
  tenantId: string;
  outletId: string;
  productId: string;
  quantity: number;
  lastMovementId?: string | null;
  lastCountedAt?: Date | null;
}

export interface InventoryBalanceRepositoryPort {
  /**
   * Get balance for a specific product/outlet. Returns null if not found.
   */
  getBalance(
    tenantId: string,
    outletId: string,
    productId: string,
    ctx?: TransactionContext,
  ): Promise<InventoryBalanceRecord | null>;

  /**
   * Get balances for all tracked products in an outlet.
   */
  listBalances(
    tenantId: string,
    outletId: string,
    ctx?: TransactionContext,
  ): Promise<InventoryBalanceRecord[]>;

  /**
   * Atomically apply a quantity delta (+ or -). Creates balance row if missing.
   * Uses SELECT ... FOR UPDATE to prevent lost updates.
   */
  applyDelta(
    input: UpsertBalanceInput,
    ctx?: TransactionContext,
  ): Promise<InventoryBalanceRecord>;

  /**
   * Overwrite quantity absolutely (for opname approval / initial set).
   */
  setQuantity(
    input: SetBalanceInput,
    ctx?: TransactionContext,
  ): Promise<InventoryBalanceRecord>;

  /**
   * Update the low stock threshold for a product/outlet balance.
   */
  setThreshold(
    tenantId: string,
    outletId: string,
    productId: string,
    threshold: number | null,
    ctx?: TransactionContext,
  ): Promise<InventoryBalanceRecord | null>;

  /**
   * List products below their effective threshold.
   */
  listLowStock(
    tenantId: string,
    outletId: string,
    defaultThreshold?: number,
    ctx?: TransactionContext,
  ): Promise<InventoryBalanceRecord[]>;
}
