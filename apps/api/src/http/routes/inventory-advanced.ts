/**
 * Advanced Inventory Routes — Opname, Transfer, Low Stock, Threshold
 *
 * ADVANCED (requires inventory_advanced_stock):
 *   GET  /api/inventory/low-stock                     — list produk stok rendah
 *   PUT  /api/inventory/products/:id/threshold        — set threshold per produk/outlet
 *   POST /api/inventory/opnames                       — buat opname baru
 *   GET  /api/inventory/opnames                       — list opnames
 *   GET  /api/inventory/opnames/:id                   — detail opname + items
 *   PUT  /api/inventory/opnames/:id/items/:productId  — update item hitungan
 *   POST /api/inventory/opnames/:id/submit            — submit opname
 *   POST /api/inventory/opnames/:id/approve           — approve opname (writes OPNAME_ADJUSTMENT)
 *   POST /api/inventory/opnames/:id/cancel            — cancel opname
 *
 * TRANSFER (requires inventory_advanced_stock + multi_location):
 *   POST /api/inventory/transfers                     — buat transfer baru
 *   GET  /api/inventory/transfers                     — list transfers
 *   GET  /api/inventory/transfers/:id                 — detail transfer + items
 *   POST /api/inventory/transfers/:id/submit          — submit (deducts source balance)
 *   POST /api/inventory/transfers/:id/receive         — receive (adds dest balance)
 *   POST /api/inventory/transfers/:id/cancel          — cancel
 */

import { Router } from 'express';
import { db } from '@pos/infrastructure/database';
import {
  products,
  inventoryMovements,
  inventoryBalances,
} from '@pos/infrastructure/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { z } from 'zod';
import { requireManager } from '../middleware/rbac';
import { requireTenantEntitlement } from '../helpers/inventoryEntitlement';
import { getEffectiveEntitlementMap } from '../../services/tenantEntitlements';
import { DrizzleInventoryBalanceRepository } from '@pos/infrastructure/repositories/inventory';
import { DrizzleStockOpnameRepository } from '@pos/infrastructure/repositories/inventory';
import { DrizzleStockTransferRepository } from '@pos/infrastructure/repositories/inventory';

const router = Router();

const balanceRepo = new DrizzleInventoryBalanceRepository();
const opnameRepo = new DrizzleStockOpnameRepository();
const transferRepo = new DrizzleStockTransferRepository();

const DEFAULT_THRESHOLD = 10;

// ── helpers ───────────────────────────────────────────────────────────────────

/** Generate sequential number string e.g. OPN-20250617-001 */
function generateNumber(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
}

async function requireMultiLocation(tenantId: string) {
  const map = await getEffectiveEntitlementMap(tenantId);
  if (!map.multi_location) {
    throw createError('Transfer stok membutuhkan modul Multi Lokasi', 403);
  }
}

// ── LOW STOCK ─────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/low-stock
 * List products at or below their effective low stock threshold.
 * Requires: inventory_advanced_stock
 */
router.get('/low-stock', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const balances = await balanceRepo.listLowStock(tenantId, outletId, DEFAULT_THRESHOLD);
  const productIds = balances.map((b) => b.productId);

  if (productIds.length === 0) {
    return res.json({ success: true, data: { items: [], total: 0 } });
  }

  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      sku: products.sku,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .where(and(eq(products.tenantId, tenantId)));

  const productMap = new Map(productRows.map((p) => [p.id, p]));

  const items = balances.map((b) => {
    const product = productMap.get(b.productId);
    const effectiveThreshold = b.lowStockThreshold ?? DEFAULT_THRESHOLD;
    return {
      productId: b.productId,
      productName: product?.name ?? '–',
      category: product?.category ?? '–',
      sku: product?.sku ?? null,
      imageUrl: product?.imageUrl ?? null,
      quantity: b.quantity,
      threshold: effectiveThreshold,
      isOutOfStock: b.quantity <= 0,
      isLowStock: b.quantity > 0 && b.quantity <= effectiveThreshold,
      outletId: b.outletId,
    };
  });

  return res.json({ success: true, data: { items, total: items.length } });
}));

/**
 * PUT /api/inventory/products/:id/threshold
 * Set low stock threshold per product/outlet.
 * Requires: inventory_advanced_stock
 */
router.put('/products/:id/threshold', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const productId = req.params.id;
  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const body = z.object({
    threshold: z.number().int().min(0).nullable(),
  }).parse(req.body);

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);

  if (!product) throw createError('Produk tidak ditemukan', 404);

  const balance = await balanceRepo.setThreshold(tenantId, outletId, productId, body.threshold);

  return res.json({
    success: true,
    data: {
      productId,
      outletId,
      threshold: balance?.lowStockThreshold ?? null,
    },
  });
}));

// ── OPNAME ────────────────────────────────────────────────────────────────────

/**
 * POST /api/inventory/opnames
 * Buat draft opname baru untuk outlet aktif.
 * Automatically populates items with all tracked products and their current system qty.
 */
router.post('/opnames', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const body = z.object({
    notes: z.string().optional(),
    startedBy: z.string().optional(),
  }).parse(req.body);

  const opnameNumber = generateNumber('OPN');

  const opname = await opnameRepo.create({
    tenantId,
    outletId,
    opnameNumber,
    notes: body.notes ?? null,
    startedBy: body.startedBy ?? null,
  });

  const trackedProducts = await db
    .select({
      id: products.id,
      stockQty: products.stockQty,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.stockTrackingEnabled, true),
      ),
    );

  if (trackedProducts.length > 0) {
    for (const p of trackedProducts) {
      const balance = await balanceRepo.getBalance(tenantId, outletId, p.id);
      const systemQty = balance?.quantity ?? p.stockQty ?? 0;
      await opnameRepo.upsertItem({
        opnameId: opname.id,
        productId: p.id,
        systemQuantity: systemQty,
        countedQuantity: systemQty,
      });
    }
  }

  const full = await opnameRepo.findById(opname.id, tenantId);
  return res.status(201).json({ success: true, data: full });
}));

/**
 * GET /api/inventory/opnames
 */
router.get('/opnames', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const outletId = req.outletId;
  if (!outletId) throw createError('Outlet context diperlukan', 400);

  const query = z.object({
    status: z.enum(['draft', 'submitted', 'approved', 'cancelled']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query);

  const opnames = await opnameRepo.list(tenantId, outletId, {
    status: query.status as any,
    limit: query.limit,
    offset: query.offset,
  });

  return res.json({ success: true, data: { opnames } });
}));

/**
 * GET /api/inventory/opnames/:id
 */
router.get('/opnames/:id', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const opname = await opnameRepo.findById(req.params.id, tenantId);
  if (!opname) throw createError('Opname tidak ditemukan', 404);

  return res.json({ success: true, data: opname });
}));

/**
 * PUT /api/inventory/opnames/:id/items/:productId
 * Update counted quantity for one item.
 */
router.put('/opnames/:id/items/:productId', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const { id: opnameId, productId } = req.params;
  const opname = await opnameRepo.findById(opnameId, tenantId);
  if (!opname) throw createError('Opname tidak ditemukan', 404);
  if (opname.status !== 'draft') throw createError('Hanya opname berstatus draft yang dapat diubah', 400);

  const body = z.object({
    countedQuantity: z.number().int().min(0),
    notes: z.string().optional(),
  }).parse(req.body);

  const existingItem = opname.items.find((i) => i.productId === productId);
  const systemQty = existingItem?.systemQuantity ?? 0;

  const item = await opnameRepo.upsertItem({
    opnameId,
    productId,
    systemQuantity: systemQty,
    countedQuantity: body.countedQuantity,
    notes: body.notes ?? null,
  });

  return res.json({ success: true, data: item });
}));

/**
 * POST /api/inventory/opnames/:id/submit
 */
router.post('/opnames/:id/submit', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const opname = await opnameRepo.findById(req.params.id, tenantId);
  if (!opname) throw createError('Opname tidak ditemukan', 404);
  if (opname.status !== 'draft') throw createError('Hanya opname berstatus draft yang dapat disubmit', 400);

  const body = z.object({ submittedBy: z.string().optional() }).parse(req.body);

  const updated = await opnameRepo.updateStatus(opname.id, tenantId, 'submitted', {
    submittedBy: body.submittedBy,
    submittedAt: new Date(),
  });

  return res.json({ success: true, data: updated });
}));

/**
 * POST /api/inventory/opnames/:id/approve
 * Approve submitted opname:
 * 1. For each item with variance != 0: write OPNAME_ADJUSTMENT movement
 * 2. Update inventory_balances atomically
 * 3. Update products.stock_qty for basic compat
 */
router.post('/opnames/:id/approve', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const opname = await opnameRepo.findById(req.params.id, tenantId);
  if (!opname) throw createError('Opname tidak ditemukan', 404);
  if (opname.status !== 'submitted') throw createError('Hanya opname berstatus submitted yang dapat disetujui', 400);

  const body = z.object({ approvedBy: z.string().optional() }).parse(req.body);

  const itemsWithVariance = opname.items.filter((i) => i.varianceQuantity !== 0);
  const outletId = opname.outletId;

  await db.transaction(async (tx) => {
    for (const item of itemsWithVariance) {
      const delta = item.varianceQuantity;
      const movType = delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

      const balance = await balanceRepo.getBalance(tenantId, outletId, item.productId);
      const before = balance?.quantity ?? item.systemQuantity;
      const after = item.countedQuantity;

      const [movement] = await tx.insert(inventoryMovements).values({
        tenantId,
        outletId,
        productId: item.productId,
        movementType: 'OPNAME_ADJUSTMENT',
        quantityDelta: delta,
        quantityBefore: before,
        quantityAfter: after,
        notes: `Opname ${opname.opnameNumber} — selisih ${delta > 0 ? '+' : ''}${delta}`,
        referenceType: 'opname',
        referenceId: opname.id,
        metadata: { opnameId: opname.id, opnameNumber: opname.opnameNumber } as any,
      }).returning();

      await balanceRepo.setQuantity({
        tenantId,
        outletId,
        productId: item.productId,
        quantity: after,
        lastMovementId: movement.id,
        lastCountedAt: new Date(),
      });

      await tx.update(products)
        .set({ stockQty: after, updatedAt: new Date() })
        .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
    }

    await opnameRepo.updateStatus(opname.id, tenantId, 'approved', {
      approvedBy: body.approvedBy,
      approvedAt: new Date(),
    });
  });

  const approved = await opnameRepo.findById(opname.id, tenantId);
  return res.json({ success: true, data: approved });
}));

/**
 * POST /api/inventory/opnames/:id/cancel
 */
router.post('/opnames/:id/cancel', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');

  const opname = await opnameRepo.findById(req.params.id, tenantId);
  if (!opname) throw createError('Opname tidak ditemukan', 404);
  if (opname.status === 'approved') throw createError('Opname yang sudah disetujui tidak dapat dibatalkan', 400);

  const updated = await opnameRepo.updateStatus(opname.id, tenantId, 'cancelled', {
    cancelledAt: new Date(),
  });

  return res.json({ success: true, data: updated });
}));

// ── TRANSFER ──────────────────────────────────────────────────────────────────

/**
 * POST /api/inventory/transfers
 * Requires: inventory_advanced_stock + multi_location
 */
router.post('/transfers', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');
  await requireMultiLocation(tenantId);

  const body = z.object({
    fromOutletId: z.string().uuid(),
    toOutletId: z.string().uuid(),
    notes: z.string().optional(),
    createdBy: z.string().optional(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
    })).min(1),
  }).parse(req.body);

  if (body.fromOutletId === body.toOutletId) {
    throw createError('Outlet asal dan tujuan tidak boleh sama', 400);
  }

  const transferNumber = generateNumber('TRF');

  const transfer = await transferRepo.create({
    tenantId,
    transferNumber,
    fromOutletId: body.fromOutletId,
    toOutletId: body.toOutletId,
    notes: body.notes ?? null,
    createdBy: body.createdBy ?? null,
    items: body.items,
  });

  return res.status(201).json({ success: true, data: transfer });
}));

/**
 * GET /api/inventory/transfers
 */
router.get('/transfers', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');
  await requireMultiLocation(tenantId);

  const query = z.object({
    status: z.enum(['draft', 'submitted', 'received', 'cancelled']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query);

  const transfers = await transferRepo.list(tenantId, {
    fromOutletId: req.outletId ?? undefined,
    status: query.status as any,
    limit: query.limit,
    offset: query.offset,
  });

  return res.json({ success: true, data: { transfers } });
}));

/**
 * GET /api/inventory/transfers/:id
 */
router.get('/transfers/:id', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');
  await requireMultiLocation(tenantId);

  const transfer = await transferRepo.findById(req.params.id, tenantId);
  if (!transfer) throw createError('Transfer tidak ditemukan', 404);

  return res.json({ success: true, data: transfer });
}));

/**
 * POST /api/inventory/transfers/:id/submit
 * Decreases source outlet balance, creates TRANSFER_OUT movements.
 */
router.post('/transfers/:id/submit', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');
  await requireMultiLocation(tenantId);

  const transfer = await transferRepo.findById(req.params.id, tenantId);
  if (!transfer) throw createError('Transfer tidak ditemukan', 404);
  if (transfer.status !== 'draft') throw createError('Hanya transfer berstatus draft yang dapat disubmit', 400);

  const body = z.object({ submittedBy: z.string().optional() }).parse(req.body);

  await db.transaction(async (tx) => {
    for (const item of transfer.items) {
      const balance = await balanceRepo.getBalance(tenantId, transfer.fromOutletId, item.productId);
      const before = balance?.quantity ?? 0;

      if (before < item.quantity) {
        throw createError(`Stok tidak cukup untuk produk ${item.productId} di outlet asal (ada: ${before}, butuh: ${item.quantity})`, 400);
      }

      const updatedBalance = await balanceRepo.applyDelta({
        tenantId,
        outletId: transfer.fromOutletId,
        productId: item.productId,
        quantityDelta: -item.quantity,
      });

      await tx.insert(inventoryMovements).values({
        tenantId,
        outletId: transfer.fromOutletId,
        productId: item.productId,
        movementType: 'TRANSFER_OUT',
        quantityDelta: -item.quantity,
        quantityBefore: before,
        quantityAfter: updatedBalance.quantity,
        notes: `Transfer keluar — ${transfer.transferNumber}`,
        referenceType: 'transfer',
        referenceId: transfer.id,
        metadata: { transferId: transfer.id, transferNumber: transfer.transferNumber, toOutletId: transfer.toOutletId } as any,
      });

      await tx.update(products)
        .set({ stockQty: updatedBalance.quantity, updatedAt: new Date() })
        .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
    }

    await transferRepo.updateStatus(transfer.id, tenantId, 'submitted', {
      submittedBy: body.submittedBy,
      submittedAt: new Date(),
    });
  });

  const updated = await transferRepo.findById(transfer.id, tenantId);
  return res.json({ success: true, data: updated });
}));

/**
 * POST /api/inventory/transfers/:id/receive
 * Increases destination outlet balance, creates TRANSFER_IN movements.
 */
router.post('/transfers/:id/receive', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');
  await requireMultiLocation(tenantId);

  const transfer = await transferRepo.findById(req.params.id, tenantId);
  if (!transfer) throw createError('Transfer tidak ditemukan', 404);
  if (transfer.status !== 'submitted') throw createError('Hanya transfer berstatus submitted yang dapat diterima', 400);

  const body = z.object({ receivedBy: z.string().optional() }).parse(req.body);

  await db.transaction(async (tx) => {
    for (const item of transfer.items) {
      const balance = await balanceRepo.getBalance(tenantId, transfer.toOutletId, item.productId);
      const before = balance?.quantity ?? 0;

      const updatedBalance = await balanceRepo.applyDelta({
        tenantId,
        outletId: transfer.toOutletId,
        productId: item.productId,
        quantityDelta: item.quantity,
      });

      await tx.insert(inventoryMovements).values({
        tenantId,
        outletId: transfer.toOutletId,
        productId: item.productId,
        movementType: 'TRANSFER_IN',
        quantityDelta: item.quantity,
        quantityBefore: before,
        quantityAfter: updatedBalance.quantity,
        notes: `Transfer masuk — ${transfer.transferNumber}`,
        referenceType: 'transfer',
        referenceId: transfer.id,
        metadata: { transferId: transfer.id, transferNumber: transfer.transferNumber, fromOutletId: transfer.fromOutletId } as any,
      });
    }

    await transferRepo.updateStatus(transfer.id, tenantId, 'received', {
      receivedBy: body.receivedBy,
      receivedAt: new Date(),
    });
  });

  const updated = await transferRepo.findById(transfer.id, tenantId);
  return res.json({ success: true, data: updated });
}));

/**
 * POST /api/inventory/transfers/:id/cancel
 */
router.post('/transfers/:id/cancel', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await requireTenantEntitlement(db, tenantId, 'inventory_advanced_stock');
  await requireMultiLocation(tenantId);

  const transfer = await transferRepo.findById(req.params.id, tenantId);
  if (!transfer) throw createError('Transfer tidak ditemukan', 404);
  if (transfer.status === 'received') throw createError('Transfer yang sudah diterima tidak dapat dibatalkan', 400);

  const body = z.object({ cancelledBy: z.string().optional() }).parse(req.body);

  if (transfer.status === 'submitted') {
    await db.transaction(async (tx) => {
      for (const item of transfer.items) {
        const balance = await balanceRepo.getBalance(tenantId, transfer.fromOutletId, item.productId);
        const before = balance?.quantity ?? 0;

        const updatedBalance = await balanceRepo.applyDelta({
          tenantId,
          outletId: transfer.fromOutletId,
          productId: item.productId,
          quantityDelta: item.quantity,
        });

        await tx.insert(inventoryMovements).values({
          tenantId,
          outletId: transfer.fromOutletId,
          productId: item.productId,
          movementType: 'ADJUSTMENT_IN',
          quantityDelta: item.quantity,
          quantityBefore: before,
          quantityAfter: updatedBalance.quantity,
          notes: `Pembatalan transfer — ${transfer.transferNumber}`,
          referenceType: 'transfer_cancel',
          referenceId: transfer.id,
          metadata: { transferId: transfer.id } as any,
        });
      }

      await transferRepo.updateStatus(transfer.id, tenantId, 'cancelled', {
        cancelledBy: body.cancelledBy,
        cancelledAt: new Date(),
      });
    });
  } else {
    await transferRepo.updateStatus(transfer.id, tenantId, 'cancelled', {
      cancelledBy: body.cancelledBy,
      cancelledAt: new Date(),
    });
  }

  const updated = await transferRepo.findById(transfer.id, tenantId);
  return res.json({ success: true, data: updated });
}));

export default router;
