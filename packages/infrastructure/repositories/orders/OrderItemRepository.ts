/**
 * Order Item Repository
 * Handles order item CRUD operations
 */

import { Database } from '../../database';
import { BaseRepository } from '../BaseRepository';
import {
  orderItems,
  type OrderItem,
  type InsertOrderItem,
} from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface IOrderItemRepository {
  findByOrder(orderId: string, tenantId: string): Promise<OrderItem[]>;
  create(orderItem: InsertOrderItem, tenantId: string): Promise<OrderItem>;
  bulkCreate(orderItems: InsertOrderItem[], tenantId: string): Promise<OrderItem[]>;
}

export class OrderItemRepository
  extends BaseRepository<OrderItem, InsertOrderItem>
  implements IOrderItemRepository
{
  protected table = orderItems;
  protected entityName = 'OrderItem';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all items for an order
   * Note: tenant validation should be done at the order level
   */
  async findByOrder(orderId: string, tenantId: string): Promise<OrderItem[]> {
    try {
      return await this.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
    } catch (error) {
      this.handleError('find order items', error);
    }
  }

  /**
   * Create a new order item
   */
  async create(orderItem: InsertOrderItem, tenantId: string): Promise<OrderItem> {
    try {
      const result = await this.db
        .insert(orderItems)
        .values(orderItem)
        .returning();
      return result[0];
    } catch (error) {
      this.handleError('create order item', error);
    }
  }

  /**
   * Bulk create order items
   */
  async bulkCreate(
    items: InsertOrderItem[],
    tenantId: string
  ): Promise<OrderItem[]> {
    try {
      if (items.length === 0) return [];
      
      const result = await this.db
        .insert(orderItems)
        .values(items)
        .returning();
      return result;
    } catch (error) {
      this.handleError('bulk create order items', error);
    }
  }
}
