/**
 * GetActiveFeaturesForTenant Use Case
 * Retrieves all active features for a tenant, filtered by expiry date
 */
export class GetActiveFeaturesForTenant {
    constructor(tenantFeatureRepository) {
        this.tenantFeatureRepository = tenantFeatureRepository;
    }
    async execute(input) {
        try {
            const tenantFeatures = await this.tenantFeatureRepository.findByTenantId(input.tenant_id);
            const now = new Date();
            const activeFeatures = [];
            for (const feature of tenantFeatures) {
                if (!feature.is_active) {
                    continue;
                }
                if (feature.expires_at && feature.expires_at < now) {
                    continue;
                }
                activeFeatures.push({
                    enabled: true,
                    feature_code: feature.feature_code,
                    reason: 'Feature is active',
                    expires_at: feature.expires_at ?? null,
                    config: feature.config,
                });
            }
            return {
                features: activeFeatures,
                total: activeFeatures.length,
            };
        }
        catch (error) {
            throw new Error(`Failed to get active features: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
