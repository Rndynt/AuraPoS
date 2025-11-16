/**
 * Orders Routes
 * Order management and payment endpoints
 */

import { Router } from 'express';
import * as OrdersController from '../controllers/OrdersController';

const router = Router();

// POST /api/orders - Create new order
router.post('/', OrdersController.createOrder);

// GET /api/orders - List orders with filters
router.get('/', OrdersController.listOrders);

// GET /api/orders/:id - Get single order
router.get('/:id', OrdersController.getOrderById);

// POST /api/orders/:id/payments - Record payment
router.post('/:id/payments', OrdersController.recordPayment);

// POST /api/orders/:id/kitchen-ticket - Create kitchen ticket
router.post('/:id/kitchen-ticket', OrdersController.createKitchenTicket);

export default router;
