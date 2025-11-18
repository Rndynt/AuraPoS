/**
 * Tenant Repository
 * Handles tenant CRUD operations
 */
import { BaseRepository } from '../BaseRepository';
import { tenants, } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
export class TenantRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = tenants;
        this.entityName = 'Tenant';
    }
    /**
     * Find tenant by ID
     */
    async findById(id) {
        try {
            const result = await this.db
                .select()
                .from(tenants)
                .where(eq(tenants.id, id))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            this.handleError('find tenant by id', error);
        }
    }
    /**
     * Find tenant by slug
     */
    async findBySlug(slug) {
        try {
            const result = await this.db
                .select()
                .from(tenants)
                .where(eq(tenants.slug, slug))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            this.handleError('find tenant by slug', error);
        }
    }
}
