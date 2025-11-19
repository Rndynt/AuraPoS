/**
 * Tenants Controller
 * Handles tenant feature management endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { container } from '../../container';
import { asyncHandler, createError } from '../middleware/errorHandler';
import type { BusinessType } from '@pos/core';

/**
 * GET /api/tenants/features
 * Get active features for tenant
 */
export const getActiveFeatures = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  // Execute use case
  const result = await container.getActiveFeaturesForTenant.execute({
    tenant_id: tenantId,
  });

  res.status(200).json({
    success: true,
    data: {
      features: result.features,
      total: result.total,
    },
  });
});

/**
 * POST /api/tenants/features/check
 * Check feature access for tenant
 */
export const checkFeatureAccess = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  // Validate request body
  const bodySchema = z.object({
    feature_code: z.string().min(1),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  const { feature_code } = parsed.data;

  // Execute use case
  const result = await container.checkFeatureAccess.execute({
    tenant_id: tenantId,
    feature_code,
  });

  res.status(200).json({
    success: true,
    data: result.result,
  });
});

/**
 * POST /api/tenants/register
 * Create new tenant with business type
 */
export const registerTenant = asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const bodySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    business_type: z.enum([
      'CAFE_RESTAURANT',
      'RETAIL_MINIMARKET',
      'LAUNDRY',
      'SERVICE_APPOINTMENT',
      'DIGITAL_PPOB',
    ] as const, {
      errorMap: () => ({ message: 'Invalid business type' }),
    }),
    business_name: z.string().optional(),
    business_address: z.string().optional(),
    business_phone: z.string().optional(),
    business_email: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().email('Invalid email format').optional()
    ),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    locale: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Invalid request body: ' + parsed.error.message, 400, 'VALIDATION_ERROR');
  }

  const data = parsed.data;

  // Execute use case
  const result = await container.createTenant.execute({
    name: data.name,
    slug: data.slug,
    business_type: data.business_type as BusinessType,
    business_name: data.business_name,
    business_address: data.business_address,
    business_phone: data.business_phone,
    business_email: data.business_email || undefined,
    timezone: data.timezone,
    currency: data.currency,
    locale: data.locale,
  });

  res.status(201).json({
    success: true,
    data: {
      tenant: result.profile.tenant,
      features: result.profile.features,
      moduleConfig: result.profile.moduleConfig,
    },
  });
});

/**
 * GET /api/tenants/profile
 * Get tenant profile with modules
 */
export const getTenantProfile = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  // Execute use case
  const result = await container.getTenantProfile.execute({
    tenant_id: tenantId,
  });

  res.status(200).json({
    success: true,
    data: result.profile,
  });
});
