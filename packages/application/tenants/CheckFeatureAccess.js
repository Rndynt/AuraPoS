/**
 * CheckFeatureAccess Use Case
 * Evaluates if a tenant has access to a specific feature
 */
export class CheckFeatureAccess {
    constructor(tenantFeatureRepository) {
        this.tenantFeatureRepository = tenantFeatureRepository;
    }
    async execute(input) {
        try {
            const tenantFeature = await this.tenantFeatureRepository.findByTenantAndFeature(input.tenant_id, input.feature_code);
            if (!tenantFeature) {
                return {
                    result: {
                        enabled: false,
                        feature_code: input.feature_code,
                        reason: 'Feature not activated for this tenant',
                    },
                };
            }
            if (!tenantFeature.is_active) {
                return {
                    result: {
                        enabled: false,
                        feature_code: input.feature_code,
                        reason: 'Feature is deactivated',
                    },
                };
            }
            if (tenantFeature.expires_at) {
                const now = new Date();
                if (tenantFeature.expires_at < now) {
                    return {
                        result: {
                            enabled: false,
                            feature_code: input.feature_code,
                            reason: 'Feature has expired',
                            expires_at: tenantFeature.expires_at,
                        },
                    };
                }
            }
            return {
                result: {
                    enabled: true,
                    feature_code: input.feature_code,
                    reason: 'Feature is active and accessible',
                    expires_at: tenantFeature.expires_at ?? null,
                    config: tenantFeature.config,
                },
            };
        }
        catch (error) {
            throw new Error(`Failed to check feature access: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
