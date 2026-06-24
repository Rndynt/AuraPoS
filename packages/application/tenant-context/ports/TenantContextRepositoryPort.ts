export interface TenantResolutionRecord {
  id: string;
  slug: string;
  isActive: boolean;
}

export interface TenantAuthUserRecord {
  id: string;
  tenantId: string | null;
  role: string | null;
}

export interface OutletResolutionRecord {
  id: string;
}

export interface TenantContextRepositoryPort {
  findTenantBySlug(slug: string): Promise<TenantResolutionRecord | null>;
  findTenantById(id: string): Promise<TenantResolutionRecord | null>;
  findTenantByIdOrSlug(idOrSlug: string): Promise<TenantResolutionRecord | null>;
  findAuthUserById(userId: string): Promise<TenantAuthUserRecord | null>;
  findActiveOutletById(tenantId: string, outletId: string): Promise<OutletResolutionRecord | null>;
  findDefaultOutlet(tenantId: string): Promise<OutletResolutionRecord | null>;
  userHasActiveOutletAssignment(userId: string, outletId: string): Promise<boolean>;
}
