/**
 * Tenants Routes
 * Tenant feature management endpoints
 */

import { Router } from 'express';
import * as TenantsController from '../controllers/TenantsController';

const router = Router();

// POST /api/tenants/register - Create new tenant with business type
router.post('/register', TenantsController.registerTenant);

// GET /api/tenants/profile - Get tenant profile with modules
router.get('/profile', TenantsController.getTenantProfile);

// GET /api/tenants/features - Get active features
router.get('/features', TenantsController.getActiveFeatures);

// POST /api/tenants/features/check - Check feature access
router.post('/features/check', TenantsController.checkFeatureAccess);

export default router;
