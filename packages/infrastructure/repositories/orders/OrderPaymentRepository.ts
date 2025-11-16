/**
 * Order Payment Repository
 * Handles order payment CRUD operations
 */

import { Database } from '../../database';
import { BaseRepository } from '../BaseRepository';
import {
  orderPayments,
  type OrderPayment,
  type InsertOrderPayment,
} from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface IOrderPaymentRepository {
  findByOrder(orderId: string, tenantId: string): Promise<OrderPayment[]>;
  create(payment: InsertOrderPayment, tenantId: string): Promise<OrderPayment>;
}

export class OrderPaymentRepository
  extends BaseRepository<OrderPayment, InsertOrderPayment>
  implements IOrderPaymentRepository
{
  protected table = orderPayments;
  protected entityName = 'OrderPayment';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all payments for an order
   */
  async findByOrder(orderId: string, tenantId: string): Promise<OrderPayment[]> {
    try {
      return await this.db
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.orderId, orderId));
    } catch (error) {
      this.handleError('find order payments', error);
    }
  }

  /**
   * Create a new payment
   */
  async create(
    payment: InsertOrderPayment,
    tenantId: string
  ): Promise<OrderPayment> {
    try {
      const result = await this.db
        .insert(orderPayments)
        .values(payment)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create order payment', error);
    }
  }
}
