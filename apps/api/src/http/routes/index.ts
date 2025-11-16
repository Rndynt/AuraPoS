/**
 * Routes Index
 * Aggregates all API routes
 */

import { Router } from 'express';
import catalogRoutes from './catalog';
import ordersRoutes from './orders';
import tenantsRoutes from './tenants';

const router = Router();

// Mount domain routes
router.use('/catalog', catalogRoutes);
router.use('/orders', ordersRoutes);
router.use('/tenants', tenantsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
