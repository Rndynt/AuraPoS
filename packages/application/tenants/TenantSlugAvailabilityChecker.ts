import type { TenantSlugAvailabilityPort } from './ports/TenantSlugAvailabilityPort';

export class TenantSlugAvailabilityChecker {
  constructor(private readonly repository: TenantSlugAvailabilityPort) {}

  slugExists(slug: string): Promise<boolean> {
    return this.repository.slugExists(slug);
  }
}
