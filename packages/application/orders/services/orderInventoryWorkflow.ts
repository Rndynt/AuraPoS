import {
  deductStockForItems,
  reverseStockForItems,
  resolveInventoryPolicy,
  recordInventorySyncError,
  errorMessage,
  type InventoryPolicyResult,
  type InventorySyncOperation,
  type StockContext,
  type StockItem,
} from '../../inventory';
import type { TransactionContext } from '../../shared/ports/UnitOfWorkPort';

export type OrderInventoryMovementResult = {
  policy: 'strict' | 'allow_negative';
  syncErrorId?: string;
};

export type OrderLikeForInventory = {
  id: string;
  order_number?: string | null;
  orderNumber?: string | null;
  items?: Array<{
    productId?: string | null;
    product_id?: string | null;
    quantity?: number | null;
  }> | null;
};

export const STOCK_DEDUCTED_STATES = new Set([
  'confirmed',
  'in_progress',
  'preparing',
  'ready',
  'served',
  'completed',
]);

export class OrderInventoryWorkflowError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'OrderInventoryWorkflowError';
  }
}

export function orderItemsForStock(order: OrderLikeForInventory): StockItem[] {
  return (order.items ?? []).map((item) => ({
    productId: (item.productId ?? item.product_id) as string,
    quantity: item.quantity ?? 1,
  }));
}

export function orderStockContext(order: OrderLikeForInventory, outletId?: string | null): StockContext {
  return {
    orderId: order.id,
    orderNumber: order.order_number ?? order.orderNumber ?? undefined,
    outletId: outletId ?? null,
  };
}

export async function applyOrderInventoryMovement(
  tenantId: string,
  items: StockItem[],
  ctx: StockContext,
  operation: InventorySyncOperation,
  options: { tx?: TransactionContext; policy?: InventoryPolicyResult } = {},
): Promise<OrderInventoryMovementResult> {
  const policy = options.policy ?? await resolveInventoryPolicy(tenantId, options.tx);
  const moveStock = operation === 'deduct_sale' ? deductStockForItems : reverseStockForItems;

  if (policy.policy === 'strict') {
    try {
      await moveStock(tenantId, items, ctx, { tx: options.tx, allowNegativeStock: false });
      return { policy: policy.policy };
    } catch (error: any) {
      throw new OrderInventoryWorkflowError(
        `Inventory movement must succeed before order confirmation/completion in strict mode: ${errorMessage(error)}`,
        Number(error?.statusCode) || 409,
        error?.code || 'INVENTORY_MOVEMENT_REQUIRED',
      );
    }
  }

  try {
    await moveStock(tenantId, items, ctx, { tx: options.tx, allowNegativeStock: true });
    return { policy: policy.policy };
  } catch (error) {
    const record = await recordInventorySyncError({
      tenantId,
      outletId: ctx.outletId ?? null,
      orderId: ctx.orderId ?? null,
      productId: items.length === 1 ? items[0]?.productId ?? null : null,
      operation,
      payload: { operation, items, context: ctx, policy: 'allow_negative' },
      error,
    });
    console.warn(
      `[inventory_sync_errors] Recorded ${operation} failure for retry`,
      { tenantId, orderId: ctx.orderId, syncErrorId: record.id, error: errorMessage(error) },
    );
    return { policy: policy.policy, syncErrorId: record.id };
  }
}

export type OrderRepositoryForWorkflow = {
  findById(orderId: string, tenantId: string, context?: TransactionContext): Promise<OrderForWorkflow | null>;
};

/** Minimal order shape needed by cancel/confirm workflows. */
export type OrderForWorkflow = OrderLikeForInventory & {
  outletId?: string | null;
  outlet_id?: string | null;
  status: string;
  payment_status?: string | null;
  paymentStatus?: string | null;
};

export type ConfirmOrderUseCaseForWorkflow = {
  execute(input: {
    order_id: string;
    tenant_id: string;
    transaction?: TransactionContext;
  }): Promise<{ order: OrderForWorkflow }>;
};

export type CancelOrderUseCaseForWorkflow = {
  execute(input: {
    order_id: string;
    tenant_id: string;
    cancellation_reason?: string | null;
    transaction?: TransactionContext;
  }): Promise<{ order: OrderForWorkflow }>;
};
