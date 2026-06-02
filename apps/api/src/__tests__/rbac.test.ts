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

async function request(app: express.Express, path: string, headers: Record<string, string> = {}, method = 'GET') {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === 'object');

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { headers, method });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('rbac role guards', async () => {
  const { createRequireRole } = await import('../http/middleware/rbac');

  function buildApp(user: GuardUser | null) {
    const app = express();
    const requireRole = createRequireRole({
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

    app.post('/api/orders', requireRole('cashier'), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    app.patch('/api/sync/conflicts/:id/resolve', requireRole('manager'), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    app.put('/api/inventory/products/:id/adjust', requireRole('manager'), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    return app;
  }

  it('rejects protected route access when no authenticated session exists', async () => {
    const app = buildApp(null);
    const response = await request(app, '/api/orders', {}, 'POST');

    assert.equal(response.status, 401);
    assert.equal(response.body?.code, 'UNAUTHENTICATED');
  });

  it('does not default an authenticated user with no valid role to cashier', async () => {
    const app = buildApp({ id: 'user-1', tenantId: 'tenant-from-request', role: null });
    const response = await request(app, '/api/orders', { Authorization: 'Bearer user-1' }, 'POST');

    assert.equal(response.status, 403);
    assert.equal(response.body?.code, 'INSUFFICIENT_ROLE');
  });

  it('rejects insufficient role access with INSUFFICIENT_ROLE', async () => {
    const app = buildApp({ id: 'user-1', tenantId: 'tenant-from-request', role: 'cashier' });
    const response = await request(app, '/api/sync/conflicts/conflict-1/resolve', { Authorization: 'Bearer user-1' }, 'PATCH');

    assert.equal(response.status, 403);
    assert.equal(response.body?.code, 'INSUFFICIENT_ROLE');
  });

  it('rejects authenticated role use when the user tenant does not match request tenant', async () => {
    const app = buildApp({ id: 'user-1', tenantId: 'different-tenant', role: 'owner' });
    const response = await request(app, '/api/inventory/products/product-1/adjust', { Authorization: 'Bearer user-1' }, 'PUT');

    assert.equal(response.status, 403);
    assert.equal(response.body?.code, 'TENANT_MISMATCH');
  });

  it('allows a sufficient role when the authenticated user tenant matches request tenant', async () => {
    const app = buildApp({ id: 'user-1', tenantId: 'tenant-from-request', role: 'manager' });
    const response = await request(app, '/api/sync/conflicts/conflict-1/resolve', { Authorization: 'Bearer user-1' }, 'PATCH');

    assert.equal(response.status, 200);
    assert.equal(response.body?.ok, true);
  });
});
