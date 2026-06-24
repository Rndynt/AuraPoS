import type { TenantContextRepositoryPort, TenantResolutionRecord } from './ports/TenantContextRepositoryPort';

export type TenantLookupKind = 'slug' | 'id' | 'id-or-slug';

export class ResolveTenantContext {
  constructor(private readonly repository: TenantContextRepositoryPort) {}

  async execute(input: { kind: TenantLookupKind; value: string }): Promise<TenantResolutionRecord | null> {
    if (input.kind === 'slug') return this.repository.findTenantBySlug(input.value);
    if (input.kind === 'id') return this.repository.findTenantById(input.value);
    return this.repository.findTenantByIdOrSlug(input.value);
  }
}
