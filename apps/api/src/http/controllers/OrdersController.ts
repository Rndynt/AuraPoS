/**
 * Orders Controller
 * Handles order management and payment endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { container } from '../../container';
import { asyncHandler, createError } from '../middleware/errorHandler';

/**
 * POST /api/orders
 * Create new order
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  // Validate request body
  const selectedOptionSchema = z.object({
    group_id: z.string(),
    group_name: z.string(),
    option_id: z.string(),
    option_name: z.string(),
    price_delta: z.number(),
  });

  const orderItemSchema = z.object({
    product_id: z.string(),
    product_name: z.string(),
    base_price: z.number(),
    quantity: z.number().int().positive(),
    variant_id: z.string().optional(),
    variant_name: z.string().optional(),
    variant_price_delta: z.number().optional(),
    selected_options: z.array(selectedOptionSchema).optional(),
    notes: z.string().optional(),
  });

  const bodySchema = z.object({
    items: z.array(orderItemSchema).min(1),
    customer_name: z.string().optional(),
    table_number: z.string().optional(),
    notes: z.string().optional(),
    tax_rate: z.number().optional(),
    service_charge_rate: z.number().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  // Execute use case
  const result = await container.createOrder.execute({
    tenant_id: tenantId,
    ...parsed.data,
  });

  res.status(201).json({
    success: true,
    data: {
      order: result.order,
      pricing: result.pricing,
    },
  });
});

/**
 * POST /api/orders/:id/payments
 * Record payment (supports partial payments)
 */
export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  if (!id) {
    throw createError('Order ID is required', 400, 'MISSING_PARAMETER');
  }

  // Validate request body
  const bodySchema = z.object({
    amount: z.number().positive(),
    payment_method: z.enum(['cash', 'card', 'ewallet', 'other']),
    transaction_ref: z.string().optional(),
    notes: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  // Execute use case
  const result = await container.recordPayment.execute({
    order_id: id,
    tenant_id: tenantId,
    ...parsed.data,
  });

  res.status(201).json({
    success: true,
    data: {
      payment: result.payment,
      order: result.order,
      remainingAmount: result.remainingAmount,
    },
  });
});

/**
 * POST /api/orders/:id/kitchen-ticket
 * Create kitchen ticket
 */
export const createKitchenTicket = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  if (!id) {
    throw createError('Order ID is required', 400, 'MISSING_PARAMETER');
  }

  // Validate request body (optional priority)
  const bodySchema = z.object({
    priority: z.enum(['normal', 'high', 'urgent']).optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  // Execute use case
  const result = await container.createKitchenTicket.execute({
    order_id: id,
    tenant_id: tenantId,
    priority: parsed.data.priority,
  });

  res.status(201).json({
    success: true,
    data: {
      ticket: result.ticket,
    },
  });
});

/**
 * GET /api/orders
 * List orders for tenant with filters
 */
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  const orderStatusSchema = z.enum(['draft', 'confirmed', 'completed', 'cancelled']);

  // Validate query params
  const querySchema = z.object({
    status: z
      .preprocess((value) => {
        if (typeof value === 'string') {
          return value
            .split(',')
            .map((status) => status.trim())
            .filter(Boolean);
        }
        return value;
      }, z.array(orderStatusSchema).optional())
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    payment_status: z.enum(['paid', 'partial', 'unpaid']).optional(),
    startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createError('Invalid query parameters: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  const { status, payment_status, startDate, endDate, page, limit } = parsed.data;

  // Calculate pagination
  const offset = (page! - 1) * limit!;

  const filterOptions = {
    status,
    paymentStatus: payment_status,
    dateFrom: startDate,
    dateTo: endDate,
  };

  // Query orders using repository
  const [orders, total] = await Promise.all([
    container.orderRepository.findByTenant(tenantId, {
      ...filterOptions,
      limit: limit!,
      offset,
    }),
    container.orderRepository.countByTenant(tenantId, filterOptions),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: page!,
        limit: limit!,
        total,
      },
    },
  });
});

/**
 * GET /api/orders/:id
 * Get single order with all details
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.params;

  if (!id) {
    throw createError('Order ID is required', 400, 'MISSING_PARAMETER');
  }

  // Query order using repository
  const order = await container.orderRepository.findById(id, tenantId);

  if (!order) {
    throw createError('Order not found', 404, 'ORDER_NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});
