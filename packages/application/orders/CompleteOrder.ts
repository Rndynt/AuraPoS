/**
 * CompleteOrder Use Case
 * Marks an order as completed after validating status and payment
 */

import type { Order } from '@pos/domain/orders/types';
import { assertTransition, canCompleteOrder } from '@pos/domain/orders/OrderStateValidator';

export interface CompleteOrderInput {
  order_id: string;
  tenant_id: string;
}

export interface CompleteOrderOutput {
  order: Order;
}

export interface IOrderRepository {
  findById(orderId: string): Promise<Order | null>;
  update(orderId: string, updates: Partial<Order>): Promise<Order>;
}

export interface ITenantRepository {
  findById(tenantId: string): Promise<{ id: string; is_active: boolean } | null>;
}

export class CompleteOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  async execute(input: CompleteOrderInput): Promise<CompleteOrderOutput> {
    try {
      const tenant = await this.tenantRepository.findById(input.tenant_id);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      if (!tenant.is_active) {
        throw new Error('Tenant is not active');
      }

      const order = await this.orderRepository.findById(input.order_id);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.tenant_id !== input.tenant_id) {
        throw new Error('Order does not belong to the specified tenant');
      }

      if (!canCompleteOrder(order.status)) {
        throw new Error(
          `Cannot complete order with status '${order.status}'. Order must be 'ready' or 'preparing'`
        );
      }

      if (order.total_amount > 0 && order.payment_status !== 'paid') {
        throw new Error(
          `Cannot complete order with payment status '${order.payment_status}'. Payment must be completed first`
        );
      }

      assertTransition(order.status, 'completed');

      const updatedOrder = await this.orderRepository.update(input.order_id, {
        status: 'completed',
        completed_at: new Date(),
      });

      return {
        order: updatedOrder,
      };
    } catch (error) {
      throw new Error(
        `Failed to complete order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
