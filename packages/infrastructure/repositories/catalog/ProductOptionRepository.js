/**
 * Product Option Repository
 * Handles product option CRUD operations with tenant isolation
 */
import { BaseRepository } from '../BaseRepository';
import { productOptions, } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
export class ProductOptionRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = productOptions;
        this.entityName = 'ProductOption';
    }
    /**
     * Find all options for an option group
     */
    async findByOptionGroup(optionGroupId, tenantId) {
        try {
            return await this.db
                .select()
                .from(productOptions)
                .where(and(eq(productOptions.optionGroupId, optionGroupId), eq(productOptions.tenantId, tenantId)))
                .orderBy(productOptions.displayOrder);
        }
        catch (error) {
            this.handleError('find options by option group', error);
        }
    }
    /**
     * Find option by ID
     */
    async findById(id, tenantId) {
        try {
            const result = await this.db
                .select()
                .from(productOptions)
                .where(and(eq(productOptions.id, id), eq(productOptions.tenantId, tenantId)))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            this.handleError('find option by id', error);
        }
    }
    /**
     * Create a new option
     */
    async create(option, tenantId) {
        try {
            const data = this.injectTenantId(option, tenantId);
            const result = await this.db.insert(productOptions).values(data).returning();
            return result[0];
        }
        catch (error) {
            this.handleError('create option', error);
        }
    }
}
