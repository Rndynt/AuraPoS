/**
 * Order Payment Repository
 * Handles order payment CRUD operations
 */
import { BaseRepository } from '../BaseRepository';
import { orderPayments, } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
export class OrderPaymentRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = orderPayments;
        this.entityName = 'OrderPayment';
    }
    /**
     * Find all payments for an order
     */
    async findByOrder(orderId, tenantId) {
        try {
            return await this.db
                .select()
                .from(orderPayments)
                .where(eq(orderPayments.orderId, orderId));
        }
        catch (error) {
            this.handleError('find order payments', error);
        }
    }
    /**
     * Create a new payment
     */
    async create(payment, tenantId) {
        try {
            const result = await this.db
                .insert(orderPayments)
                .values(payment)
                .returning();
            return result[0];
        }
        catch (error) {
            this.handleError('create order payment', error);
        }
    }
}
