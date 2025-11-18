/**
 * Tenant Feature Repository
 * Handles tenant feature activation and configuration
 */
import { BaseRepository, RepositoryError } from '../BaseRepository';
import { tenantFeatures, } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
/**
 * Map database tenant feature to domain tenant feature (camelCase -> snake_case)
 */
function mapTenantFeatureToDomain(dbFeature) {
    return {
        id: dbFeature.id,
        tenant_id: dbFeature.tenantId,
        feature_code: dbFeature.featureCode,
        activated_at: dbFeature.activatedAt,
        expires_at: dbFeature.expiresAt || undefined,
        source: dbFeature.source,
        is_active: dbFeature.isActive,
    };
}
export class TenantFeatureRepository extends BaseRepository {
    constructor(db) {
        super(db);
        this.table = tenantFeatures;
        this.entityName = 'TenantFeature';
    }
    /**
     * Find all active features for a tenant
     * Only returns non-expired, active features
     */
    async findActiveByTenant(tenantId) {
        try {
            const now = new Date();
            const result = await this.db
                .select()
                .from(tenantFeatures)
                .where(and(eq(tenantFeatures.tenantId, tenantId), eq(tenantFeatures.isActive, true)));
            // Filter out expired features in code (since expiresAt can be null)
            const activeFeatures = result.filter((feature) => {
                if (!feature.expiresAt)
                    return true; // No expiry
                return new Date(feature.expiresAt) > now; // Not expired
            });
            return activeFeatures.map(mapTenantFeatureToDomain);
        }
        catch (error) {
            this.handleError('find active features by tenant', error);
        }
    }
    /**
     * Find a specific feature for a tenant
     */
    async findByTenantAndFeature(tenantId, featureCode) {
        try {
            const result = await this.db
                .select()
                .from(tenantFeatures)
                .where(and(eq(tenantFeatures.tenantId, tenantId), eq(tenantFeatures.featureCode, featureCode)))
                .limit(1);
            return result[0] ? mapTenantFeatureToDomain(result[0]) : null;
        }
        catch (error) {
            this.handleError('find feature by tenant and code', error);
        }
    }
    /**
     * Create a new tenant feature activation
     */
    async create(tenantFeature) {
        try {
            const result = await this.db
                .insert(tenantFeatures)
                .values(tenantFeature)
                .returning();
            return mapTenantFeatureToDomain(result[0]);
        }
        catch (error) {
            this.handleError('create tenant feature', error);
        }
    }
    /**
     * Update an existing tenant feature
     */
    async update(id, tenantFeature) {
        try {
            const result = await this.db
                .update(tenantFeatures)
                .set({ ...tenantFeature, updatedAt: new Date() })
                .where(eq(tenantFeatures.id, id))
                .returning();
            if (!result || result.length === 0) {
                throw new RepositoryError('Tenant feature not found', 'NOT_FOUND', null);
            }
            return mapTenantFeatureToDomain(result[0]);
        }
        catch (error) {
            if (error instanceof RepositoryError)
                throw error;
            this.handleError('update tenant feature', error);
        }
    }
    /**
     * Alias for findActiveByTenant - used by GetActiveFeaturesForTenant use case
     */
    async findByTenantId(tenantId) {
        return this.findActiveByTenant(tenantId);
    }
}
