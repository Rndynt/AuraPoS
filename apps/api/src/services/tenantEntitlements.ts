import { and, eq, gt, isNull, or } from 'drizzle-orm';
import {
  getEffectiveEntitlements,
  ENTITLEMENT_CATALOG,
  type BusinessTypeCode,
  type EntitlementCode,
  type PlanCode,
  type TenantEntitlementGrant,
} from '@pos/application/entitlements';
import { db } from '@pos/infrastructure/database';
import { tenantEntitlements, tenants } from '@pos/infrastructure/db/schema';
import { cacheKeys, getCacheJson, setCacheJson, deleteCacheKey } from './distributedCache';

const DEFAULT_PLAN: PlanCode = 'starter';
const DEFAULT_BUSINESS_TYPE: BusinessTypeCode = 'CAFE_RESTAURANT';

/** Cache TTL for entitlement maps (seconds). Same as tenant resolution cache. */
const ENTITLEMENT_CACHE_TTL_SECONDS = 60;

export function toPlanCode(planTier: string | null | undefined): PlanCode {
  if (planTier === 'growth' || planTier === 'pro' || planTier === 'starter') return planTier;
  if (planTier === 'free') return 'starter';
  return DEFAULT_PLAN;
}

export function toBusinessTypeCode(businessType: string | null | undefined): BusinessTypeCode {
  if (
    businessType === 'CAFE_RESTAURANT' ||
    businessType === 'RETAIL_MINIMARKET' ||
    businessType === 'LAUNDRY' ||
    businessType === 'SERVICE_APPOINTMENT' ||
    businessType === 'DIGITAL_PPOB'
  ) {
    return businessType;
  }
  return DEFAULT_BUSINESS_TYPE;
}

export type TenantEntitlementContext = {
  tenantId: string;
  planCode: PlanCode;
  businessType: BusinessTypeCode;
  grants: TenantEntitlementGrant[];
};

type EntitlementDatabase = { select: (...args: any[]) => any };

export async function loadTenantEntitlementContext(
  tenantId: string,
  database: EntitlementDatabase = db,
): Promise<TenantEntitlementContext | null> {
  const [tenant] = await database
    .select({ planTier: tenants.planTier, businessType: tenants.businessType })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return null;

  const now = new Date();
  const grantRows = await database
    .select({
      entitlementCode: tenantEntitlements.entitlementCode,
      status: tenantEntitlements.status,
      expiresAt: tenantEntitlements.expiresAt,
      source: tenantEntitlements.source,
    })
    .from(tenantEntitlements)
    .where(
      and(
        eq(tenantEntitlements.tenantId, tenantId),
        eq(tenantEntitlements.status, 'active'),
        or(isNull(tenantEntitlements.expiresAt), gt(tenantEntitlements.expiresAt, now)),
      ),
    );

  return {
    tenantId,
    planCode: toPlanCode(tenant.planTier),
    businessType: toBusinessTypeCode(tenant.businessType),
    grants: grantRows.map((grant: any): TenantEntitlementGrant => ({
      entitlementCode: grant.entitlementCode,
      status: grant.status,
      expiresAt: grant.expiresAt,
      source: grant.source,
    })),
  };
}

/**
 * Returns the effective entitlement map for a tenant.
 *
 * Results are cached for ENTITLEMENT_CACHE_TTL_SECONDS (60s) via the
 * distributed cache (Redis when available, process-local fallback otherwise).
 * Call `invalidateTenantEntitlementCache(tenantId)` after plan upgrades or
 * marketplace purchases to force a fresh DB read on the next request.
 *
 * Accepts an optional `database` override for testing (bypasses cache).
 */
export async function getEffectiveEntitlementMap(
  tenantId: string,
  database: EntitlementDatabase = db,
): Promise<Record<string, boolean>> {
  const allCodes = Object.keys(ENTITLEMENT_CATALOG.entitlements) as EntitlementCode[];
  const emptyMap = Object.fromEntries(allCodes.map((code) => [code, false])) as Record<string, boolean>;

  // Skip cache when a custom database override is provided (typically in tests)
  const useCache = database === db;
  const cacheKey = cacheKeys.entitlements(tenantId);

  if (useCache) {
    const cached = await getCacheJson<Record<string, boolean>>(cacheKey);
    if (cached) return cached;
  }

  const context = await loadTenantEntitlementContext(tenantId, database);
  if (!context) return emptyMap;

  const effective = await getEffectiveEntitlements({
    planCode: context.planCode,
    businessType: context.businessType,
    grants: context.grants,
  });

  const map = { ...emptyMap };
  for (const code of effective) {
    map[code] = true;
  }

  if (useCache) {
    await setCacheJson(cacheKey, map, ENTITLEMENT_CACHE_TTL_SECONDS);
  }

  return map;
}

/**
 * Invalidate the cached entitlement map for a tenant.
 * Call after: plan upgrade, marketplace purchase/revocation, or manual grant change.
 */
export async function invalidateTenantEntitlementCache(tenantId: string): Promise<void> {
  await deleteCacheKey(cacheKeys.entitlements(tenantId));
}
