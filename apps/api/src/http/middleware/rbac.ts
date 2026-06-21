/**
 * rbac.ts — Role-Based Access Control middleware (Sprint 7)
 *
 * Defines POS roles and a `requireRole` middleware factory.
 * Protected routes must resolve roles from an authenticated Better Auth session;
 * missing sessions are rejected with 401 instead of silently defaulting to a role.
 * During development, role can be overridden via `x-pos-role` header
 * (only when NODE_ENV !== "production") after the session and tenant match are
 * verified.
 *
 * Roles:
 *  owner    — full access (billing, config, reports)
 *  manager  — refund, void, conflict resolution, reports
 *  cashier  — create order, payment, reprint, draft
 *  kitchen  — update fulfillment status only
 *  viewer   — read-only (reports, queue)
 */

import { Request, Response, NextFunction } from 'express';
import { auth, authDb } from '../../lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { sql } from 'drizzle-orm';
import { attachOrderActionPermissionContext } from '../auth/orderActionPermissionContext';

// ── Role type ─────────────────────────────────────────────────────────────────

export type PosRole = 'platform-admin' | 'owner' | 'manager' | 'cashier' | 'kitchen' | 'viewer';

const ROLE_HIERARCHY: Record<PosRole, number> = {
  'platform-admin': 60,
  owner:   50,
  manager: 40,
  cashier: 30,
  kitchen: 20,
  viewer:  10,
};

// ── Extend Express Request ────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      posRole?: PosRole;
      userId?: string;
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hasRole(userRole: PosRole, required: PosRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

const VALID_ROLES = new Set(Object.keys(ROLE_HIERARCHY));

type AuthSessionLike = {
  user?: {
    id?: string;
  } | null;
};

type RbacUser = {
  id: string;
  tenantId: string | null;
  role: string | null;
};

type RoleResolverDeps = {
  getSession?: (req: Request) => Promise<AuthSessionLike | null>;
  getUserById?: (userId: string) => Promise<RbacUser | null>;
};

class RbacHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly error = status === 401 ? 'Unauthenticated' : 'Forbidden',
  ) {
    super(message);
  }
}

async function defaultGetSession(req: Request): Promise<AuthSessionLike | null> {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  }) as Promise<AuthSessionLike | null>;
}

async function defaultGetUserById(userId: string): Promise<RbacUser | null> {
  const rows = await authDb.execute(
    sql`SELECT id, tenant_id, role FROM "user" WHERE id = ${userId} LIMIT 1`
  );
  const row = (rows as any[])[0];
  if (!row) return null;

  return {
    id: String(row.id),
    tenantId: row.tenant_id ?? null,
    role: row.role ?? null,
  };
}

function getDevOverrideRole(req: Request): PosRole | null {
  if (process.env.NODE_ENV === 'production') return null;

  const devRole = req.headers['x-pos-role'] as string | undefined;
  if (devRole && devRole in ROLE_HIERARCHY) {
    return devRole as PosRole;
  }

  return null;
}

function sendRbacError(res: Response, err: RbacHttpError): void {
  res.status(err.status).json({
    error: err.error,
    message: err.message,
    code: err.code,
  });
}

/**
 * Resolve role from authenticated session.
 * Queries the user table for the tenant and role fields set during
 * registration/linking, and verifies the authenticated user's tenant matches
 * req.tenantId before returning a role.
 */
export function createRoleResolver(deps: RoleResolverDeps = {}) {
  const getSession = deps.getSession ?? defaultGetSession;
  const getUserById = deps.getUserById ?? defaultGetUserById;

  return async function resolveRoleFromRequest(req: Request): Promise<PosRole> {
    const session = await getSession(req);
    const sessionUserId = session?.user?.id;

    if (!sessionUserId) {
      throw new RbacHttpError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required for this action.',
      );
    }

    req.userId = sessionUserId;

    const user = await getUserById(sessionUserId);
    if (!user) {
      throw new RbacHttpError(
        401,
        'UNAUTHENTICATED',
        'Authenticated session user was not found.',
      );
    }

    const requestTenantId = req.tenantId;
    if (!requestTenantId) {
      throw new RbacHttpError(
        403,
        'TENANT_REQUIRED',
        'Tenant context is required for this action.',
      );
    }

    if (!user.tenantId) {
      throw new RbacHttpError(
        403,
        'AUTH_USER_TENANT_MISSING',
        'Authenticated user is not linked to a tenant.',
      );
    }

    if (user.tenantId !== requestTenantId) {
      throw new RbacHttpError(
        403,
        'TENANT_MISMATCH',
        'Authenticated user cannot access a different tenant.',
      );
    }

    const devOverrideRole = getDevOverrideRole(req);
    if (devOverrideRole) {
      return devOverrideRole;
    }

    const dbRole = user.role;
    if (dbRole && VALID_ROLES.has(dbRole)) {
      return dbRole as PosRole;
    }

    throw new RbacHttpError(
      403,
      'INSUFFICIENT_ROLE',
      'Authenticated user does not have a valid POS role.',
    );
  };
}

export const resolveRoleFromRequest = createRoleResolver();

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Attach `req.posRole` so downstream handlers can check permissions.
 * Call this early in the pipeline (after tenantMiddleware).
 */
export async function attachRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    req.posRole = await resolveRoleFromRequest(req);
    attachOrderActionPermissionContext(req, res, next);
  } catch (err) {
    if (err instanceof RbacHttpError) {
      sendRbacError(res, err);
      return;
    }
    next(err);
  }
}

/**
 * Require a minimum role. Returns 401 for missing/invalid authentication and
 * 403 if the caller's role is insufficient.
 *
 * @example
 *   router.post('/refunds', requireRole('manager'), RefundController.create)
 */
export function createRequireRole(deps: RoleResolverDeps = {}) {
  const resolveRole = createRoleResolver(deps);

  return function requireRoleWithDeps(minimumRole: PosRole) {
    return async function roleGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        // Always resolve through the authenticated session and user record so
        // req.userId and req.tenantId are verified against the user's tenant for
        // every protected route. This intentionally avoids trusting a pre-seeded
        // req.posRole alone.
        const role = await resolveRole(req);

        if (!hasRole(role, minimumRole)) {
          res.status(403).json({
            error: 'Forbidden',
            message: `Tindakan ini membutuhkan role minimal "${minimumRole}". Role Anda: "${role}".`,
            code: 'INSUFFICIENT_ROLE',
          });
          return;
        }

        req.posRole = role;
        attachOrderActionPermissionContext(req, res, next);
      } catch (err) {
        if (err instanceof RbacHttpError) {
          sendRbacError(res, err);
          return;
        }
        next(err);
      }
    };
  };
}

export const requireRole = createRequireRole();

/**
 * Convenience guards for common permission gates.
 */
export const requireOwner   = requireRole('owner');
export const requireManager = requireRole('manager');
export const requireCashier = requireRole('cashier');
export const requireKitchen = requireRole('kitchen');
