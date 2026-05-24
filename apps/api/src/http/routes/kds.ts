/**
 * KDS Device Management Routes
 * Handles KDS device pairing (4-digit activation code) and API key auth.
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { auth, authDb } from '../../lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { nanoid } from 'nanoid';
import * as OrdersController from '../controllers/OrdersController';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireSession(
  req: Request,
  res: Response,
): Promise<{ userId: string; tenantId: string } | null> {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated' });
      return null;
    }
    const rows = await authDb.execute(
      sql`SELECT tenant_id FROM "user" WHERE id = ${session.user.id} LIMIT 1`,
    );
    const tenantId = (rows as any[])[0]?.tenant_id ?? null;
    if (!tenantId) {
      res.status(403).json({ success: false, error: 'Akun tidak terkait dengan tenant manapun' });
      return null;
    }
    return { userId: session.user.id, tenantId };
  } catch (err) {
    console.error('[kds requireSession]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
    return null;
  }
}

async function requireKdsKey(
  req: Request,
  res: Response,
): Promise<{ deviceId: string; tenantId: string; deviceName: string } | null> {
  const apiKey = req.headers['x-kds-key'] as string | undefined;
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'Missing X-KDS-Key header' });
    return null;
  }
  try {
    const rows = await authDb.execute(
      sql`SELECT id, tenant_id, device_name
          FROM kds_devices
          WHERE api_key = ${apiKey} AND status = 'active'
          LIMIT 1`,
    );
    const device = (rows as any[])[0];
    if (!device) {
      res.status(401).json({ success: false, error: 'Perangkat KDS tidak valid atau tidak aktif' });
      return null;
    }
    // Update last_seen_at in background — don't await
    authDb
      .execute(sql`UPDATE kds_devices SET last_seen_at = now() WHERE id = ${device.id}`)
      .catch(() => {});
    return {
      deviceId: device.id,
      tenantId: device.tenant_id,
      deviceName: device.device_name ?? 'KDS',
    };
  } catch (err) {
    console.error('[kds requireKdsKey]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
    return null;
  }
}

// ─── Admin endpoints (require Better Auth session) ────────────────────────────

/** POST /api/kds/generate-code — generate 4-digit activation code */
router.post('/generate-code', async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const deviceId = nanoid();

    await authDb.execute(sql`
      INSERT INTO kds_devices (id, tenant_id, activation_code, activation_expires_at, status, created_at)
      VALUES (${deviceId}, ${session.tenantId}, ${code}, ${expiresAt}, 'pending', now())
    `);

    res.json({ success: true, data: { code, expiresAt, deviceId } });
  } catch (err) {
    console.error('[kds/generate-code]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/** GET /api/kds/devices — list active/pending devices for tenant */
router.get('/devices', async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const rows = await authDb.execute(sql`
      SELECT id, device_name, status, created_at, activated_at, last_seen_at,
             activation_code, activation_expires_at
      FROM kds_devices
      WHERE tenant_id = ${session.tenantId} AND status != 'revoked'
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: { devices: rows } });
  } catch (err) {
    console.error('[kds/devices GET]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/** DELETE /api/kds/devices/:id — revoke a device */
router.delete('/devices/:id', async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    await authDb.execute(sql`
      UPDATE kds_devices
      SET status = 'revoked', api_key = null
      WHERE id = ${req.params.id} AND tenant_id = ${session.tenantId}
    `);

    res.json({ success: true });
  } catch (err) {
    console.error('[kds/devices DELETE]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Public endpoints (no session required) ───────────────────────────────────

/** POST /api/kds/check-code — validate that a code exists and is not expired */
router.post('/check-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !/^\d{4}$/.test(String(code))) {
      return res.status(400).json({ success: false, error: 'Kode harus 4 digit angka' });
    }

    const rows = await authDb.execute(sql`
      SELECT id FROM kds_devices
      WHERE activation_code = ${String(code)}
        AND status = 'pending'
        AND activation_expires_at > now()
      LIMIT 1
    `);

    if (!(rows as any[]).length) {
      return res
        .status(404)
        .json({ success: false, error: 'Kode tidak valid atau sudah kadaluarsa' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[kds/check-code]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/** POST /api/kds/verify-code — activate device, returns API key */
router.post('/verify-code', async (req, res) => {
  try {
    const { code, deviceName } = req.body;
    if (!code || !/^\d{4}$/.test(String(code))) {
      return res.status(400).json({ success: false, error: 'Kode harus 4 digit angka' });
    }
    if (!deviceName || typeof deviceName !== 'string' || !deviceName.trim()) {
      return res.status(400).json({ success: false, error: 'Nama stasiun diperlukan' });
    }

    const rows = await authDb.execute(sql`
      SELECT id, tenant_id FROM kds_devices
      WHERE activation_code = ${String(code)}
        AND status = 'pending'
        AND activation_expires_at > now()
      LIMIT 1
    `);

    const device = (rows as any[])[0];
    if (!device) {
      return res
        .status(404)
        .json({ success: false, error: 'Kode tidak valid atau sudah kadaluarsa' });
    }

    const apiKey = nanoid(32);
    const name = deviceName.trim();

    await authDb.execute(sql`
      UPDATE kds_devices
      SET api_key              = ${apiKey},
          device_name          = ${name},
          status               = 'active',
          activated_at         = now(),
          activation_code      = null,
          activation_expires_at = null
      WHERE id = ${device.id}
    `);

    res.json({
      success: true,
      data: {
        apiKey,
        deviceId: device.id,
        deviceName: name,
        tenantId: device.tenant_id,
      },
    });
  } catch (err) {
    console.error('[kds/verify-code]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── KDS device endpoints (require X-KDS-Key) ────────────────────────────────

/** GET /api/kds/orders — list active orders for the KDS device's tenant */
router.get('/orders', async (req: Request, res: Response) => {
  const device = await requireKdsKey(req, res);
  if (!device) return;

  (req as any).tenantId = device.tenantId;
  try {
    await (OrdersController.listOrders as any)(
      req,
      res,
      (err?: unknown) => {
        if (err) {
          console.error('[kds/orders delegate error]', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal server error' });
          }
        }
      },
    );
  } catch (err) {
    console.error('[kds/orders]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

/** PATCH /api/kds/orders/:id/status — update order status from KDS */
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const device = await requireKdsKey(req, res);
  if (!device) return;

  (req as any).tenantId = device.tenantId;
  try {
    await (OrdersController.updateOrderStatus as any)(
      req,
      res,
      (err?: unknown) => {
        if (err) {
          console.error('[kds/orders status delegate error]', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal server error' });
          }
        }
      },
    );
  } catch (err) {
    console.error('[kds/orders/:id/status]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

export default router;
