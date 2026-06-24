export interface TenantSlugAvailabilityPort {
  slugExists(slug: string): Promise<boolean>;
}
