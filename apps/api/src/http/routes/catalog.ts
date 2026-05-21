/**
 * Catalog Routes
 * Product catalog endpoints
 */

import { Router } from 'express';
import * as CatalogController from '../controllers/CatalogController';
import * as CategoryController from '../controllers/CategoryController';

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

// GET /api/catalog/categories - List distinct categories
router.get('/categories', CategoryController.listCategories);
// POST /api/catalog/categories - Create category master data
router.post('/categories', CategoryController.createCategory);
// PATCH /api/catalog/categories - Rename category (bulk update products)
router.patch('/categories', CategoryController.renameCategory);
// DELETE /api/catalog/categories - Delete category by moving products to fallback
router.delete('/categories', CategoryController.deleteCategory);
// PUT /api/catalog/categories/reorder - Reorder categories by id sequence
router.put('/categories/reorder', CategoryController.reorderCategories);

export default router;
