/**
 * Employees Routes
 * Manage tenant staff: list, invite, update role, deactivate.
 *
 * Users are stored in Better Auth's "user" table with tenant_id and role fields.
 * All mutations require MANAGER role minimum; owner-only operations use requireOwner.
 */

import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull, or, not } from 'drizzle-orm';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { requireManager, requireOwner } from '../middleware/rbac';
import { authDb } from '../../lib/auth';
import { user as userTable } from '../../lib/auth-schema';
import { auth } from '../../lib/auth';

const router = Router();

const VALID_ROLES = ['owner', 'manager', 'cashier', 'kitchen', 'viewer'] as const;
type StaffRole = typeof VALID_ROLES[number];

function toSafeUser(u: typeof userTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username ?? null,
    role: u.role ?? 'viewer',
    banned: u.banned ?? false,
    banReason: u.banReason ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * GET /api/employees
 * List all active staff for the current tenant.
 * Excludes anonymous users and banned users by default.
 */
router.get('/', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const showBanned = req.query.showBanned === 'true';

  const conditions = [
    eq(userTable.tenantId, tenantId),
    or(isNull(userTable.isAnonymous), not(eq(userTable.isAnonymous as any, true))),
  ];

  if (!showBanned) {
    conditions.push(or(isNull(userTable.banned), not(eq(userTable.banned as any, true))) as any);
  }

  const users = await authDb
    .select()
    .from(userTable)
    .where(and(...conditions as any[]))
    .orderBy(userTable.createdAt);

  res.json({ success: true, data: { employees: users.map(toSafeUser) } });
}));

/**
 * POST /api/employees/invite
 * Create a new staff account with email+password.
 * Owner-only: prevents managers from creating peer-level accounts.
 */
router.post('/invite', requireOwner, asyncHandler(async (req, res) => {
  const bodySchema = z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(VALID_ROLES).default('cashier'),
    username: z.string().min(3).max(50).optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Validasi gagal',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const tenantId = req.tenantId!;
  const { name, email, password, role, username } = parsed.data;

  // Prevent downgrading owner (only platform can create owners)
  if (role === 'owner') {
    throw createError('Tidak bisa membuat akun owner. Hubungi administrator.', 403, 'FORBIDDEN_ROLE');
  }

  // Check email uniqueness
  const [existing] = await authDb
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  if (existing) {
    throw createError('Email sudah terdaftar', 409, 'EMAIL_CONFLICT');
  }

  // Use Better Auth admin API to create user (handles password hashing)
  const result = await auth.api.createUser({
    body: {
      name,
      email,
      password,
      role,
      data: {
        tenantId,
        username: username ?? undefined,
        isAnonymous: false,
      },
    },
  });

  if (!result?.user) {
    throw createError('Gagal membuat akun karyawan', 500, 'USER_CREATE_FAILED');
  }

  res.status(201).json({ success: true, data: toSafeUser(result.user as any) });
}));

/**
 * PATCH /api/employees/:id/role
 * Update a staff member's role. Manager cannot escalate to owner.
 */
router.patch('/:id/role', requireManager, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const targetId = req.params.id;

  const bodySchema = z.object({ role: z.enum(VALID_ROLES) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Role tidak valid',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { role } = parsed.data;

  // Only owners may assign manager/owner roles
  if ((role === 'owner' || role === 'manager') && req.posRole !== 'owner' && req.posRole !== 'platform-admin') {
    throw createError('Hanya owner yang bisa mengubah ke role manager atau owner', 403, 'FORBIDDEN_ROLE_ESCALATION');
  }

  // Verify target user belongs to this tenant
  const [target] = await authDb
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(and(eq(userTable.id, targetId), eq(userTable.tenantId, tenantId)))
    .limit(1);

  if (!target) {
    throw createError('Karyawan tidak ditemukan', 404, 'EMPLOYEE_NOT_FOUND');
  }

  // Prevent changing another owner's role unless you're platform-admin
  if (target.role === 'owner' && req.posRole !== 'platform-admin') {
    throw createError('Tidak bisa mengubah role owner lain', 403, 'FORBIDDEN_OWNER_CHANGE');
  }

  const [updated] = await authDb
    .update(userTable)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(userTable.id, targetId), eq(userTable.tenantId, tenantId)))
    .returning();

  res.json({ success: true, data: toSafeUser(updated) });
}));

/**
 * PATCH /api/employees/:id/ban
 * Ban (deactivate) a staff member. Owner-only.
 */
router.patch('/:id/ban', requireOwner, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const targetId = req.params.id;
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

  const [target] = await authDb
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(and(eq(userTable.id, targetId), eq(userTable.tenantId, tenantId)))
    .limit(1);

  if (!target) throw createError('Karyawan tidak ditemukan', 404, 'EMPLOYEE_NOT_FOUND');
  if (target.role === 'owner') throw createError('Tidak bisa menonaktifkan owner', 403, 'FORBIDDEN_OWNER_BAN');
  if (targetId === req.userId) throw createError('Tidak bisa menonaktifkan diri sendiri', 400, 'SELF_BAN_FORBIDDEN');

  const [updated] = await authDb
    .update(userTable)
    .set({ banned: true, banReason: reason ?? 'Dinonaktifkan oleh owner', updatedAt: new Date() })
    .where(and(eq(userTable.id, targetId), eq(userTable.tenantId, tenantId)))
    .returning();

  res.json({ success: true, data: toSafeUser(updated) });
}));

/**
 * PATCH /api/employees/:id/unban
 * Restore a banned staff member. Owner-only.
 */
router.patch('/:id/unban', requireOwner, asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const targetId = req.params.id;

  const [updated] = await authDb
    .update(userTable)
    .set({ banned: false, banReason: null, updatedAt: new Date() })
    .where(and(eq(userTable.id, targetId), eq(userTable.tenantId, tenantId)))
    .returning();

  if (!updated) throw createError('Karyawan tidak ditemukan', 404, 'EMPLOYEE_NOT_FOUND');

  res.json({ success: true, data: toSafeUser(updated) });
}));

export default router;
