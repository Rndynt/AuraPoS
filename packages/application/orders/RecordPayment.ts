/**
 * RecordPayment Use Case
 * Records a payment for an order, supports partial payments
 */

import type { Order, OrderPayment } from '@pos/domain/orders/types';
import type { InsertOrderPayment } from '../../../shared/schema';

export interface RecordPaymentInput {
  order_id: string;
  tenant_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'ewallet' | 'other';
  transaction_ref?: string;
  notes?: string;
}

export interface RecordPaymentOutput {
  payment: OrderPayment;
  order: Order;
  remainingAmount: number;
}

export interface IOrderRepository {
  findById(orderId: string, tenantId: string): Promise<any | null>;
  update(orderId: string, updates: Record<string, any>, tenantId: string): Promise<Order>;
}

export interface IPaymentRepository {
  create(payment: InsertOrderPayment, tenantId: string): Promise<OrderPayment>;
}

export class RecordPayment {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly paymentRepository: IPaymentRepository
  ) {}

  async execute(input: RecordPaymentInput): Promise<RecordPaymentOutput> {
    try {
      if (input.amount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const order = await this.orderRepository.findById(input.order_id, input.tenant_id);
      if (!order) {
        throw new Error('Order not found');
      }

      if ((order.tenant_id || order.tenantId) !== input.tenant_id) {
        throw new Error('Order does not belong to the specified tenant');
      }

      if ((order.status as string) === 'cancelled') {
        throw new Error('Cannot record payment for cancelled order');
      }

      const orderTotal = parseFloat(order.total_amount ?? order.total ?? '0');
      const orderPaid = parseFloat(order.paid_amount ?? order.paidAmount ?? '0');

      const remainingAmount = orderTotal - orderPaid;

      if (input.amount > remainingAmount) {
        throw new Error(
          `Payment amount (Rp ${input.amount}) exceeds remaining balance (Rp ${remainingAmount})`
        );
      }

      const payment: InsertOrderPayment = {
        orderId: input.order_id,
        amount: input.amount.toString(),
        paymentMethod: input.payment_method,
        paymentDate: new Date(),
        referenceNumber: input.transaction_ref,
        notes: input.notes,
      };

      const createdPayment = await this.paymentRepository.create(payment, input.tenant_id);

      const newPaidAmount = orderPaid + input.amount;
      const newRemainingAmount = orderTotal - newPaidAmount;

      let newPaymentStatus: 'paid' | 'partial' | 'unpaid';
      if (newRemainingAmount === 0) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partial';
      } else {
        newPaymentStatus = 'unpaid';
      }

      const updatedOrder = await this.orderRepository.update(
        input.order_id,
        {
          paidAmount: newPaidAmount.toString(),
          paymentStatus: newPaymentStatus,
        },
        input.tenant_id
      );

      return {
        payment: createdPayment,
        order: updatedOrder,
        remainingAmount: newRemainingAmount,
      };
    } catch (error) {
      throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
