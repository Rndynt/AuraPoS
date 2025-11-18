/**
 * Order Item Repository
 * Handles order item CRUD operations
 */
import { BaseRepository } from '../BaseRepository';
import { orderItems, } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
export class OrderItemRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = orderItems;
        this.entityName = 'OrderItem';
    }
    /**
     * Find all items for an order
     * Note: tenant validation should be done at the order level
     */
    async findByOrder(orderId, tenantId) {
        try {
            return await this.db
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, orderId));
        }
        catch (error) {
            this.handleError('find order items', error);
        }
    }
    /**
     * Create a new order item
     */
    async create(orderItem, tenantId) {
        try {
            const result = await this.db
                .insert(orderItems)
                .values(orderItem)
                .returning();
            return result[0];
        }
        catch (error) {
            this.handleError('create order item', error);
        }
    }
    /**
     * Bulk create order items
     */
    async bulkCreate(items, tenantId) {
        try {
            if (items.length === 0)
                return [];
            const result = await this.db
                .insert(orderItems)
                .values(items)
                .returning();
            return result;
        }
        catch (error) {
            this.handleError('bulk create order items', error);
        }
    }
}
