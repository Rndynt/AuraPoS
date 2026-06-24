import type { TenantAuthUserRecord, TenantContextRepositoryPort } from './ports/TenantContextRepositoryPort';

export class GetTenantAuthUser {
  constructor(private readonly repository: TenantContextRepositoryPort) {}

  execute(userId: string): Promise<TenantAuthUserRecord | null> {
    return this.repository.findAuthUserById(userId);
  }
}
