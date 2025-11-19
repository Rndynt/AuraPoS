/**
 * GetTenantProfile Use Case
 * Retrieves complete tenant profile with features and module configuration
 * 
 * IMPORTANT: All tenants MUST have module configuration. This is enforced during
 * tenant creation (see CreateTenant use case). If a tenant is found without module
 * configuration, it indicates a data integrity issue that must be addressed.
 */

import type { Tenant, TenantFeature, TenantModuleConfig } from '@pos/domain/tenants/types';

/**
 * Repository interfaces
 */
export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
}

export interface ITenantFeatureRepository {
  findActiveByTenant(tenantId: string): Promise<TenantFeature[]>;
}

export interface ITenantModuleConfigRepository {
  findByTenantId(tenantId: string): Promise<TenantModuleConfig | null>;
}

/**
 * Use case input
 */
export interface GetTenantProfileInput {
  tenant_id: string;
}

/**
 * Tenant profile DTO combining all tenant-related data
 * NOTE: moduleConfig is guaranteed to be present (not null)
 * All tenants MUST have module configuration (enforced at creation time)
 */
export interface TenantProfileDTO {
  tenant: Tenant;
  features: TenantFeature[];
  moduleConfig: TenantModuleConfig;
}

/**
 * Use case output
 */
export interface GetTenantProfileOutput {
  profile: TenantProfileDTO;
}

/**
 * GetTenantProfile Use Case
 * Fetches tenant data along with active features and module configuration
 */
export class GetTenantProfile {
  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly tenantFeatureRepository: ITenantFeatureRepository,
    private readonly tenantModuleConfigRepository: ITenantModuleConfigRepository
  ) {}

  async execute(input: GetTenantProfileInput): Promise<GetTenantProfileOutput> {
    try {
      // Step 1: Validate input
      if (!input.tenant_id || input.tenant_id.trim().length === 0) {
        throw new Error('Tenant ID is required');
      }

      console.log(`[GetTenantProfile] Fetching profile for tenant: ${input.tenant_id}`);

      // Step 2: Fetch tenant by ID
      const tenant = await this.tenantRepository.findById(input.tenant_id);
      
      if (!tenant) {
        throw new Error(`Tenant with ID '${input.tenant_id}' not found`);
      }

      console.log(`[GetTenantProfile] Tenant found: ${tenant.name} (${tenant.slug})`);

      // Step 3: Parallel load features and module config
      const [features, moduleConfig] = await Promise.all([
        this.tenantFeatureRepository.findActiveByTenant(input.tenant_id),
        this.tenantModuleConfigRepository.findByTenantId(input.tenant_id),
      ]);

      console.log(`[GetTenantProfile] Loaded ${features.length} active features`);

      // Step 4: CRITICAL - Validate module config exists
      // All tenants MUST have module configuration. If missing, this indicates
      // a data integrity issue (tenant was not created properly via CreateTenant use case)
      if (!moduleConfig) {
        throw new Error(
          `Data integrity violation: Tenant '${tenant.name}' (ID: ${input.tenant_id}) ` +
          `is missing required module configuration. All tenants MUST have module ` +
          `configuration as enforced by the CreateTenant use case. This tenant may have ` +
          `been created improperly or the module configuration was deleted. ` +
          `Please create the module configuration manually or recreate the tenant using ` +
          `the proper CreateTenant flow.`
        );
      }

      console.log(`[GetTenantProfile] Module configuration validated successfully`);

      // Step 5: Return combined profile DTO
      return {
        profile: {
          tenant,
          features,
          moduleConfig,
        },
      };
    } catch (error) {
      console.error(`[GetTenantProfile] Error fetching tenant profile:`, error);
      
      if (error instanceof Error) {
        // Preserve stack trace and context
        const detailedError = new Error(
          `Failed to get tenant profile for '${input.tenant_id}': ${error.message}\n` +
          `Stack trace: ${error.stack || 'No stack trace available'}`
        );
        detailedError.stack = error.stack;
        throw detailedError;
      }
      
      throw new Error(
        `Failed to get tenant profile for '${input.tenant_id}': Unknown error occurred. ` +
        `Please check logs for details.`
      );
    }
  }
}
