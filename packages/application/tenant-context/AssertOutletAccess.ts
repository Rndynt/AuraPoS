import type { TenantContextRepositoryPort } from './ports/TenantContextRepositoryPort';

export class AssertOutletAccess {
  constructor(private readonly repository: TenantContextRepositoryPort) {}

  async execute(input: { userId?: string | null; role?: string | null; outletId: string }): Promise<boolean> {
    if (!input.userId || input.role === 'owner' || input.role === 'platform-admin') return true;
    return this.repository.userHasActiveOutletAssignment(input.userId, input.outletId);
  }
}
