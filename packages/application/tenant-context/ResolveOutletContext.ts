import type { OutletResolutionRecord, TenantContextRepositoryPort } from './ports/TenantContextRepositoryPort';

export class ResolveOutletContext {
  constructor(private readonly repository: TenantContextRepositoryPort) {}

  async execute(input: { tenantId: string; outletId?: string | null }): Promise<OutletResolutionRecord | null> {
    if (input.outletId) return this.repository.findActiveOutletById(input.tenantId, input.outletId);
    return this.repository.findDefaultOutlet(input.tenantId);
  }
}
