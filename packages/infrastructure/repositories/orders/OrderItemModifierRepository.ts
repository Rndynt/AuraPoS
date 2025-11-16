/**
 * Order Item Modifier Repository
 * Handles order item modifier CRUD operations
 */

import { Database } from '../../database';
import { BaseRepository } from '../BaseRepository';
import {
  orderItemModifiers,
  type OrderItemModifier,
  type InsertOrderItemModifier,
} from '../../../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

export interface IOrderItemModifierRepository {
  findByOrderItem(orderItemId: string): Promise<OrderItemModifier[]>;
  bulkCreate(modifiers: InsertOrderItemModifier[]): Promise<OrderItemModifier[]>;
}

export class OrderItemModifierRepository
  extends BaseRepository<OrderItemModifier, InsertOrderItemModifier>
  implements IOrderItemModifierRepository
{
  protected table = orderItemModifiers;
  protected entityName = 'OrderItemModifier';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find all modifiers for an order item
   */
  async findByOrderItem(orderItemId: string): Promise<OrderItemModifier[]> {
    try {
      return await this.db
        .select()
        .from(orderItemModifiers)
        .where(eq(orderItemModifiers.orderItemId, orderItemId));
    } catch (error) {
      this.handleError('find order item modifiers', error);
    }
  }

  /**
   * Bulk create modifiers
   */
  async bulkCreate(
    modifiers: InsertOrderItemModifier[]
  ): Promise<OrderItemModifier[]> {
    try {
      if (modifiers.length === 0) return [];
      
      const result = await this.db
        .insert(orderItemModifiers)
        .values(modifiers)
        .returning();
      return result;
    } catch (error) {
      this.handleError('bulk create order item modifiers', error);
    }
  }
}
