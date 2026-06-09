import type { TransactionContext } from '../../shared/ports/UnitOfWorkPort';
import type { StockContext, StockItem } from '../../inventory/ports/StockMovementPort';

export interface OrderInventoryOptions {
  transaction?: TransactionContext;
  allowNegativeStock?: boolean;
}

export interface OrderInventoryPort {
  deductStockForItems(
    tenantId: string,
    items: StockItem[],
    context?: StockContext,
    options?: OrderInventoryOptions,
  ): Promise<void>;
  reverseStockForItems(
    tenantId: string,
    items: StockItem[],
    context?: StockContext,
    options?: OrderInventoryOptions,
  ): Promise<void>;
}
