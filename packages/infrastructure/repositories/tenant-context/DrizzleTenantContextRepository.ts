import { and, eq, or, sql } from 'drizzle-orm';
import type { TenantContextRepositoryPort, TenantResolutionRecord, TenantAuthUserRecord, OutletResolutionRecord } from '@pos/application/tenant-context';
import { db, type Database } from '../../database';
import { outlets, tenants, userOutletAssignments } from '../../db/schema';

function mapTenant(row: { id: string; slug: string; isActive: boolean }): TenantResolutionRecord {
  return { id: row.id, slug: row.slug, isActive: row.isActive };
}

export class DrizzleTenantContextRepository implements TenantContextRepositoryPort {
  constructor(private readonly database: Database = db) {}

  async findTenantBySlug(slug: string): Promise<TenantResolutionRecord | null> {
    const rows = await this.database.select({ id: tenants.id, slug: tenants.slug, isActive: tenants.isActive }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return rows[0] ? mapTenant(rows[0]) : null;
  }

  async findTenantById(id: string): Promise<TenantResolutionRecord | null> {
    const rows = await this.database.select({ id: tenants.id, slug: tenants.slug, isActive: tenants.isActive }).from(tenants).where(eq(tenants.id, id)).limit(1);
    return rows[0] ? mapTenant(rows[0]) : null;
  }

  async findTenantByIdOrSlug(idOrSlug: string): Promise<TenantResolutionRecord | null> {
    const rows = await this.database.select({ id: tenants.id, slug: tenants.slug, isActive: tenants.isActive }).from(tenants).where(or(eq(tenants.id, idOrSlug), eq(tenants.slug, idOrSlug))).limit(1);
    return rows[0] ? mapTenant(rows[0]) : null;
  }

  async findAuthUserById(userId: string): Promise<TenantAuthUserRecord | null> {
    const rows = await this.database.execute(sql`SELECT id, tenant_id, role FROM "user" WHERE id = ${userId} LIMIT 1`);
    const row = (rows as any[])[0];
    if (!row) return null;
    return { id: String(row.id), tenantId: row.tenant_id ?? null, role: row.role ?? null };
  }

  async findActiveOutletById(tenantId: string, outletId: string): Promise<OutletResolutionRecord | null> {
    const rows = await this.database.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.tenantId, tenantId), eq(outlets.id, outletId), eq(outlets.isActive, true))).limit(1);
    return rows[0] ?? null;
  }

  async findDefaultOutlet(tenantId: string): Promise<OutletResolutionRecord | null> {
    const rows = await this.database.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.tenantId, tenantId), eq(outlets.isDefault, true), eq(outlets.isActive, true))).limit(1);
    return rows[0] ?? null;
  }

  async userHasActiveOutletAssignment(userId: string, outletId: string): Promise<boolean> {
    const rows = await this.database.select({ id: userOutletAssignments.id }).from(userOutletAssignments).where(and(eq(userOutletAssignments.userId, userId), eq(userOutletAssignments.outletId, outletId), eq(userOutletAssignments.isActive, true))).limit(1);
    return rows.length > 0;
  }
}
