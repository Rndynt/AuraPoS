import { resolveInventoryPolicy } from '../../inventory';
import type { UnitOfWorkPort } from '../../shared/ports/UnitOfWorkPort';
import {
  STOCK_DEDUCTED_STATES,
  OrderInventoryWorkflowError,
  applyOrderInventoryMovement,
  orderItemsForStock,
  orderStockContext,
  type CancelOrderUseCaseForWorkflow,
  type OrderRepositoryForWorkflow,
} from './orderInventoryWorkflow';

export type CancelOrderWorkflowInput = {
  tenantId: string;
  outletId?: string | null;
  orderId: string;
  actorId?: string | null;
  cancellationReason?: string | null;
};

export type CancelOrderWorkflowOutput = Awaited<ReturnType<CancelOrderUseCaseForWorkflow['execute']>>;

export class CancelOrderWorkflow {
  constructor(
    private readonly cancelOrder: CancelOrderUseCaseForWorkflow,
    private readonly orderRepository: OrderRepositoryForWorkflow,
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(input: CancelOrderWorkflowInput): Promise<CancelOrderWorkflowOutput> {
    const policy = await resolveInventoryPolicy(input.tenantId);

    if (policy.policy === 'strict') {
      return this.unitOfWork.transaction(async (tx) => {
        const orderBeforeCancel = await this.orderRepository.findById(input.orderId, input.tenantId, tx);
        assertOrderVisibleForOutlet(orderBeforeCancel, input.outletId);

        const result = await this.cancelOrder.execute({
          order_id: input.orderId,
          tenant_id: input.tenantId,
          cancellation_reason: input.cancellationReason ?? undefined,
          transaction: tx,
        });

        if (STOCK_DEDUCTED_STATES.has(orderBeforeCancel.status) && orderBeforeCancel.items?.length) {
          await applyOrderInventoryMovement(
            input.tenantId,
            orderItemsForStock(orderBeforeCancel),
            orderStockContext(orderBeforeCancel, input.outletId),
            'reverse_return',
            { tx, policy },
          );
        }

        return result;
      });
    }

    const orderBeforeCancel = await this.orderRepository.findById(input.orderId, input.tenantId);
    assertOrderVisibleForOutlet(orderBeforeCancel, input.outletId);

    const result = await this.cancelOrder.execute({
      order_id: input.orderId,
      tenant_id: input.tenantId,
      cancellation_reason: input.cancellationReason ?? undefined,
    });

    if (
      orderBeforeCancel &&
      STOCK_DEDUCTED_STATES.has(orderBeforeCancel.status) &&
      orderBeforeCancel.items?.length
    ) {
      await applyOrderInventoryMovement(
        input.tenantId,
        orderItemsForStock(orderBeforeCancel),
        orderStockContext(orderBeforeCancel, input.outletId),
        'reverse_return',
        { policy },
      );
    }

    return result;
  }
}

function assertOrderVisibleForOutlet(order: any | null, outletId?: string | null): asserts order is any {
  if (!order) {
    throw new OrderInventoryWorkflowError('Order not found', 404, 'ORDER_NOT_FOUND');
  }
  if (outletId && order.outletId !== outletId) {
    throw new OrderInventoryWorkflowError('Order not found for this outlet', 404, 'ORDER_NOT_FOUND');
  }
}
