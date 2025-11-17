/**
 * Orders Routes
 * Order management and payment endpoints
 */

import { Router } from 'express';
import * as OrdersController from '../controllers/OrdersController';
import * as OrderTypesController from '../controllers/OrderTypesController';

const router = Router();

// Order Types Routes
// GET /api/orders/order-types - List order types for tenant
router.get('/order-types', OrderTypesController.listOrderTypes);

// GET /api/orders/order-types/all - List all order types (master data)
router.get('/order-types/all', OrderTypesController.listAllOrderTypes);

// POST /api/orders/order-types/:orderTypeId/enable - Enable order type for tenant
router.post('/order-types/:orderTypeId/enable', OrderTypesController.enableOrderType);

// POST /api/orders/order-types/:orderTypeId/disable - Disable order type for tenant
router.post('/order-types/:orderTypeId/disable', OrderTypesController.disableOrderType);

// Order Routes
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
