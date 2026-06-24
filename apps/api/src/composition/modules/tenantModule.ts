import { TenantSlugAvailabilityChecker } from '@pos/application/tenants';
import { TenantRepository } from '@pos/infrastructure/repositories/tenants/TenantRepository';
import { DrizzleTenantSlugAvailabilityRepository } from '@pos/infrastructure/repositories/tenants/DrizzleTenantSlugAvailabilityRepository';
import type { ModuleFactory } from '../types';

export interface TenantModule {
  tenantRepository: TenantRepository;
  tenantSlugAvailabilityChecker: TenantSlugAvailabilityChecker;
}

export const createTenantModule: ModuleFactory<TenantModule> = ({ db }) => {
  const tenantSlugAvailabilityRepository = new DrizzleTenantSlugAvailabilityRepository(db);

  return {
    tenantRepository: new TenantRepository(db),
    tenantSlugAvailabilityChecker: new TenantSlugAvailabilityChecker(tenantSlugAvailabilityRepository),
  };
};
