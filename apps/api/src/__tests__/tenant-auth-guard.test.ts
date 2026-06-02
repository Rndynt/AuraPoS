import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import http from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';

process.env.DATABASE_URL ||= 'postgres://user:pass@127.0.0.1:5432/aurapos_test';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-with-at-least-32-characters';

type GuardUser = {
  id: string;
  tenantId: string | null;
  role: string | null;
};

async function request(app: express.Express, path: string, headers: Record<string, string> = {}) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === 'object');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('tenant auth guard cross-tenant enforcement', async () => {
  const { createTenantAuthGuard, tenantMiddleware } = await import('../http/middleware/tenant');

  function buildApp(user: GuardUser | null) {
    const app = express();
    const guard = createTenantAuthGuard({
      getSession: async (req) => {
        const auth = req.headers.authorization;
        if (!auth) return null;
        return { user: { id: auth.replace('Bearer ', '') } };
      },
      getUserById: async (userId) => (user ? { ...user, id: userId } : null),
    });

    app.use('/api', (req: Request, _res: Response, next: NextFunction) => {
      req.tenantId = 'tenant-from-request';
      next();
    });
    app.use('/api', guard);

    const paths = [
      '/orders/:id',
      '/catalog/products',
      '/inventory/products',
      '/inventory/movements',
      '/tenants/features',
      '/outlets',
    ];

    for (const path of paths) {
      app.all(`/api${path}`, (req, res) => {
        res.status(200).json({ ok: true, path: req.path, authTenantUser: req.authTenantUser ?? null });
      });
    }

    return app;
  }

  const crossTenantPaths = [
    '/api/orders/order-1',
    '/api/catalog/products',
    '/api/inventory/products',
    '/api/inventory/movements',
    '/api/tenants/features',
    '/api/outlets',
  ];

  for (const path of crossTenantPaths) {
    it(`rejects authenticated cross-tenant access for ${path}`, async () => {
      const app = buildApp({ id: 'user-1', tenantId: 'different-tenant', role: 'cashier' });
      const response = await request(app, path, { Authorization: 'Bearer user-1' });

      assert.equal(response.status, 403);
      assert.equal(response.body?.code, 'TENANT_MISMATCH');
    });
  }

  it('allows authenticated access when session user tenant matches the resolved tenant', async () => {
    const app = buildApp({ id: 'user-1', tenantId: 'tenant-from-request', role: 'cashier' });
    const response = await request(app, '/api/catalog/products', { Authorization: 'Bearer user-1' });

    assert.equal(response.status, 200);
    assert.equal(response.body?.authTenantUser?.tenantId, 'tenant-from-request');
  });

  it('allows an explicit platform-admin role to access a different tenant', async () => {
    const app = buildApp({ id: 'user-1', tenantId: 'different-tenant', role: 'platform-admin' });
    const response = await request(app, '/api/orders/order-1', { Authorization: 'Bearer user-1' });

    assert.equal(response.status, 200);
    assert.equal(response.body?.authTenantUser?.role, 'platform-admin');
  });

  it('does not force Better Auth session on unauthenticated tenant-scoped requests', async () => {
    const app = buildApp(null);
    const response = await request(app, '/api/outlets');

    assert.equal(response.status, 200);
    assert.equal(response.body?.authTenantUser, null);
  });

  it('rejects production x-tenant-id fallback without a configured service token', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousServiceToken = process.env.TENANT_HEADER_SERVICE_TOKEN;
    const previousAllowTenantHeader = process.env.ALLOW_TENANT_HEADER;

    process.env.NODE_ENV = 'production';
    delete process.env.TENANT_HEADER_SERVICE_TOKEN;
    delete process.env.ALLOW_TENANT_HEADER;

    try {
      const req = {
        headers: { host: 'api.aurapos.my.id', 'x-tenant-id': 'tenant-from-header' },
        hostname: 'api.aurapos.my.id',
        query: {},
      } as unknown as Request;
      let statusCode = 0;
      let payload: any = null;
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: any) {
          payload = body;
          return this;
        },
      } as unknown as Response;
      let nextCalled = false;

      await tenantMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(statusCode, 403);
      assert.equal(payload?.code, 'TENANT_HEADER_DISABLED');
      assert.equal(nextCalled, false);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;

      if (previousServiceToken === undefined) delete process.env.TENANT_HEADER_SERVICE_TOKEN;
      else process.env.TENANT_HEADER_SERVICE_TOKEN = previousServiceToken;

      if (previousAllowTenantHeader === undefined) delete process.env.ALLOW_TENANT_HEADER;
      else process.env.ALLOW_TENANT_HEADER = previousAllowTenantHeader;
    }
  });
});
