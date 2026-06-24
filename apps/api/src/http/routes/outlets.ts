import { Router } from 'express';
import { container } from '../../container';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { z } from 'zod';
import { requireManager } from '../middleware/rbac';
import { cacheKeys, getCacheJson, setCacheJson } from '../../services/distributedCache';
import { invalidateOutletCache } from '../../services/cacheInvalidation';
import { getEffectiveEntitlementMap } from '../../services/tenantEntitlements';

export interface OutletsRouterDependencies {}

export function createOutletsRouter(_deps: OutletsRouterDependencies = {}): Router {
  const router = Router();

const MAX_FREE_OUTLETS = 1;
const OUTLET_CACHE_TTL_SECONDS = 60;

type OutletRow = any;

/**
 * Multi-outlet capacity is governed by the `multi_location` commercial
 * entitlement. Tenants without it are capped at a single outlet; tenants with
 * it may create additional branches.
 */
const MULTI_LOCATION_OUTLET_SLOTS = 999;

async function getAllowedOutletSlots(tenantId: string): Promise<number> {
  const map = await getEffectiveEntitlementMap(tenantId);
  return map.multi_location ? MULTI_LOCATION_OUTLET_SLOTS : MAX_FREE_OUTLETS;
}

// GET /api/outlets — list all outlets for tenant
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const cacheKey = cacheKeys.outlets(tenantId);
  const cached = await getCacheJson<OutletRow[]>(cacheKey);
  if (cached) {
    res.json({ outlets: cached });
    return;
  }

  const rows = await container.httpRouteQueries.listActiveOutlets(tenantId);
  await setCacheJson(cacheKey, rows, OUTLET_CACHE_TTL_SECONDS);
  res.json({ outlets: rows });
}));

// GET /api/outlets/current — return active outlet for this request
router.get('/current', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const outletId = req.outletId;
  if (!outletId) {
    throw createError('No active outlet', 404);
  }

  const cacheKey = cacheKeys.outlet(tenantId, outletId);
  const cached = await getCacheJson<OutletRow>(cacheKey);
  if (cached) {
    res.json({ outlet: cached });
    return;
  }

  const outlet = await container.httpRouteQueries.getOutlet(tenantId, outletId);
  if (!outlet) throw createError('Outlet not found', 404);
  await setCacheJson(cacheKey, outlet, OUTLET_CACHE_TTL_SECONDS);
  res.json({ outlet });
}));

// POST /api/outlets — create new outlet (checks slot limit)
router.post('/', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;

  const allowedSlots = await getAllowedOutletSlots(tenantId);
  const existingCount = await container.httpRouteQueries.countActiveOutlets(tenantId);

  if (Number(existingCount) >= allowedSlots) {
    throw createError(
      `Batas outlet tercapai (${allowedSlots} outlet). Beli slot tambahan untuk menambah cabang.`,
      402,
    );
  }

  const body = z.object({ name: z.string().min(1), slug: z.string().optional(), address: z.string().optional(), phone: z.string().optional() }).passthrough().parse(req.body);
  const created = await container.httpRouteQueries.createOutlet(tenantId, body);

  await invalidateOutletCache(tenantId, created.id, 'outlet_create');

  res.status(201).json({ outlet: created });
}));

// PATCH /api/outlets/:id — update outlet name/address/etc
router.patch('/:id', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional(),
  });
  const body = updateSchema.parse(req.body);

  const updated = await container.httpRouteQueries.updateOutlet(tenantId, id, body);

  if (!updated) throw createError('Outlet tidak ditemukan', 404);
  await invalidateOutletCache(tenantId, id, 'outlet_update');
  res.json({ outlet: updated });
}));

// DELETE /api/outlets/:id — soft delete (cannot delete default outlet)
router.delete('/:id', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  const outlet = await container.httpRouteQueries.getOutletForDelete(tenantId, id);

  if (!outlet) throw createError('Outlet tidak ditemukan', 404);
  if (outlet.isDefault) throw createError('Outlet default tidak bisa dihapus', 400);

  await container.httpRouteQueries.softDeleteOutlet(tenantId, id);

  await invalidateOutletCache(tenantId, id, 'outlet_delete');

  res.json({ success: true });
}));

// GET /api/outlets/:id/staff — list staff assigned to outlet
router.get('/:id/staff', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rows = await container.httpRouteQueries.listOutletStaff(id);
  res.json({ assignments: rows });
}));

// POST /api/outlets/:id/staff — assign user to outlet
router.post('/:id/staff', requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = z.object({
    userId: z.string(),
    role: z.enum(['owner', 'manager', 'cashier', 'staff']).default('staff'),
  }).parse(req.body);

  const assignment = await container.httpRouteQueries.upsertOutletStaff({ outletId: id, userId: body.userId, role: body.role });

  res.status(201).json({ assignment });
}));

// DELETE /api/outlets/:id/staff/:userId — remove staff from outlet
router.delete('/:id/staff/:userId', requireManager, asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  await container.httpRouteQueries.deactivateOutletStaff({ outletId: id, userId });
  res.json({ success: true });
}));

// GET /api/outlets/product-configs — get all outlet_product_configs for this tenant
router.get('/product-configs', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;

  const configs = await container.httpRouteQueries.listOutletProductConfigs(tenantId);

  res.json({ configs });
}));

// PUT /api/outlets/:outletId/product-configs/:productId — set product availability at outlet
router.put('/:outletId/product-configs/:productId', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { outletId, productId } = req.params;

  const body = z.object({ isAvailable: z.boolean() }).parse(req.body);

  const config = await container.httpRouteQueries.setOutletProductAvailability({ tenantId, outletId, productId, isAvailable: body.isAvailable });
  if (!config) throw createError('Outlet tidak ditemukan', 404);

  await invalidateOutletCache(tenantId, outletId, 'outlet_product_config_update');

  res.json({ config });
}));

  return router;
}

export default createOutletsRouter();
