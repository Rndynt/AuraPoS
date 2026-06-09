import { resolveInventoryPolicy } from '../../inventory';
import type { UnitOfWorkPort } from '../../shared/ports/UnitOfWorkPort';
import {
  applyOrderInventoryMovement,
  orderItemsForStock,
  orderStockContext,
  type ConfirmOrderUseCaseForWorkflow,
} from './orderInventoryWorkflow';

export type ConfirmOrderWorkflowInput = {
  tenantId: string;
  outletId?: string | null;
  orderId: string;
  actorId?: string | null;
};

export type ConfirmOrderWorkflowOutput = Awaited<ReturnType<ConfirmOrderUseCaseForWorkflow['execute']>>;

export class ConfirmOrderWorkflow {
  constructor(
    private readonly confirmOrder: ConfirmOrderUseCaseForWorkflow,
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(input: ConfirmOrderWorkflowInput): Promise<ConfirmOrderWorkflowOutput> {
    const policy = await resolveInventoryPolicy(input.tenantId);

    if (policy.policy === 'strict') {
      return this.unitOfWork.transaction(async (tx) => {
        const result = await this.confirmOrder.execute({
          order_id: input.orderId,
          tenant_id: input.tenantId,
          transaction: tx,
        });

        const items = orderItemsForStock(result.order);
        if (items.length > 0) {
          await applyOrderInventoryMovement(
            input.tenantId,
            items,
            orderStockContext(result.order, input.outletId),
            'deduct_sale',
            { tx, policy },
          );
        }

        return result;
      });
    }

    const result = await this.confirmOrder.execute({
      order_id: input.orderId,
      tenant_id: input.tenantId,
    });

    const items = orderItemsForStock(result.order);
    if (items.length > 0) {
      await applyOrderInventoryMovement(
        input.tenantId,
        items,
        orderStockContext(result.order, input.outletId),
        'deduct_sale',
        { policy },
      );
    }

    return result;
  }
}
