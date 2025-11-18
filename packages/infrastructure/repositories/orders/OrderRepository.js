/**
 * Order Repository
 * Handles order CRUD operations with complete relations and tenant isolation
 */
import { BaseRepository, RepositoryError } from '../BaseRepository';
import { orders, orderItems, orderItemModifiers, orderPayments, } from '../../../../shared/schema';
import { eq, and, gte, lte, inArray, desc, sql } from 'drizzle-orm';
export class OrderRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = orders;
        this.entityName = 'Order';
    }
    buildFilterConditions(tenantId, filters) {
        const conditions = [eq(orders.tenantId, tenantId)];
        if (filters?.status && filters.status.length > 0) {
            conditions.push(inArray(orders.status, filters.status));
        }
        if (filters?.paymentStatus) {
            conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
        }
        if (filters?.dateFrom) {
            conditions.push(gte(orders.orderDate, filters.dateFrom));
        }
        if (filters?.dateTo) {
            conditions.push(lte(orders.orderDate, filters.dateTo));
        }
        return conditions;
    }
    /**
     * Find orders by tenant with filters and pagination
     */
    async findByTenant(tenantId, filters) {
        try {
            const conditions = this.buildFilterConditions(tenantId, filters);
            let query = this.db
                .select()
                .from(orders)
                .where(and(...conditions))
                .orderBy(desc(orders.orderDate));
            // Apply pagination
            if (filters?.limit) {
                query = query.limit(filters.limit);
            }
            if (filters?.offset) {
                query = query.offset(filters.offset);
            }
            return await query;
        }
        catch (error) {
            this.handleError('find orders by tenant', error);
        }
    }
    async countByTenant(tenantId, filters) {
        try {
            const conditions = this.buildFilterConditions(tenantId, filters);
            const result = await this.db
                .select({ value: sql `count(*)::int` })
                .from(orders)
                .where(and(...conditions));
            return result[0]?.value ?? 0;
        }
        catch (error) {
            this.handleError('count orders by tenant', error);
        }
    }
    /**
     * Find complete order by ID with all relations (items, modifiers, payments)
     */
    async findById(id, tenantId) {
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
            let modifiers = [];
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
            }, {});
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
        }
        catch (error) {
            this.handleError('find order by id', error);
        }
    }
    /**
     * Create a new order with all relations
     */
    async create(order, tenantId) {
        try {
            const data = this.injectTenantId(order, tenantId);
            const result = await this.db.insert(orders).values(data).returning();
            return result[0];
        }
        catch (error) {
            this.handleError('create order', error);
        }
    }
    /**
     * Update an existing order
     */
    async update(id, order, tenantId) {
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
        }
        catch (error) {
            if (error instanceof RepositoryError)
                throw error;
            this.handleError('update order', error);
        }
    }
    /**
     * Update payment status of an order
     */
    async updatePaymentStatus(id, paidAmount, paymentStatus, tenantId) {
        try {
            await this.ensureTenantAccess(id, tenantId);
            const result = await this.db
                .update(orders)
                .set({
                paidAmount,
                paymentStatus: paymentStatus,
                updatedAt: new Date(),
            })
                .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
                .returning();
            if (!result || result.length === 0) {
                throw new RepositoryError('Order not found', 'NOT_FOUND', null);
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof RepositoryError)
                throw error;
            this.handleError('update payment status', error);
        }
    }
    /**
     * Generate unique order number for a tenant
     */
    async generateOrderNumber(tenantId) {
        try {
            const today = new Date();
            const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');
            const todayOrders = await this.db
                .select()
                .from(orders)
                .where(and(eq(orders.tenantId, tenantId), gte(orders.orderDate, new Date(today.setHours(0, 0, 0, 0)))));
            const sequenceNumber = (todayOrders.length + 1).toString().padStart(4, '0');
            return `ORD-${datePrefix}-${sequenceNumber}`;
        }
        catch (error) {
            this.handleError('generate order number', error);
        }
    }
}
