/**
 * Tenants Application Services
 * Public API for tenant feature management use cases
 */

export { CheckFeatureAccess } from './CheckFeatureAccess';
export type { 
  CheckFeatureAccessInput, 
  CheckFeatureAccessOutput,
  ITenantFeatureRepository as ITenantFeatureRepositoryForCheckAccess
} from './CheckFeatureAccess';

export { GetActiveFeaturesForTenant } from './GetActiveFeaturesForTenant';
export type { 
  GetActiveFeaturesForTenantInput, 
  GetActiveFeaturesForTenantOutput,
  ITenantFeatureRepository as ITenantFeatureRepositoryForGetActiveFeatures
} from './GetActiveFeaturesForTenant';
