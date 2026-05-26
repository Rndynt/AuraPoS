import { offlineDb } from "./db";

const META_KEY_CATALOG = "catalog_cached_at";

function nowIso() {
  return new Date().toISOString();
}

export async function saveCachedProducts(tenantId: string, products: unknown[]): Promise<void> {
  const now = nowIso();
  const rows = (products as Array<Record<string, unknown>>).map((p) => ({
    id: String(p.id ?? ""),
    tenantId,
    name: String(p.name ?? ""),
    basePrice: Number(p.base_price ?? 0),
    isActive: Boolean(p.is_active ?? true),
    syncStatus: "synced" as const,
    updatedAt: now,
    rawData: p,
  }));
  await offlineDb.local_products.bulkPut(rows as any);
}

export async function getCachedProducts(tenantId: string): Promise<unknown[]> {
  const rows = await offlineDb.local_products.where("tenantId").equals(tenantId).toArray();
  return rows.map((r: any) => r.rawData ?? {
    id: r.id,
    tenant_id: tenantId,
    name: r.name,
    base_price: r.basePrice,
    is_active: r.isActive,
  });
}

export async function saveCachedCategories(tenantId: string, categories: unknown[]): Promise<void> {
  const now = nowIso();
  const rows = (categories as Array<Record<string, unknown>>).map((c) => ({
    id: String(c.id ?? ""),
    tenantId,
    name: String(c.name ?? ""),
    syncStatus: "synced",
    updatedAt: now,
    rawData: c,
  }));
  await offlineDb.local_categories.bulkPut(rows as any);
}

export async function getCachedCategories(tenantId: string): Promise<unknown[]> {
  const rows = await offlineDb.local_categories.where("tenantId").equals(tenantId).toArray();
  return rows.map((r: any) => r.rawData ?? {
    id: r.id,
    name: r.name,
    is_active: true,
    display_order: 0,
  });
}

export async function updateCatalogCachedAt(tenantId: string): Promise<void> {
  const key = `${META_KEY_CATALOG}:${tenantId}`;
  const now = nowIso();
  await offlineDb.sync_meta.put({ key, value: now, updatedAt: now });
}

export async function getCatalogCachedAt(tenantId: string): Promise<string | null> {
  const key = `${META_KEY_CATALOG}:${tenantId}`;
  const row = await offlineDb.sync_meta.get(key);
  return row?.value ?? null;
}

export function isCatalogStale(cachedAt: string | null, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
  if (!cachedAt) return true;
  return Date.now() - new Date(cachedAt).getTime() > maxAgeMs;
}

// ── Table Cache ───────────────────────────────────────────────────────────────

const META_KEY_TABLES = "tables_cached_at";

export async function saveCachedTables(tenantId: string, tables: unknown[]): Promise<void> {
  const now = nowIso();
  const rows = (tables as Array<Record<string, unknown>>).map((t) => ({
    id: String(t.id ?? ""),
    tenantId,
    name: String(t.tableNumber ?? t.table_number ?? ""),
    status: String(t.status ?? "available"),
    syncStatus: "synced" as const,
    updatedAt: now,
    rawData: t,
  }));
  await offlineDb.local_tables.bulkPut(rows as any);
  await updateTablesCachedAt(tenantId);
}

export async function getCachedTables(tenantId: string): Promise<unknown[]> {
  const rows = await offlineDb.local_tables.where("tenantId").equals(tenantId).toArray();
  return rows.map((r: any) => r.rawData ?? {
    id: r.id,
    tableNumber: r.name,
    status: r.status,
    floor: null,
    capacity: null,
  });
}

export async function updateTablesCachedAt(tenantId: string): Promise<void> {
  const key = `${META_KEY_TABLES}:${tenantId}`;
  const now = nowIso();
  await offlineDb.sync_meta.put({ key, value: now, updatedAt: now });
}

export async function getTablesCachedAt(tenantId: string): Promise<string | null> {
  const key = `${META_KEY_TABLES}:${tenantId}`;
  const row = await offlineDb.sync_meta.get(key);
  return row?.value ?? null;
}
