import type { TransactionContext } from '../shared/ports/UnitOfWorkPort';
import type { InventorySyncErrorPort } from './ports/InventorySyncErrorPort';
import type { StockContext, StockItem } from './stockMovements';

export type InventorySyncOperation = 'deduct_sale' | 'reverse_return';
export type InventorySyncErrorStatus = 'pending' | 'retrying' | 'resolved' | 'failed';

export interface InventorySyncErrorPayload {
  operation: InventorySyncOperation;
  items: StockItem[];
  context: StockContext;
  policy: 'allow_negative';
}

export interface RecordInventorySyncErrorInput {
  tenantId: string;
  outletId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  operation: InventorySyncOperation;
  payload: InventorySyncErrorPayload;
  error: unknown;
  nextRetryAt?: Date;
}

let defaultInventorySyncErrorPort: InventorySyncErrorPort | undefined;

export function configureInventorySyncErrorPort(port: InventorySyncErrorPort): void {
  defaultInventorySyncErrorPort = port;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Unknown inventory sync error';
}

function getInventorySyncErrorPort(): InventorySyncErrorPort {
  if (!defaultInventorySyncErrorPort) {
    throw new Error('Inventory sync error port has not been configured');
  }
  return defaultInventorySyncErrorPort;
}

export async function recordInventorySyncError(
  input: RecordInventorySyncErrorInput,
  context?: TransactionContext,
) {
  return getInventorySyncErrorPort().recordInventorySyncError(input, context);
}

export async function markInventorySyncErrorRetrying(id: string, context?: TransactionContext) {
  return getInventorySyncErrorPort().markInventorySyncErrorRetrying(id, context);
}

export async function markInventorySyncErrorResolved(id: string, context?: TransactionContext) {
  return getInventorySyncErrorPort().markInventorySyncErrorResolved(id, context);
}

export async function markInventorySyncErrorFailed(
  id: string,
  error: unknown,
  retryDelayMs: number,
  maxRetries: number,
  context?: TransactionContext,
) {
  return getInventorySyncErrorPort().markInventorySyncErrorFailed(
    id,
    error,
    retryDelayMs,
    maxRetries,
    context,
  );
}

export async function listDueInventorySyncErrors(limit: number, context?: TransactionContext) {
  return getInventorySyncErrorPort().listDueInventorySyncErrors(limit, context);
}
