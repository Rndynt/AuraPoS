import { and, asc, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { HttpRouteRepositoryPort } from '@pos/application/http';
import type { Database } from '@pos/infrastructure/database';
import {
  inventoryMovements,
  outletProductConfigs,
  outlets,
  productCategories,
  products,
  tenants,
  userOutletAssignments,
} from '@pos/infrastructure/db/schema';

export class DrizzleHttpRouteRepository implements HttpRouteRepositoryPort {
  constructor(private readonly db: Database) {}

  async slugExists(slug: string) {
    const rows = await this.db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return rows.length > 0;
  }

  async getTenantBySlug(slug: string) {
    const rows = await this.db.select({
      id: tenants.id, name: tenants.name, slug: tenants.slug,
      businessName: tenants.businessName, businessType: tenants.businessType,
      currency: tenants.currency, timezone: tenants.timezone, locale: tenants.locale,
    }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return rows[0] ?? null;
  }

  async getTenantEntitlementProfile(tenantId: string) {
    const rows = await this.db.select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      businessName: tenants.businessName,
      businessAddress: tenants.businessAddress,
      businessPhone: tenants.businessPhone,
      businessEmail: tenants.businessEmail,
      businessType: tenants.businessType,
      planTier: tenants.planTier,
      subscriptionStatus: tenants.subscriptionStatus,
      currency: tenants.currency,
      timezone: tenants.timezone,
      locale: tenants.locale,
      settings: tenants.settings,
    }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    return rows[0] ?? null;
  }

  async getCategoryNameById(tenantId: string, categoryId: string) {
    const rows = await this.db.select({ name: productCategories.name }).from(productCategories).where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, categoryId))).limit(1);
    return rows[0]?.name ?? null;
  }

  async listActiveOutlets(tenantId: string) {
    return this.db.select().from(outlets).where(and(eq(outlets.tenantId, tenantId), eq(outlets.isActive, true))).orderBy(outlets.createdAt);
  }
  async getOutlet(tenantId: string, outletId: string) {
    const rows = await this.db.select().from(outlets).where(and(eq(outlets.id, outletId), eq(outlets.tenantId, tenantId))).limit(1);
    return rows[0] ?? null;
  }
  async countActiveOutlets(tenantId: string) {
    const rows = await this.db.select({ value: count() }).from(outlets).where(and(eq(outlets.tenantId, tenantId), eq(outlets.isActive, true)));
    return Number(rows[0]?.value ?? 0);
  }
  async createOutlet(tenantId: string, body: any) {
    const [created] = await this.db.insert(outlets).values({ ...body, tenantId, isDefault: false }).returning();
    return created;
  }
  async updateOutlet(tenantId: string, outletId: string, body: any) {
    const [updated] = await this.db.update(outlets).set({ ...body, updatedAt: new Date() }).where(and(eq(outlets.id, outletId), eq(outlets.tenantId, tenantId))).returning();
    return updated ?? null;
  }
  getOutletForDelete(tenantId: string, outletId: string) { return this.getOutlet(tenantId, outletId); }
  async softDeleteOutlet(tenantId: string, outletId: string) {
    await this.db.update(outlets).set({ isActive: false, updatedAt: new Date() }).where(and(eq(outlets.id, outletId), eq(outlets.tenantId, tenantId)));
  }
  listOutletStaff(outletId: string) {
    return this.db.select().from(userOutletAssignments).where(and(eq(userOutletAssignments.outletId, outletId), eq(userOutletAssignments.isActive, true)));
  }
  async upsertOutletStaff(input: { outletId: string; userId: string; role: string }) {
    const [assignment] = await this.db.insert(userOutletAssignments).values({ outletId: input.outletId, userId: input.userId, role: input.role as any }).onConflictDoUpdate({
      target: [userOutletAssignments.userId, userOutletAssignments.outletId],
      set: { role: input.role as any, isActive: true, updatedAt: new Date() },
    }).returning();
    return assignment;
  }
  async deactivateOutletStaff(input: { outletId: string; userId: string }) {
    await this.db.update(userOutletAssignments).set({ isActive: false, updatedAt: new Date() }).where(and(eq(userOutletAssignments.outletId, input.outletId), eq(userOutletAssignments.userId, input.userId)));
  }
  async listOutletProductConfigs(tenantId: string) {
    const tenantOutlets = await this.db.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.tenantId, tenantId), eq(outlets.isActive, true)));
    if (!tenantOutlets.length) return [];
    return this.db.select().from(outletProductConfigs).where(inArray(outletProductConfigs.outletId, tenantOutlets.map((o) => o.id)));
  }
  async setOutletProductAvailability(input: { tenantId: string; outletId: string; productId: string; isAvailable: boolean }) {
    const outletRows = await this.db.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.id, input.outletId), eq(outlets.tenantId, input.tenantId), eq(outlets.isActive, true))).limit(1);
    if (!outletRows.length) return null;
    const [config] = await this.db.insert(outletProductConfigs).values({ outletId: input.outletId, productId: input.productId, isAvailable: input.isAvailable }).onConflictDoUpdate({
      target: [outletProductConfigs.outletId, outletProductConfigs.productId],
      set: { isAvailable: input.isAvailable, updatedAt: new Date() },
    }).returning();
    return config;
  }

  listTrackedProductsForStock(tenantId: string) {
    return this.db.select({ id: products.id, name: products.name, category: products.category, basePrice: products.basePrice, imageUrl: products.imageUrl, sku: products.sku, isActive: products.isActive, stockTrackingEnabled: products.stockTrackingEnabled }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.stockTrackingEnabled, true))).orderBy(asc(products.category), asc(products.name));
  }
  async getTrackedProduct(tenantId: string, productId: string) {
    const rows = await this.db.select({ id: products.id, stockTrackingEnabled: products.stockTrackingEnabled }).from(products).where(and(eq(products.id, productId), eq(products.tenantId, tenantId))).limit(1);
    return rows[0] ?? null;
  }
  listProductSummaries(tenantId: string) {
    return this.db.select({ id: products.id, name: products.name, category: products.category, sku: products.sku, imageUrl: products.imageUrl }).from(products).where(and(eq(products.tenantId, tenantId)));
  }
  async listTrackedProductIds(tenantId: string) {
    const rows = await this.db.select({ id: products.id }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.stockTrackingEnabled, true)));
    return rows.map((r) => r.id);
  }

  listInventoryMovements(input: any) {
    const conditions: any[] = [eq(inventoryMovements.tenantId, input.tenantId)];
    if (input.outletId) conditions.push(eq(inventoryMovements.outletId, input.outletId));
    if (input.type) conditions.push(eq(inventoryMovements.movementType, input.type));
    if (input.startDate) conditions.push(gte(inventoryMovements.createdAt, input.startDate));
    if (input.endDate) conditions.push(lte(inventoryMovements.createdAt, input.endDate));
    return this.db.select().from(inventoryMovements).where(and(...conditions)).orderBy(desc(inventoryMovements.createdAt)).limit(input.limit).offset(input.offset);
  }
  listInventoryMovementsByProduct(input: any) {
    return this.db.select().from(inventoryMovements).where(and(eq(inventoryMovements.tenantId, input.tenantId), eq(inventoryMovements.productId, input.productId))).orderBy(desc(inventoryMovements.createdAt)).limit(input.limit).offset(input.offset);
  }
  async getInventoryMovementReport(input: any) {
    const tenantId = input.tenantId;
    const outletId = input.outletId ?? null;
    const fromIso = input.from.toISOString();
    const toIso = input.to.toISOString();
    const toPlainRows = (result: unknown): Record<string, unknown>[] => {
      const arr = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      return arr.map((r: unknown) => ({ ...(r as object) }));
    };

    const topSoldResult = await this.db.execute(sql`
      SELECT im.product_id AS "productId", p.name AS "productName", p.category AS "category",
        SUM(ABS(im.quantity_delta))::int AS "totalSold"
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      WHERE im.tenant_id = ${tenantId}
        AND UPPER(im.movement_type) IN ('SALE', 'OFFLINE_SALE')
        AND (${outletId}::uuid IS NULL OR im.outlet_id = ${outletId}::uuid)
        AND im.created_at >= ${fromIso}::timestamptz
        AND im.created_at <= ${toIso}::timestamptz
      GROUP BY im.product_id, p.name, p.category
      ORDER BY "totalSold" DESC
      LIMIT 10
    `);
    const breakdownResult = await this.db.execute(sql`
      SELECT movement_type AS "movementType", COUNT(*)::int AS "count",
        COALESCE(SUM(CASE WHEN quantity_delta > 0 THEN quantity_delta ELSE 0 END), 0)::int AS "totalIn",
        COALESCE(SUM(CASE WHEN quantity_delta < 0 THEN ABS(quantity_delta) ELSE 0 END), 0)::int AS "totalOut"
      FROM inventory_movements
      WHERE tenant_id = ${tenantId}
        AND (${outletId}::uuid IS NULL OR outlet_id = ${outletId}::uuid)
        AND created_at >= ${fromIso}::timestamptz
        AND created_at <= ${toIso}::timestamptz
      GROUP BY movement_type
      ORDER BY "count" DESC
    `);
    const stockValueResult = await this.db.execute(sql`
      SELECT COALESCE(SUM(GREATEST(ib.quantity, 0) * p.base_price::numeric), 0)::numeric AS "totalValue",
        COUNT(p.id)::int AS "totalTracked", COALESCE(SUM(GREATEST(ib.quantity, 0)), 0)::int AS "totalUnits"
      FROM products p
      LEFT JOIN inventory_balances ib ON ib.tenant_id = p.tenant_id AND ib.product_id = p.id
        AND (${outletId}::uuid IS NOT NULL AND ib.outlet_id = ${outletId}::uuid)
      WHERE p.tenant_id = ${tenantId} AND p.stock_tracking_enabled = true AND p.is_active = true
    `);
    const salesSummaryResult = await this.db.execute(sql`
      SELECT COUNT(DISTINCT order_id)::int AS "totalOrders", COALESCE(SUM(ABS(quantity_delta)), 0)::int AS "totalUnitsSold"
      FROM inventory_movements
      WHERE tenant_id = ${tenantId}
        AND UPPER(movement_type) IN ('SALE', 'OFFLINE_SALE')
        AND (${outletId}::uuid IS NULL OR outlet_id = ${outletId}::uuid)
        AND created_at >= ${fromIso}::timestamptz
        AND created_at <= ${toIso}::timestamptz
    `);

    return {
      topSold: toPlainRows(topSoldResult),
      movementBreakdown: toPlainRows(breakdownResult),
      stockValue: toPlainRows(stockValueResult)[0] ?? {},
      salesSummary: toPlainRows(salesSummaryResult)[0] ?? {},
    };
  }
}
