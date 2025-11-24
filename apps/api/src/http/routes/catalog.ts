/**
 * Catalog Routes
 * Product catalog endpoints
 */

import { Router } from 'express';
import * as CatalogController from '../controllers/CatalogController';

const router = Router();

// GET /api/catalog/products - List products with filters
router.get('/products', CatalogController.listProducts);

// POST /api/catalog/products - Create new product
router.post('/products', CatalogController.createOrUpdateProduct);

// GET /api/catalog/products/:id - Get single product
router.get('/products/:id', CatalogController.getProductById);

// PUT /api/catalog/products/:id - Update existing product
router.put('/products/:id', CatalogController.createOrUpdateProduct);

// POST /api/catalog/products/:id/availability - Check availability
router.post('/products/:id/availability', CatalogController.checkAvailability);

export default router;
