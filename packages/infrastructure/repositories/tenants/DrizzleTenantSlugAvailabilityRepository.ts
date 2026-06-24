import { eq } from 'drizzle-orm';
import type { TenantSlugAvailabilityPort } from '@pos/application/tenants';
import type { Database } from '@pos/infrastructure/database';
import { tenants } from '@pos/infrastructure/db/schema';

export class DrizzleTenantSlugAvailabilityRepository implements TenantSlugAvailabilityPort {
  constructor(private readonly db: Database) {}

  async slugExists(slug: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    return rows.length > 0;
  }
}
