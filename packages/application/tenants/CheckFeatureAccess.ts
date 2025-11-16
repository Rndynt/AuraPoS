/**
 * CheckFeatureAccess Use Case
 * Evaluates if a tenant has access to a specific feature
 */

import type { TenantFeature, FeatureCheck } from '@pos/domain/tenants/types';

export interface ITenantFeatureRepository {
  findByTenantAndFeature(tenantId: string, featureCode: string): Promise<TenantFeature | null>;
}

export interface CheckFeatureAccessInput {
  tenant_id: string;
  feature_code: string;
}

export interface CheckFeatureAccessOutput {
  result: FeatureCheck;
}

export class CheckFeatureAccess {
  constructor(private readonly tenantFeatureRepository: ITenantFeatureRepository) {}

  async execute(input: CheckFeatureAccessInput): Promise<CheckFeatureAccessOutput> {
    try {
      const tenantFeature = await this.tenantFeatureRepository.findByTenantAndFeature(
        input.tenant_id,
        input.feature_code
      );

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
    } catch (error) {
      throw new Error(`Failed to check feature access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
