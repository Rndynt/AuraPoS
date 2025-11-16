/**
 * Tenants Routes
 * Tenant feature management endpoints
 */

import { Router } from 'express';
import * as TenantsController from '../controllers/TenantsController';

const router = Router();

// GET /api/tenants/features - Get active features
router.get('/features', TenantsController.getActiveFeatures);

// POST /api/tenants/features/check - Check feature access
router.post('/features/check', TenantsController.checkFeatureAccess);

export default router;
