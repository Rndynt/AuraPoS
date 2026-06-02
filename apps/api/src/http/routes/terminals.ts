/**
 * Terminals Routes — Sprint 4
 * Terminal registry CRUD.
 */

import { Router } from 'express';
import * as TerminalsController from '../controllers/TerminalsController';
import { requireCashier, requireManager } from '../middleware/rbac';

const router = Router();

// POST /api/terminals/register — find-or-create terminal (idempotent)
router.post('/register', requireCashier, TerminalsController.registerTerminal);

// GET /api/terminals — list all terminals for tenant
router.get('/', TerminalsController.listTerminals);

// PATCH /api/terminals/:id/heartbeat — update last_seen_at
router.patch('/:id/heartbeat', requireCashier, TerminalsController.heartbeatTerminal);

// PATCH /api/terminals/:id/deactivate — soft-deactivate terminal
router.patch('/:id/deactivate', requireManager, TerminalsController.deactivateTerminal);

export default router;
