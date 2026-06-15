import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import http from 'node:http';
import express from 'express';

process.env.DATABASE_URL ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-with-at-least-32-characters';

const { createRegistrationRouter } = await import('../http/routes/registration');

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function request(app: express.Express, path: string, body?: unknown) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === 'object');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    return { status: response.status, body: json, headers: response.headers };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

/** Minimal success stub — records the call and returns a valid response shape. */
function makeRouter(opts: {
  checkSlugExists?: (slug: string) => Promise<boolean>;
  capturedInput?: { value?: any };
} = {}) {
  const calls: any[] = [];
  const app = express();
  app.use(express.json());
  app.use('/api/register', createRegistrationRouter({
    baseDomain: 'aurapos.test',
    checkSlugExists: opts.checkSlugExists ?? (async () => false),
    registerTenantOwner: async (input: any) => {
      calls.push(input);
      if (opts.capturedInput) opts.capturedInput.value = input;
      return {
        tenant: { id: 't-1', slug: input.slug, name: input.businessName, url: `https://${input.slug}.aurapos.test` },
        ownerUserId: 'u-1',
        defaultOutletId: 'o-1',
        featureCodes: ['receipt_printer', 'sales_reports'],
        orderTypeCodes: ['DINE_IN', 'TAKE_AWAY'],
        catalogSeed: { categories: 2, products: 6 },
      };
    },
  }));
  return { app, calls };
}

const VALID_BODY = {
  slug: 'kopi-maju',
  businessName: 'Kopi Maju',
  businessType: 'CAFE_RESTAURANT',
  ownerName: 'Owner Kopi',
  ownerEmail: 'owner@kopimaju.test',
  ownerUsername: 'kopi_owner',
  ownerPassword: 'Secret123!',
};

// ─── POST /api/register ───────────────────────────────────────────────────────

describe('POST /api/register E2E', () => {
  it('uses the canonical route to create owner-backed tenant onboarding data', async () => {
    const { app, calls } = makeRouter();
    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'Kopi-Maju' });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.tenant.slug, 'kopi-maju');
    assert.equal(response.body.defaultOutletId, 'o-1');
    assert.deepEqual(response.body.featureCodes,  ['receipt_printer', 'sales_reports']);
    assert.deepEqual(response.body.orderTypeCodes, ['DINE_IN', 'TAKE_AWAY']);
    assert.deepEqual(response.body.catalogSeed, { categories: 2, products: 6 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].slug, 'kopi-maju');
    assert.equal(calls[0].ownerEmail, 'owner@kopimaju.test');
  });

  it('keeps slug reservation and duplicate checks before onboarding writes', async () => {
    let registerCalled = false;
    const app = express();
    app.use(express.json());
    app.use('/api/register', createRegistrationRouter({
      checkSlugExists: async () => true,
      registerTenantOwner: async () => {
        registerCalled = true;
        throw new Error('should not be called');
      },
    }));

    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'taken-slug' });
    assert.equal(response.status, 409);
    assert.equal(registerCalled, false);
  });
});

// ─── Slug normalisation (route layer) ────────────────────────────────────────

describe('Slug normalisation — route layer', () => {
  it('lowercases an all-uppercase slug before calling the service', async () => {
    const captured: { value?: any } = {};
    const { app } = makeRouter({ capturedInput: captured });
    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'KOPI-MAJU' });
    assert.equal(response.status, 201);
    assert.equal(captured.value?.slug, 'kopi-maju', 'route must pass lowercase slug to service');
  });

  it('lowercases a mixed-case slug', async () => {
    const captured: { value?: any } = {};
    const { app } = makeRouter({ capturedInput: captured });
    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'Toko-Maju-123' });
    assert.equal(response.status, 201);
    assert.equal(captured.value?.slug, 'toko-maju-123');
  });

  it('response body tenant.slug is always lowercase', async () => {
    const { app } = makeRouter();
    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'MyShop' });
    assert.equal(response.status, 201);
    const returnedSlug: string = response.body.tenant.slug;
    assert.equal(returnedSlug, returnedSlug.toLowerCase(), 'slug in response must be all-lowercase');
  });

  it('slug with only lowercase letters and hyphens passes validation', async () => {
    const { app } = makeRouter();
    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'my-valid-slug' });
    assert.equal(response.status, 201);
  });

  it('slug with uppercase letters is accepted and normalised (not rejected)', async () => {
    const { app } = makeRouter();
    const response = await request(app, '/api/register', { ...VALID_BODY, slug: 'MyValidSlug' });
    // Must succeed (not 400) — route normalises before validation
    assert.equal(response.status, 201);
  });
});

// ─── Slug auto-generation ─────────────────────────────────────────────────────

describe('Slug auto-generation — slug omitted', () => {
  it('registration succeeds when slug is omitted — slug is auto-generated from businessName', async () => {
    const captured: { value?: any } = {};
    const { app } = makeRouter({ capturedInput: captured });
    const { slug: _omit, ...noSlug } = VALID_BODY;
    const response = await request(app, '/api/register', noSlug);

    assert.equal(response.status, 201, 'must return 201 when slug is omitted');
    assert.ok(captured.value?.slug, 'a slug must be auto-generated and passed to service');
    // 'Kopi Maju' normalises to 'kopi-maju'
    assert.equal(captured.value.slug, 'kopi-maju', 'slug must be generated from businessName');
  });

  it('generated slug from businessName is passed to service and stored in response', async () => {
    const captured: { value?: any } = {};
    const { app } = makeRouter({ capturedInput: captured });
    const response = await request(app, '/api/register', {
      businessName: 'Warung Nasi Padang',
      businessType: 'CAFE_RESTAURANT',
      ownerName: 'Pak Budi',
      ownerEmail: 'budi@padang.test',
      ownerUsername: 'budi_padang',
      ownerPassword: 'Secret123!',
    });

    assert.equal(response.status, 201);
    assert.ok(captured.value?.slug);
    // 'Warung Nasi Padang' → 'warung-nasi-padang'
    assert.equal(captured.value.slug, 'warung-nasi-padang');
    assert.equal(response.body.tenant.slug, 'warung-nasi-padang');
  });

  it('duplicate businessName → unique slug with numeric suffix', async () => {
    const captured: { value?: any } = {};
    // First slug 'kopi-maju' is taken, next attempt 'kopi-maju-2' is free
    const checkSlugExists = async (slug: string) => slug === 'kopi-maju';
    const { app } = makeRouter({ capturedInput: captured, checkSlugExists });
    const { slug: _omit, ...noSlug } = VALID_BODY;
    const response = await request(app, '/api/register', noSlug);

    assert.equal(response.status, 201);
    assert.equal(captured.value?.slug, 'kopi-maju-2', 'must append -2 suffix when base slug is taken');
  });

  it('omitting slug does not include it in the missing fields error list', async () => {
    const { app } = makeRouter();
    // Missing ownerEmail (required), but no slug — slug should NOT appear in missing fields
    const response = await request(app, '/api/register', {
      businessName: 'Kopi Maju',
      ownerName: 'Owner',
      ownerUsername: 'owner',
      ownerPassword: 'Secret123!',
      // ownerEmail intentionally omitted
    });
    assert.equal(response.status, 400);
    assert.ok(Array.isArray(response.body.fields));
    assert.ok(response.body.fields.includes('ownerEmail'), 'ownerEmail should be listed as missing');
    assert.equal(response.body.fields.includes('slug'), false, 'slug must NOT be listed as a required field');
  });
});

// ─── Business type validation ─────────────────────────────────────────────────

describe('Business type handling — route layer', () => {
  it('accepts all 5 valid business types', async () => {
    const types: [string, string][] = [
      ['CAFE_RESTAURANT',     'biz-cafe'],
      ['RETAIL_MINIMARKET',   'biz-retail'],
      ['LAUNDRY',             'biz-laundry'],
      ['SERVICE_APPOINTMENT', 'biz-service'],
      ['DIGITAL_PPOB',        'biz-digital'],
    ];
    for (const [businessType, slug] of types) {
      const { app } = makeRouter();
      const response = await request(app, '/api/register', { ...VALID_BODY, slug, businessType });
      assert.equal(response.status, 201, `${businessType} must be accepted by the route`);
    }
  });

  it('passes the businessType field to the service', async () => {
    const captured: { value?: any } = {};
    const { app } = makeRouter({ capturedInput: captured });
    await request(app, '/api/register', { ...VALID_BODY, businessType: 'RETAIL_MINIMARKET' });
    assert.equal(captured.value?.businessType, 'RETAIL_MINIMARKET');
  });
});

// ─── Required fields validation ───────────────────────────────────────────────

describe('Required field validation — route layer', () => {
  it('returns 400 when ownerEmail is missing', async () => {
    const { app } = makeRouter();
    const { ownerEmail: _omit, ...noEmail } = VALID_BODY;
    const response = await request(app, '/api/register', noEmail);
    assert.equal(response.status, 400);
  });

  it('returns 400 when ownerPassword is missing', async () => {
    const { app } = makeRouter();
    const { ownerPassword: _omit, ...noPwd } = VALID_BODY;
    const response = await request(app, '/api/register', noPwd);
    assert.equal(response.status, 400);
  });

  it('returns 400 when businessName is missing', async () => {
    const { app } = makeRouter();
    const { businessName: _omit, ...noName } = VALID_BODY;
    const response = await request(app, '/api/register', noName);
    assert.equal(response.status, 400);
  });

  it('slug is not required — omitting slug succeeds if other fields are present', async () => {
    const { app } = makeRouter();
    const { slug: _omit, ...noSlug } = VALID_BODY;
    const response = await request(app, '/api/register', noSlug);
    assert.equal(response.status, 201, 'slug must be optional — auto-generated from businessName');
  });
});
