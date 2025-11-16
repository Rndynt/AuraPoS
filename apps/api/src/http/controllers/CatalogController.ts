/**
 * Catalog Controller
 * Handles product catalog endpoints with tenant isolation
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { container } from '../../container';
import { asyncHandler, createError } from '../middleware/errorHandler';

/**
 * GET /api/catalog/products
 * List products with option groups
 * Query params: category, isActive
 */
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  // Validate query params
  const querySchema = z.object({
    category: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional().transform(val => val ? val === 'true' : undefined),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createError('Invalid query parameters', 400, 'VALIDATION_ERROR');
  }

  const { category, isActive } = parsed.data;

  // Execute use case
  const result = await container.getProducts.execute({
    tenantId,
    category,
    isActive,
  });

  res.status(200).json({
    success: true,
    data: {
      products: result.products,
      total: result.total,
    },
  });
});

/**
 * GET /api/catalog/products/:id
 * Get single product with full details
 */
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  if (!id) {
    throw createError('Product ID is required', 400, 'MISSING_PARAMETER');
  }

  // Execute use case
  const result = await container.getProductById.execute({
    productId: id,
    tenantId,
  });

  if (!result.product) {
    throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: result.product,
  });
});

/**
 * POST /api/catalog/products/:id/availability
 * Check stock availability
 */
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  if (!id) {
    throw createError('Product ID is required', 400, 'MISSING_PARAMETER');
  }

  // Validate request body
  const bodySchema = z.object({
    quantity: z.number().int().positive(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  const { quantity } = parsed.data;

  // Execute use case
  const result = await container.checkProductAvailability.execute({
    productId: id,
    tenantId,
    requestedQuantity: quantity,
  });

  res.status(200).json({
    success: true,
    data: {
      isAvailable: result.isAvailable,
      product: result.product,
      availableQuantity: result.availableQuantity,
      reason: result.reason,
    },
  });
});
