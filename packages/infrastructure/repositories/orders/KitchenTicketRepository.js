/**
 * Kitchen Ticket Repository
 * Handles kitchen ticket CRUD operations with tenant isolation
 */
import { BaseRepository, RepositoryError } from '../BaseRepository';
import { kitchenTickets, } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
export class KitchenTicketRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = kitchenTickets;
        this.entityName = 'KitchenTicket';
    }
    /**
     * Find tickets by tenant with optional status filter
     */
    async findByTenant(tenantId, status) {
        try {
            const conditions = [eq(kitchenTickets.tenantId, tenantId)];
            if (status) {
                conditions.push(eq(kitchenTickets.status, status));
            }
            return await this.db
                .select()
                .from(kitchenTickets)
                .where(and(...conditions))
                .orderBy(kitchenTickets.createdAt);
        }
        catch (error) {
            this.handleError('find kitchen tickets by tenant', error);
        }
    }
    /**
     * Find kitchen ticket by ID
     */
    async findById(id, tenantId) {
        try {
            const result = await this.db
                .select()
                .from(kitchenTickets)
                .where(and(eq(kitchenTickets.id, id), eq(kitchenTickets.tenantId, tenantId)))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            this.handleError('find kitchen ticket by id', error);
        }
    }
    /**
     * Create a new kitchen ticket
     */
    async create(ticket, tenantId) {
        try {
            const data = this.injectTenantId(ticket, tenantId);
            const result = await this.db
                .insert(kitchenTickets)
                .values(data)
                .returning();
            return result[0];
        }
        catch (error) {
            this.handleError('create kitchen ticket', error);
        }
    }
    /**
     * Update kitchen ticket status
     */
    async updateStatus(id, status, tenantId) {
        try {
            await this.ensureTenantAccess(id, tenantId);
            const updateData = {
                status: status,
                updatedAt: new Date(),
            };
            // Set completedAt timestamp when status is ready or delivered
            if (status === 'ready' || status === 'delivered') {
                updateData.completedAt = new Date();
            }
            const result = await this.db
                .update(kitchenTickets)
                .set(updateData)
                .where(and(eq(kitchenTickets.id, id), eq(kitchenTickets.tenantId, tenantId)))
                .returning();
            if (!result || result.length === 0) {
                throw new RepositoryError('Kitchen ticket not found', 'NOT_FOUND', null);
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof RepositoryError)
                throw error;
            this.handleError('update kitchen ticket status', error);
        }
    }
    /**
     * Generate unique ticket number for a tenant
     */
    async generateTicketNumber(tenantId) {
        try {
            const today = new Date();
            const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');
            const todayTickets = await this.db
                .select()
                .from(kitchenTickets)
                .where(and(eq(kitchenTickets.tenantId, tenantId), eq(kitchenTickets.createdAt, today)));
            const sequenceNumber = (todayTickets.length + 1).toString().padStart(4, '0');
            return `KT-${datePrefix}-${sequenceNumber}`;
        }
        catch (error) {
            this.handleError('generate ticket number', error);
        }
    }
}
