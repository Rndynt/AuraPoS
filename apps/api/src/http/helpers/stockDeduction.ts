/**
 * Stock Deduction Helper
 *
 * API-facing compatibility wrapper around the application inventory stock
 * movement helpers. The implementation is transaction-aware: callers may pass a
 * tx to make stock updates part of a wider unit of work, or omit it to let the
 * helper open its own db.transaction for SELECT ... FOR UPDATE, products.stockQty
 * updates, and inventory_movements inserts.
 */

export {
  deductStockForItems,
  reverseStockForItems,
  InsufficientStockError,
  type StockContext,
  type StockItem,
  type StockMovementOptions,
} from '@pos/application/inventory/stockMovements';

/**
 * States where stock has already been deducted.
 * Used to determine whether cancellation should restore stock.
 */
export const STOCK_DEDUCTED_STATES = new Set([
  'confirmed',
  'in_progress',
  'preparing',
  'ready',
  'served',
  'completed',
]);
