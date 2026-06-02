/**
 * Sync Routes — Sprint 4 + Sprint 5
 * Offline batch sync endpoints for terminals.
 */

import { Router } from 'express';
import * as SyncController from '../controllers/SyncController';
import { requireCashier, requireManager } from '../middleware/rbac';

const router = Router();

// POST /api/sync/offline-orders — batch sync offline orders from terminal
router.post('/offline-orders', requireCashier, SyncController.syncOfflineOrders);

// GET /api/sync/batches — list recent sync batches (admin/debug)
router.get('/batches', requireManager, SyncController.listSyncBatches);

// GET /api/sync/conflicts — list recent sync conflicts
router.get('/conflicts', requireManager, SyncController.listSyncConflicts);

// PATCH /api/sync/conflicts/:id/resolve — resolve or ignore a conflict (Sprint 5)
router.patch('/conflicts/:id/resolve', requireManager, SyncController.resolveConflict);

// GET /api/sync/events — per-item sync audit log
router.get('/events', requireManager, SyncController.listSyncEvents);

export default router;
