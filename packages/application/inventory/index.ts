export {
  deductStockForItems,
  reverseStockForItems,
  InsufficientStockError,
  configureStockMovementPort,
  type StockContext,
  type StockItem,
  type StockMovementOptions,
} from './stockMovements';
export {
  resolveInventoryPolicy,
  configureInventoryPolicyPort,
  type InventoryPolicyResult,
  type InventoryStockPolicy,
} from './inventoryPolicy';
export {
  errorMessage,
  listDueInventorySyncErrors,
  markInventorySyncErrorFailed,
  markInventorySyncErrorResolved,
  markInventorySyncErrorRetrying,
  recordInventorySyncError,
  configureInventorySyncErrorPort,
  type InventorySyncErrorPayload,
  type InventorySyncErrorStatus,
  type InventorySyncOperation,
} from './inventorySyncErrors';
export type {
  InventoryPolicyPort,
  InventorySyncErrorPort,
  InventorySyncErrorRecord,
  RecordInventorySyncErrorInput,
  StockContext as InventoryPortStockContext,
  StockItem as InventoryPortStockItem,
  StockMovementPort,
} from './ports';
