/**
 * Order Item Modifier Repository
 * Handles order item modifier CRUD operations
 */
import { BaseRepository } from '../BaseRepository';
import { orderItemModifiers, } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
export class OrderItemModifierRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = orderItemModifiers;
        this.entityName = 'OrderItemModifier';
    }
    /**
     * Find all modifiers for an order item
     */
    async findByOrderItem(orderItemId) {
        try {
            return await this.db
                .select()
                .from(orderItemModifiers)
                .where(eq(orderItemModifiers.orderItemId, orderItemId));
        }
        catch (error) {
            this.handleError('find order item modifiers', error);
        }
    }
    /**
     * Bulk create modifiers
     */
    async bulkCreate(modifiers) {
        try {
            if (modifiers.length === 0)
                return [];
            const result = await this.db
                .insert(orderItemModifiers)
                .values(modifiers)
                .returning();
            return result;
        }
        catch (error) {
            this.handleError('bulk create order item modifiers', error);
        }
    }
}
