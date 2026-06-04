import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.DATABASE_URL ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-with-at-least-32-characters';

const { registerTenantOwner, RegistrationError } = await import('../services/registrationService');
const { BUSINESS_TYPE_TEMPLATES } = await import('@pos/application/tenants/businessTypeTemplates');
const { PLAN_FEATURE_MAP } = await import('../constants/planFeatureMap');
const { isBillingPlanChangeAuthorized } = await import('../http/controllers/TenantsController');
const {
  orderTypes,
  outlets,
  productCategories,
  products,
  tenantFeatures,
  tenantModuleConfigs,
  tenantOrderTypes,
  tenants,
  userOutletAssignments,
} = await import('@shared/schema');
const { user: authUser } = await import('../lib/auth-schema');

type InsertOperation = {
  table: unknown;
  values: any;
};

type UpdateOperation = {
  table: unknown;
  set: any;
};

type FakeRegistrationOptions = {
  tenantInsertError?: unknown;
  duplicateEmailError?: unknown;
  failAuthLinkAfterUserCreated?: boolean;
  missingOrderTypes?: boolean;
  availableOrderTypeCodes?: string[];
};

const baseInput = {
  slug: 'kopi-maju',
  businessName: 'Kopi Maju',
  businessType: 'CAFE_RESTAURANT' as const,
  ownerName: 'Owner Kopi',
  ownerEmail: 'owner@kopimaju.test',
  ownerPassword: 'Secret123!',
  ownerUsername: 'kopi_owner',
  timezone: 'Asia/Jakarta',
  currency: 'IDR',
  locale: 'id-ID',
};

const ALL_ORDER_TYPE_ROWS = [
  { id: 'ot-dine-in',   code: 'DINE_IN' },
  { id: 'ot-take-away', code: 'TAKE_AWAY' },
  { id: 'ot-delivery',  code: 'DELIVERY' },
  { id: 'ot-walk-in',   code: 'WALK_IN' },
];

function createFakeDeps(options: FakeRegistrationOptions = {}) {
  const inserts: InsertOperation[] = [];
  const updates: UpdateOperation[] = [];
  const cleanupAuthUsers: string[] = [];
  const cleanupTenants: string[] = [];
  const transactionCalls: string[] = [];
  let idCounter = 0;

  // Default: only the order types that CAFE_RESTAURANT (the baseInput default) needs.
  // Tests using other business types must explicitly pass the right codes.
  const availableCodes = new Set(
    options.availableOrderTypeCodes ?? ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'],
  );

  const tx = {
    insert(table: unknown) {
      return {
        values(values: any) {
          inserts.push({ table, values });

          if (table === tenants && options.tenantInsertError) {
            return {
              returning: async () => {
                throw options.tenantInsertError;
              },
            };
          }

          if (table === tenants) {
            return {
              returning: async () => [
                {
                  id: values.id,
                  slug: values.slug,
                  name: values.name,
                },
              ],
            };
          }

          if (table === outlets) {
            return {
              returning: async () => [
                {
                  id: `outlet-${idCounter}`,
                  ...values,
                },
              ],
            };
          }

          if (table === tenantModuleConfigs || table === tenantFeatures || table === tenantOrderTypes || table === products) {
            return Promise.resolve({ rowCount: Array.isArray(values) ? values.length : 1 });
          }

          if (table === productCategories) {
            return {
              returning: async () => [
                {
                  id: `category-${idCounter}-${inserts.filter((op) => op.table === productCategories).length}`,
                  ...values,
                },
              ],
            };
          }

          if (table === userOutletAssignments) {
            return {
              onConflictDoUpdate: async () => ({ rowCount: 1 }),
            };
          }

          return {
            returning: async () => [{ ...values }],
          };
        },
      };
    },
    select() {
      return {
        from(table: unknown) {
          return {
            where: async () => {
              if (table !== orderTypes || options.missingOrderTypes) return [];
              return ALL_ORDER_TYPE_ROWS.filter((row) => availableCodes.has(row.code));
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(setValues: any) {
          updates.push({ table, set: setValues });
          return {
            where: async () => {
              if (table === authUser && options.failAuthLinkAfterUserCreated) {
                throw new Error('simulated auth link failure');
              }
              return { rowCount: 1 };
            },
          };
        },
      };
    },
  };

  const deps = {
    baseDomain: 'aurapos.test',
    generateId: () => {
      idCounter += 1;
      return `tenant-${idCounter}`;
    },
    runTransaction: async <T>(callback: (tx: any) => Promise<T>) => {
      transactionCalls.push('begin');
      try {
        const result = await callback(tx);
        transactionCalls.push('commit');
        return result;
      } catch (error) {
        transactionCalls.push('rollback');
        throw error;
      }
    },
    signUpOwner: async () => {
      if (options.duplicateEmailError) throw options.duplicateEmailError;
      return { user: { id: 'user-owner-1' } };
    },
    linkOwnerToTenant: async (userId: string, tenantId: string) => {
      updates.push({ table: authUser, set: { tenantId, role: 'owner' } });
      if (options.failAuthLinkAfterUserCreated) {
        throw new Error('simulated auth link failure');
      }
    },
    cleanupAuthUser: async (userId: string) => {
      cleanupAuthUsers.push(userId);
    },
    cleanupTenant: async (tenantId: string) => {
      cleanupTenants.push(tenantId);
    },
  };

  return { deps, inserts, updates, cleanupAuthUsers, cleanupTenants, transactionCalls };
}

// ─── Core registration flow ───────────────────────────────────────────────────

describe('registerTenantOwner', () => {
  it('creates tenant, default outlet, module config, owner link, and owner outlet assignment in one transaction flow', async () => {
    const fake = createFakeDeps();

    const result = await registerTenantOwner(baseInput, fake.deps);

    assert.deepEqual(fake.transactionCalls, ['begin', 'commit']);
    assert.equal(result.tenant.id, 'tenant-1');
    assert.equal(result.tenant.slug, 'kopi-maju');
    assert.equal(result.tenant.url, 'https://kopi-maju.aurapos.test');
    assert.equal(result.defaultOutletId, 'outlet-1');

    const tenantInsert = fake.inserts.find((op) => op.table === tenants);
    assert.equal(tenantInsert?.values.slug, 'kopi-maju');
    assert.equal(tenantInsert?.values.businessType, 'CAFE_RESTAURANT');

    // BILLING SAFETY: plan must always be 'free' regardless of business type
    assert.equal(tenantInsert?.values.planTier, 'free', 'new tenant must always start on free plan');
    assert.equal(tenantInsert?.values.subscriptionStatus, 'active');

    const outletInsert = fake.inserts.find((op) => op.table === outlets);
    assert.equal(outletInsert?.values.tenantId, 'tenant-1');
    assert.equal(outletInsert?.values.slug, 'main');
    assert.equal(outletInsert?.values.isDefault, true);

    // All paid modules must be disabled for new free tenants
    const moduleInsert = fake.inserts.find((op) => op.table === tenantModuleConfigs);
    assert.equal(moduleInsert?.values.tenantId, 'tenant-1');
    assert.equal(moduleInsert?.values.enableTableManagement, false, 'table management must be disabled (growth feature)');
    assert.equal(moduleInsert?.values.enableKitchenTicket, false, 'kitchen ticket must be disabled (growth feature)');
    assert.equal(moduleInsert?.values.enableMultiLocation, false);
    assert.equal(moduleInsert?.values.enableLoyalty, false, 'loyalty must be disabled (growth feature)');
    assert.equal(moduleInsert?.values.enableDelivery, false, 'delivery module must be disabled (growth feature)');

    const authUpdate = fake.updates.find((op) => op.table === authUser);
    assert.equal(authUpdate?.set.tenantId, 'tenant-1');
    assert.equal(authUpdate?.set.role, 'owner');

    // Only free-plan features must be seeded
    const featureInsert = fake.inserts.find((op) => op.table === tenantFeatures);
    const seededCodes: string[] = featureInsert?.values.map((f: any) => f.featureCode) ?? [];
    const freeFeatures = PLAN_FEATURE_MAP.free;
    for (const code of seededCodes) {
      assert.ok(
        freeFeatures.includes(code),
        `feature '${code}' is not in the free plan — paid features must not be seeded at registration`,
      );
    }

    assert.deepEqual(result.featureCodes.sort(), [
      'discounts',
      'order_queue',
      'partial_payment',
      'product_variants',
      'receipt_printer',
      'sales_reports',
    ]);

    const orderTypeInsert = fake.inserts.find((op) => op.table === tenantOrderTypes);
    assert.equal(orderTypeInsert?.values.length, 3);
    assert.deepEqual(result.orderTypeCodes, ['DINE_IN', 'TAKE_AWAY', 'DELIVERY']);

    const categoryInserts = fake.inserts.filter((op) => op.table === productCategories);
    assert.equal(categoryInserts.length, 2);
    const productInserts = fake.inserts.filter((op) => op.table === products);
    assert.equal(productInserts.reduce((count, op) => count + op.values.length, 0), 6);
    assert.deepEqual(result.catalogSeed, { categories: 2, products: 6 });

    const outletAssignment = fake.inserts.find((op) => op.table === userOutletAssignments);
    assert.equal(outletAssignment?.values.userId, 'user-owner-1');
    assert.equal(outletAssignment?.values.outletId, 'outlet-1');
    assert.equal(outletAssignment?.values.role, 'owner');
  });

  it('maps duplicate tenant slug from the database unique constraint and does not rely only on pre-checks', async () => {
    const uniqueError = Object.assign(new Error('duplicate key value violates unique constraint "tenants_slug_unique"'), {
      code: '23505',
      constraint: 'tenants_slug_unique',
    });
    const fake = createFakeDeps({ tenantInsertError: uniqueError });

    await assert.rejects(
      () => registerTenantOwner(baseInput, fake.deps),
      (error: unknown) => {
        assert.ok(error instanceof RegistrationError);
        assert.equal(error.code, 'DUPLICATE_SLUG');
        assert.equal(error.status, 409);
        return true;
      },
    );

    assert.deepEqual(fake.transactionCalls, ['begin', 'rollback']);
    assert.deepEqual(fake.cleanupAuthUsers, []);
    assert.deepEqual(fake.cleanupTenants, []);
  });

  it('fails and compensates tenant resources when required order types are not seeded', async () => {
    const fake = createFakeDeps({ missingOrderTypes: true });

    await assert.rejects(
      () => registerTenantOwner(baseInput, fake.deps),
      (error: unknown) => {
        assert.ok(error instanceof RegistrationError);
        assert.equal(error.code, 'REGISTRATION_FAILED');
        assert.equal(error.status, 500);
        return true;
      },
    );

    assert.deepEqual(fake.transactionCalls, ['begin', 'rollback']);
    assert.deepEqual(fake.cleanupAuthUsers, []);
    assert.deepEqual(fake.cleanupTenants, ['tenant-1']);
  });

  it('maps duplicate owner email from Better Auth and compensates tenant/default data', async () => {
    const duplicateEmailError = Object.assign(new Error('email already exists'), { code: 'USER_ALREADY_EXISTS' });
    const fake = createFakeDeps({ duplicateEmailError });

    await assert.rejects(
      () => registerTenantOwner(baseInput, fake.deps),
      (error: unknown) => {
        assert.ok(error instanceof RegistrationError);
        assert.equal(error.code, 'DUPLICATE_EMAIL');
        assert.equal(error.status, 409);
        return true;
      },
    );

    assert.deepEqual(fake.transactionCalls, ['begin', 'rollback']);
    assert.deepEqual(fake.cleanupAuthUsers, []);
    assert.deepEqual(fake.cleanupTenants, ['tenant-1']);
  });

  it('cleans Better Auth user rows and tenant resources when a failure happens after owner user creation', async () => {
    const fake = createFakeDeps({ failAuthLinkAfterUserCreated: true });

    await assert.rejects(
      () => registerTenantOwner(baseInput, fake.deps),
      (error: unknown) => {
        assert.ok(error instanceof RegistrationError);
        assert.equal(error.code, 'REGISTRATION_FAILED');
        assert.equal(error.status, 500);
        return true;
      },
    );

    assert.deepEqual(fake.transactionCalls, ['begin', 'rollback']);
    assert.deepEqual(fake.cleanupAuthUsers, ['user-owner-1']);
    assert.deepEqual(fake.cleanupTenants, ['tenant-1']);
  });
});

// ─── Template safety (regression: no paid entitlements at onboarding) ─────────

describe('BUSINESS_TYPE_TEMPLATES — entitlement safety', () => {
  const FREE_FEATURES = new Set(PLAN_FEATURE_MAP.free);
  const PAID_MODULES = [
    'enable_table_management',
    'enable_kitchen_ticket',
    'enable_loyalty',
    'enable_delivery',
    'enable_inventory_advanced',
    'enable_appointments',
    'enable_multi_location',
  ];

  for (const [businessType, template] of Object.entries(BUSINESS_TYPE_TEMPLATES)) {
    it(`${businessType}: plan_tier must be 'free'`, () => {
      assert.equal(
        template.tenantDefaults.plan_tier,
        'free',
        `${businessType} template has plan_tier='${template.tenantDefaults.plan_tier}' — must be 'free' for onboarding safety`,
      );
    });

    it(`${businessType}: subscription_status must be 'active' (not 'trial')`, () => {
      assert.equal(
        template.tenantDefaults.subscription_status,
        'active',
        `${businessType} template has subscription_status='${template.tenantDefaults.subscription_status}'`,
      );
    });

    it(`${businessType}: all features must be within PLAN_FEATURE_MAP.free`, () => {
      for (const feature of template.features) {
        assert.ok(
          FREE_FEATURES.has(feature.feature_code),
          `${businessType} template seeds feature '${feature.feature_code}' which is NOT in the free plan — remove it`,
        );
      }
    });

    it(`${businessType}: paid modules must be disabled by default`, () => {
      for (const moduleKey of PAID_MODULES) {
        const value = (template.moduleConfig as Record<string, unknown>)[moduleKey];
        assert.equal(
          value,
          false,
          `${businessType} template has paid module '${moduleKey}' = ${value} — must default to false for free tenants`,
        );
      }
    });
  }

  it('no template seeds payment_gateway, api_integration, or kitchen_display as active features', () => {
    const forbidden = ['payment_gateway', 'api_integration', 'kitchen_display', 'kitchen_ticket', 'kitchen_printer'];
    for (const [businessType, template] of Object.entries(BUSINESS_TYPE_TEMPLATES)) {
      for (const feature of template.features) {
        assert.ok(
          !forbidden.includes(feature.feature_code),
          `${businessType} template must not seed paid feature '${feature.feature_code}'`,
        );
      }
    }
  });
});

// ─── Registration entitlement (all business types start on free) ─────────────

describe('registerTenantOwner — all business types start on free plan', () => {
  const businessTypes = [
    'CAFE_RESTAURANT',
    'RETAIL_MINIMARKET',
    'LAUNDRY',
    'SERVICE_APPOINTMENT',
    'DIGITAL_PPOB',
  ] as const;

  // Each business type uses specific order types from its template — fake only those.
  const orderTypesPerBusiness: Record<string, string[]> = {
    CAFE_RESTAURANT:     ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'],
    RETAIL_MINIMARKET:   ['WALK_IN'],
    LAUNDRY:             ['WALK_IN'],
    SERVICE_APPOINTMENT: ['WALK_IN'],
    DIGITAL_PPOB:        ['WALK_IN'],
  };

  for (const businessType of businessTypes) {
    it(`${businessType}: inserted tenant has planTier='free' and subscriptionStatus='active'`, async () => {
      const fake = createFakeDeps({ availableOrderTypeCodes: orderTypesPerBusiness[businessType] });
      await registerTenantOwner({ ...baseInput, slug: `test-${businessType.toLowerCase()}`, businessType }, fake.deps);

      const tenantInsert = fake.inserts.find((op) => op.table === tenants);
      assert.equal(tenantInsert?.values.planTier, 'free', `${businessType} must onboard as free`);
      assert.equal(tenantInsert?.values.subscriptionStatus, 'active');
      assert.equal(
        tenantInsert?.values.trialEndsAt,
        undefined,
        `${businessType} must not have a trialEndsAt date set at registration`,
      );
    });

    it(`${businessType}: seeded features are a strict subset of PLAN_FEATURE_MAP.free`, async () => {
      const fake = createFakeDeps({ availableOrderTypeCodes: orderTypesPerBusiness[businessType] });
      const result = await registerTenantOwner(
        { ...baseInput, slug: `feat-${businessType.toLowerCase()}`, businessType },
        fake.deps,
      );

      const freeFeatures = new Set(PLAN_FEATURE_MAP.free);
      for (const code of result.featureCodes) {
        assert.ok(
          freeFeatures.has(code),
          `${businessType} registration seeded paid feature '${code}' — this must not happen`,
        );
      }
    });

    it(`${businessType}: no paid modules are active after registration`, async () => {
      const fake = createFakeDeps({ availableOrderTypeCodes: orderTypesPerBusiness[businessType] });
      await registerTenantOwner(
        { ...baseInput, slug: `mod-${businessType.toLowerCase()}`, businessType },
        fake.deps,
      );

      const moduleInsert = fake.inserts.find((op) => op.table === tenantModuleConfigs);
      assert.ok(moduleInsert, 'module config must be inserted');

      const paidModules = [
        'enableTableManagement',
        'enableKitchenTicket',
        'enableLoyalty',
        'enableDelivery',
        'enableInventoryAdvanced',
        'enableAppointments',
        'enableMultiLocation',
      ];

      for (const key of paidModules) {
        assert.equal(
          moduleInsert.values[key],
          false,
          `${businessType}: paid module '${key}' must be false at registration (got ${moduleInsert.values[key]})`,
        );
      }
    });
  }
});

// ─── Plan switch endpoint authorization ──────────────────────────────────────

describe('isBillingPlanChangeAuthorized', () => {
  const makeReq = (headers: Record<string, string> = {}) =>
    ({ headers } as unknown as import('express').Request);

  it('returns false when BILLING_INTERNAL_SECRET env var is not set', () => {
    const original = process.env.BILLING_INTERNAL_SECRET;
    delete process.env.BILLING_INTERNAL_SECRET;
    try {
      const req = makeReq({ 'x-internal-billing-secret': 'anything' });
      assert.equal(isBillingPlanChangeAuthorized(req), false);
    } finally {
      if (original !== undefined) process.env.BILLING_INTERNAL_SECRET = original;
    }
  });

  it('returns false when BILLING_INTERNAL_SECRET is set but header is missing', () => {
    process.env.BILLING_INTERNAL_SECRET = 'super-secret-billing-key';
    try {
      const req = makeReq({});
      assert.equal(isBillingPlanChangeAuthorized(req), false);
    } finally {
      delete process.env.BILLING_INTERNAL_SECRET;
    }
  });

  it('returns false when BILLING_INTERNAL_SECRET is set but header value is wrong', () => {
    process.env.BILLING_INTERNAL_SECRET = 'super-secret-billing-key';
    try {
      const req = makeReq({ 'x-internal-billing-secret': 'wrong-value' });
      assert.equal(isBillingPlanChangeAuthorized(req), false);
    } finally {
      delete process.env.BILLING_INTERNAL_SECRET;
    }
  });

  it('returns true when BILLING_INTERNAL_SECRET is set and header matches exactly', () => {
    process.env.BILLING_INTERNAL_SECRET = 'super-secret-billing-key';
    try {
      const req = makeReq({ 'x-internal-billing-secret': 'super-secret-billing-key' });
      assert.equal(isBillingPlanChangeAuthorized(req), true);
    } finally {
      delete process.env.BILLING_INTERNAL_SECRET;
    }
  });

  it('returns false for an empty string secret even if header matches', () => {
    process.env.BILLING_INTERNAL_SECRET = '';
    try {
      const req = makeReq({ 'x-internal-billing-secret': '' });
      assert.equal(isBillingPlanChangeAuthorized(req), false);
    } finally {
      delete process.env.BILLING_INTERNAL_SECRET;
    }
  });
});
