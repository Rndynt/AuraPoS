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

const DEFAULT_PLAN: PlanCode = 'starter';
const DEFAULT_BUSINESS_TYPE: BusinessTypeCode = 'CAFE_RESTAURANT';

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

export async function getEffectiveEntitlementMap(
  tenantId: string,
  database: EntitlementDatabase = db,
): Promise<Record<string, boolean>> {
  const context = await loadTenantEntitlementContext(tenantId, database);
  const allCodes = Object.keys(ENTITLEMENT_CATALOG.entitlements) as EntitlementCode[];

  const map = Object.fromEntries(allCodes.map((code) => [code, false])) as Record<string, boolean>;
  if (!context) return map;

  const effective = await getEffectiveEntitlements({
    planCode: context.planCode,
    businessType: context.businessType,
    grants: context.grants,
  });

  for (const code of effective) {
    map[code] = true;
  }

  return map;
}
