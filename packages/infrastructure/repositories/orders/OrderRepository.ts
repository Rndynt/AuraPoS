/**
 * Order Repository
 * Handles order CRUD operations with complete relations and tenant isolation
 */

import { Database } from '../../database';
import { BaseRepository, RepositoryError } from '../BaseRepository';
import {
  orders,
  orderItems,
  orderItemModifiers,
  orderPayments,
  type Order,
  type InsertOrder,
  type OrderItem,
  type OrderItemModifier,
  type OrderPayment,
} from '../../../../shared/schema';
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm';

export interface OrderFilters {
  status?: string | string[];
  paymentStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface IOrderRepository {
  findByTenant(tenantId: string, filters?: OrderFilters): Promise<Order[]>;
  findById(id: string, tenantId: string): Promise<any | null>;
  create(order: InsertOrder, tenantId: string): Promise<Order>;
  update(id: string, order: Partial<InsertOrder>, tenantId: string): Promise<Order>;
  updatePaymentStatus(
    id: string,
    paidAmount: string,
    paymentStatus: string,
    tenantId: string
  ): Promise<Order>;
}

export class OrderRepository
  extends BaseRepository<Order, InsertOrder>
  implements IOrderRepository
{
  protected table = orders;
  protected entityName = 'Order';

  constructor(db: Database) {
    super(db);
  }

  /**
   * Find orders by tenant with filters and pagination
   */
  async findByTenant(
    tenantId: string,
    filters?: OrderFilters
  ): Promise<Order[]> {
    try {
      const conditions = [eq(orders.tenantId, tenantId)];

      // Status filter - support single or multiple statuses
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          conditions.push(inArray(orders.status, filters.status as any[]));
        } else {
          conditions.push(eq(orders.status, filters.status as any));
        }
      }

      // Payment status filter
      if (filters?.paymentStatus) {
        conditions.push(eq(orders.paymentStatus, filters.paymentStatus as any));
      }

      // Date range filters
      if (filters?.dateFrom) {
        conditions.push(gte(orders.orderDate, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(orders.orderDate, filters.dateTo));
      }

      let query = this.db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.orderDate));

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit) as any;
      }
      if (filters?.offset) {
        query = query.offset(filters.offset) as any;
      }

      return await query;
    } catch (error) {
      this.handleError('find orders by tenant', error);
    }
  }

  /**
   * Find complete order by ID with all relations (items, modifiers, payments)
   */
  async findById(id: string, tenantId: string): Promise<any | null> {
    try {
      // Get the order
      const orderResult = await this.db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .limit(1);

      if (!orderResult || orderResult.length === 0) {
        return null;
      }

      const order = orderResult[0];

      // Get order items
      const items = await this.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      // Get all modifiers for these items
      let modifiers: OrderItemModifier[] = [];
      if (items.length > 0) {
        const itemIds = items.map((item) => item.id);
        modifiers = await this.db
          .select()
          .from(orderItemModifiers)
          .where(inArray(orderItemModifiers.orderItemId, itemIds));
      }

      // Get payments
      const payments = await this.db
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.orderId, id));

      // Map modifiers to items
      const modifiersByItem = modifiers.reduce((acc, modifier) => {
        if (!acc[modifier.orderItemId]) {
          acc[modifier.orderItemId] = [];
        }
        acc[modifier.orderItemId].push(modifier);
        return acc;
      }, {} as Record<string, OrderItemModifier[]>);

      // Build complete items with modifiers
      const completeItems = items.map((item) => ({
        ...item,
        modifiers: modifiersByItem[item.id] || [],
      }));

      return {
        ...order,
        items: completeItems,
        payments,
      };
    } catch (error) {
      this.handleError('find order by id', error);
    }
  }

  /**
   * Create a new order with all relations
   */
  async create(order: InsertOrder, tenantId: string): Promise<Order> {
    try {
      const data = this.injectTenantId(order, tenantId);
      const result = await this.db.insert(orders).values(data).returning();
      return result[0];
    } catch (error) {
      this.handleError('create order', error);
    }
  }

  /**
   * Update an existing order
   */
  async update(
    id: string,
    order: Partial<InsertOrder>,
    tenantId: string
  ): Promise<Order> {
    try {
      await this.ensureTenantAccess(id, tenantId);

      const result = await this.db
        .update(orders)
        .set({ ...order, updatedAt: new Date() })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new RepositoryError('Order not found', 'NOT_FOUND', null);
      }

      return result[0];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('update order', error);
    }
  }

  /**
   * Update payment status of an order
   */
  async updatePaymentStatus(
    id: string,
    paidAmount: string,
    paymentStatus: string,
    tenantId: string
  ): Promise<Order> {
    try {
      await this.ensureTenantAccess(id, tenantId);

      const result = await this.db
        .update(orders)
        .set({
          paidAmount,
          paymentStatus: paymentStatus as any,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new RepositoryError('Order not found', 'NOT_FOUND', null);
      }

      return result[0];
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      this.handleError('update payment status', error);
    }
  }

  /**
   * Generate unique order number for a tenant
   */
  async generateOrderNumber(tenantId: string): Promise<string> {
    try {
      const today = new Date();
      const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');
      
      const todayOrders = await this.db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, tenantId),
            gte(orders.orderDate, new Date(today.setHours(0, 0, 0, 0)))
          )
        );

      const sequenceNumber = (todayOrders.length + 1).toString().padStart(4, '0');
      return `ORD-${datePrefix}-${sequenceNumber}`;
    } catch (error) {
      this.handleError('generate order number', error);
    }
  }
}
