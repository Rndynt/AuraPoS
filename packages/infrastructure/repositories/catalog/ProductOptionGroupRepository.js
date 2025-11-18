/**
 * Product Option Group Repository
 * Handles option group CRUD operations with tenant isolation
 */
import { BaseRepository, RepositoryError } from '../BaseRepository';
import { productOptionGroups, } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
export class ProductOptionGroupRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = productOptionGroups;
        this.entityName = 'ProductOptionGroup';
    }
    /**
     * Find all option groups for a product
     */
    async findByProduct(productId, tenantId) {
        try {
            return await this.db
                .select()
                .from(productOptionGroups)
                .where(and(eq(productOptionGroups.productId, productId), eq(productOptionGroups.tenantId, tenantId)))
                .orderBy(productOptionGroups.displayOrder);
        }
        catch (error) {
            this.handleError('find option groups by product', error);
        }
    }
    /**
     * Find option group by ID
     */
    async findById(id, tenantId) {
        try {
            const result = await this.db
                .select()
                .from(productOptionGroups)
                .where(and(eq(productOptionGroups.id, id), eq(productOptionGroups.tenantId, tenantId)))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            this.handleError('find option group by id', error);
        }
    }
    /**
     * Create a new option group
     */
    async create(optionGroup, tenantId) {
        try {
            const data = this.injectTenantId(optionGroup, tenantId);
            const result = await this.db
                .insert(productOptionGroups)
                .values(data)
                .returning();
            return result[0];
        }
        catch (error) {
            this.handleError('create option group', error);
        }
    }
    /**
     * Update an existing option group
     */
    async update(id, optionGroup, tenantId) {
        try {
            await this.ensureTenantAccess(id, tenantId);
            const result = await this.db
                .update(productOptionGroups)
                .set({ ...optionGroup, updatedAt: new Date() })
                .where(and(eq(productOptionGroups.id, id), eq(productOptionGroups.tenantId, tenantId)))
                .returning();
            if (!result || result.length === 0) {
                throw new RepositoryError('Option group not found', 'NOT_FOUND', null);
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof RepositoryError)
                throw error;
            this.handleError('update option group', error);
        }
    }
}
