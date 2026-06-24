/**
 * Inventory Routes
 *
 * FREE (basic stock):
 *   GET  /api/inventory/products               — list produk yang stock tracking aktif
 *   PUT  /api/inventory/products/:id/adjust    — simple +/- qty (update langsung)
 *
 * ADVANCED (requires inventory_advanced_stock entitlement):
 *   POST /api/inventory/movements              — catat pergerakan stok dengan tipe + catatan
 *   GET  /api/inventory/movements              — riwayat semua pergerakan (+ filter)
 *   GET  /api/inventory/movements/:productId   — riwayat per produk
 *   GET  /api/inventory/report                 — laporan agregat (top sold, breakdown tipe, nilai stok)
 */

import { Router } from 'express';
import { container } from '../../container';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { z } from 'zod';
import { requireManager } from '../middleware/rbac';
import { toStockListResponse } from '../helpers/inventoryStockListing';
import { requireTenantEntitlement } from '../helpers/inventoryEntitlement';
import { ensureProductBalanceForOutlet, ensureTrackedProductBalancesForOutlet } from '@pos/application/inventory';

export interface InventoryRouterDependencies {}

export function createInventoryRouter(_deps: InventoryRouterDependencies = {}): Router {
  const router = Router();

const { balanceRepo, productReader, outletContext, movementWriter, unitOfWork } = container.inventoryRouteDeps;
const balanceDeps = { balanceRepo, productReader, outletContext };

// ── helpers ───────────────────────────────────────────────────────────────────


/**
 * All recognised movement types.
 * OFFLINE_SALE is retained for legacy/manual rows; current offline sync uses SALE with terminal metadata.
 */
const MOVEMENT_TYPES = [
  'SALE',
  'OFFLINE_SALE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'PURCHASE',
  'DAMAGE',
  'RETURN',
  'INITIAL',
  'OPNAME_ADJUSTMENT',
  'TRANSFER_OUT',
  'TRANSFER_IN',
] as const;

type MovementType = typeof MOVEMENT_TYPES[number];

/** Returns a Date representing `period` days ago from now. */
function periodStart(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── STOK DASAR (basic) ────────────────────────────────────────────────────────

/**
 * GET /api/inventory/products
 * List all products with stock_tracking_enabled = true.
 * Returns current stock qty, sku, low-stock flag (threshold < 10 default).
 * Requires: inventory_basic_stock entitlement
 */
router.get('/products', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(undefined, tenantId, 'inventory_basic_stock');
  const LOW_STOCK_THRESHOLD = 10;

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const balances = await ensureTrackedProductBalancesForOutlet(balanceDeps, { tenantId, outletId });

  const rows = await container.httpRouteQueries.listTrackedProductsForStock(tenantId);

  const data = toStockListResponse(rows.map((row) => {
    const balance = balances.get(row.id);
    return {
      ...row,
      stockQty: balance?.quantity ?? 0,
      lowStockThreshold: balance?.lowStockThreshold ?? LOW_STOCK_THRESHOLD,
    };
  }), LOW_STOCK_THRESHOLD);

  res.json({ success: true, data });
}));

/**
 * PUT /api/inventory/products/:id/adjust
 * Simple direct adjustment — updates inventory_balances for the active outlet only.
 * Requires: inventory_basic_stock entitlement. Also logs movement if Stok Lanjutan aktif.
 */
router.put('/products/:id/adjust', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(undefined, tenantId, 'inventory_basic_stock');
  const productId = req.params.id;

  const body = z.object({
    qty: z.number().int(),
    mode: z.enum(['set', 'delta']).default('set'),
    notes: z.string().optional(),
    actorId: z.string().optional(),
    referenceId: z.string().optional(),
  }).parse(req.body);

  const product = await container.httpRouteQueries.getTrackedProduct(tenantId, productId);

  if (!product) throw createError('Produk tidak ditemukan', 404);
  if (!product.stockTrackingEnabled) throw createError('Produk ini tidak menggunakan tracking stok', 400);

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const currentBalance = await ensureProductBalanceForOutlet(balanceDeps, { tenantId, outletId, productId });
  const before = currentBalance.quantity;
  const after = body.mode === 'delta' ? before + body.qty : body.qty;
  if (after < 0) throw createError('Stok tidak boleh negatif', 400);
  const delta = after - before;

  // Catat ke ledger jika modul advanced aktif
  let advanced = true;
  try {
    await requireTenantEntitlement(undefined, tenantId, 'inventory_advanced_stock');
  } catch {
    advanced = false;
  }

  await unitOfWork.transaction(async (ctx) => {
    await balanceRepo.setQuantity({ tenantId, outletId, productId, quantity: after }, ctx);
    if (advanced && delta !== 0) {
      const movementType: MovementType = delta >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      await movementWriter.record({
        tenantId,
        outletId,
        productId,
        movementType,
        quantityDelta: delta,
        quantityBefore: before,
        quantityAfter: after,
        notes: body.notes ?? 'Manual adjustment',
        referenceType: 'manual_adjustment',
        referenceId: body.referenceId ?? productId,
        metadata: { mode: body.mode, source: 'basic_adjust', actorId: body.actorId ?? null },
      }, ctx);
    }
  });

  res.json({ success: true, data: { productId, before, after, delta: after - before } });
}));


/**
 * POST /api/inventory/opening-stock
 * Set opening stock for one tracked product in the active outlet only.
 * Requires: inventory_basic_stock entitlement. Records INITIAL movement when
 * inventory_advanced_stock is effective for the tenant.
 */
router.post('/opening-stock', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(undefined, tenantId, 'inventory_basic_stock');

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const body = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(0),
    notes: z.string().optional(),
    actorId: z.string().optional(),
  }).parse(req.body);

  const product = await container.httpRouteQueries.getTrackedProduct(tenantId, body.productId);

  if (!product) throw createError('Produk tidak ditemukan', 404);
  if (!product.stockTrackingEnabled) throw createError('Produk ini tidak menggunakan tracking stok', 400);

  const currentBalance = await ensureProductBalanceForOutlet(balanceDeps, { tenantId, outletId, productId: body.productId });
  const before = currentBalance.quantity;
  const after = body.quantity;
  const delta = after - before;

  let advanced = true;
  try {
    await requireTenantEntitlement(undefined, tenantId, 'inventory_advanced_stock');
  } catch {
    advanced = false;
  }

  await unitOfWork.transaction(async (ctx) => {
    await balanceRepo.setQuantity({ tenantId, outletId, productId: body.productId, quantity: after }, ctx);
    if (advanced && delta !== 0) {
      await movementWriter.record({
        tenantId,
        outletId,
        productId: body.productId,
        movementType: 'INITIAL',
        quantityDelta: delta,
        quantityBefore: before,
        quantityAfter: after,
        notes: body.notes ?? 'Stok awal',
        referenceType: 'opening_stock',
        referenceId: body.productId,
        metadata: { source: 'opening_stock', actorId: body.actorId ?? null },
      }, ctx);
    }
  });

  res.status(201).json({ success: true, data: { productId: body.productId, outletId, before, after, delta } });
}));

// ── STOK LANJUTAN (advanced) ──────────────────────────────────────────────────

/**
 * POST /api/inventory/movements
 * Catat pergerakan stok dengan tipe dan catatan. Advanced only.
 */
router.post('/movements', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;

  await requireTenantEntitlement(undefined, tenantId, 'inventory_advanced_stock');

  const body = z.object({
    productId: z.string(),
    movementType: z.enum(MOVEMENT_TYPES),
    quantityDelta: z.number().int(),
    unitCost: z.string().optional(),
    notes: z.string().optional(),
    actorId: z.string().optional(),
    referenceId: z.string().optional(),
  }).parse(req.body);

  const product = await container.httpRouteQueries.getTrackedProduct(tenantId, body.productId);

  if (!product) throw createError('Produk tidak ditemukan', 404);

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const currentBalance = await ensureProductBalanceForOutlet(balanceDeps, { tenantId, outletId, productId: body.productId });
  const before = currentBalance.quantity;
  const after = before + body.quantityDelta;
  if (after < 0) throw createError('Stok tidak boleh negatif', 400);

  let movement: unknown;
  await unitOfWork.transaction(async (ctx) => {
    const updatedBalance = await balanceRepo.applyDelta({
      tenantId,
      outletId,
      productId: body.productId,
      quantityDelta: body.quantityDelta,
    }, ctx);
    movement = await movementWriter.record({
      tenantId,
      outletId,
      productId: body.productId,
      movementType: body.movementType,
      quantityDelta: body.quantityDelta,
      quantityBefore: before,
      quantityAfter: updatedBalance.quantity,
      notes: body.notes,
      referenceType: body.movementType.startsWith('ADJUSTMENT') ? 'manual_adjustment' : 'manual_movement',
      referenceId: body.referenceId ?? body.productId,
      metadata: { source: 'advanced_movement', actorId: body.actorId ?? null, unitCost: body.unitCost ?? null },
    }, ctx);
  });

  res.status(201).json({ success: true, data: { movement, before, after } });
}));

/**
 * GET /api/inventory/movements
 * Semua riwayat pergerakan stok tenant. Advanced only.
 *
 * Query params:
 *   type      — filter by movement type (e.g. SALE, OFFLINE_SALE, ADJUSTMENT_IN, …)
 *   productId — filter by specific product
 *   dateFrom  — ISO date string (inclusive)
 *   dateTo    — ISO date string (inclusive, end of day)
 *   limit     — default 50, max 200
 *   offset    — default 0
 */
router.get('/movements', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;

  await requireTenantEntitlement(undefined, tenantId, 'inventory_advanced_stock');

  const query = z.object({
    type: z.string().optional(),
    productId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query);

  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
  const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
  if (dateTo && !isNaN(dateTo.getTime())) dateTo.setHours(23, 59, 59, 999);
  const rows = await container.httpRouteQueries.listInventoryMovements({
    tenantId,
    outletId: req.outletId,
    type: query.type && MOVEMENT_TYPES.includes(query.type as MovementType) ? query.type : undefined,
    productId: query.productId,
    startDate: dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
    endDate: dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
    limit: query.limit,
    offset: query.offset,
  });

  res.json({ success: true, data: { movements: rows, limit: query.limit, offset: query.offset } });
}));

/**
 * GET /api/inventory/movements/:productId
 * Riwayat pergerakan stok per produk. Advanced only.
 */
router.get('/movements/:productId', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { productId } = req.params;

  await requireTenantEntitlement(undefined, tenantId, 'inventory_advanced_stock');

  const rows = await container.httpRouteQueries.listInventoryMovementsByProduct({ tenantId, productId, outletId: req.outletId, limit: 100, offset: 0 });

  res.json({ success: true, data: { movements: rows } });
}));

/**
 * GET /api/inventory/report
 * Laporan agregat inventaris. Advanced only.
 *
 * Query params:
 *   period  — 7 | 30 | 90 (days, default 30)
 *   dateFrom / dateTo — custom range (overrides period)
 */
router.get('/report', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;

  await requireTenantEntitlement(undefined, tenantId, 'inventory_advanced_stock');

  const query = z.object({
    period: z.coerce.number().int().min(1).max(365).default(30),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }).parse(req.query);

  let from: Date;
  let to: Date = new Date();

  if (query.dateFrom) {
    const parsed = new Date(query.dateFrom);
    from = isNaN(parsed.getTime()) ? periodStart(query.period) : parsed;
  } else {
    from = periodStart(query.period);
  }

  if (query.dateTo) {
    const parsed = new Date(query.dateTo);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(23, 59, 59, 999);
      to = parsed;
    }
  }

  const outletId = req.outletId ?? null;
  if (outletId) {
    await ensureTrackedProductBalancesForOutlet(balanceDeps, { tenantId, outletId });
  }
  const report = await container.httpRouteQueries.getInventoryMovementReport({ tenantId, outletId, from, to });
  const stockValueRow = report.stockValue ?? {};
  const salesRow = report.salesSummary ?? {};

  res.json({
    success: true,
    data: {
      period: { from: from.toISOString(), to: to.toISOString(), days: query.period },
      outletId,
      topSold: report.topSold.map((r: Record<string, unknown>) => ({
        productId: String(r.productId ?? ''),
        productName: String(r.productName ?? ''),
        category: String(r.category ?? ''),
        totalSold: Number(r.totalSold ?? 0),
      })),
      movementBreakdown: report.movementBreakdown.map((r: Record<string, unknown>) => ({
        movementType: String(r.movementType ?? ''),
        count: Number(r.count ?? 0),
        totalIn: Number(r.totalIn ?? 0),
        totalOut: Number(r.totalOut ?? 0),
      })),
      stockValue: {
        totalValue: Number(stockValueRow.totalValue ?? 0),
        totalTracked: Number(stockValueRow.totalTracked ?? 0),
        totalUnits: Number(stockValueRow.totalUnits ?? 0),
      },
      salesSummary: {
        totalOrders: Number(salesRow.totalOrders ?? 0),
        totalUnitsSold: Number(salesRow.totalUnitsSold ?? 0),
      },
    },
  });
}));

  return router;
}

export default createInventoryRouter();
