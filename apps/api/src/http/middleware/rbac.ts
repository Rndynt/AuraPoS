/**
 * rbac.ts — Role-Based Access Control skeleton (Sprint 7)
 *
 * Defines POS roles and a `requireRole` middleware factory.
 * In production this will validate roles from the authenticated session/JWT.
 * During development, role can be overridden via `x-pos-role` header
 * (only when NODE_ENV !== "production").
 *
 * Roles:
 *  owner    — full access (billing, config, reports)
 *  manager  — refund, void, conflict resolution, reports
 *  cashier  — create order, payment, reprint, draft
 *  kitchen  — update fulfillment status only
 *  viewer   — read-only (reports, queue)
 */

import { Request, Response, NextFunction } from 'express';

// ── Role type ─────────────────────────────────────────────────────────────────

export type PosRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'viewer';

const ROLE_HIERARCHY: Record<PosRole, number> = {
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
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hasRole(userRole: PosRole, required: PosRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

function resolveRoleFromRequest(req: Request): PosRole {
  if (process.env.NODE_ENV !== 'production') {
    const devRole = req.headers['x-pos-role'] as string | undefined;
    if (devRole && devRole in ROLE_HIERARCHY) {
      return devRole as PosRole;
    }
  }
  // TODO: replace with real session/JWT extraction
  return 'cashier';
}

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Attach `req.posRole` so downstream handlers can check permissions.
 * Call this early in the pipeline (after tenantMiddleware).
 */
export function attachRole(req: Request, _res: Response, next: NextFunction): void {
  req.posRole = resolveRoleFromRequest(req);
  next();
}

/**
 * Require a minimum role. Returns 403 if the caller's role is insufficient.
 *
 * @example
 *   router.post('/refunds', requireRole('manager'), RefundController.create)
 */
export function requireRole(minimumRole: PosRole) {
  return function roleGuard(req: Request, res: Response, next: NextFunction): void {
    const role = req.posRole ?? resolveRoleFromRequest(req);
    if (!hasRole(role, minimumRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Tindakan ini membutuhkan role minimal "${minimumRole}". Role Anda: "${role}".`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }
    next();
  };
}

/**
 * Convenience guards for common permission gates.
 */
export const requireOwner   = requireRole('owner');
export const requireManager = requireRole('manager');
export const requireCashier = requireRole('cashier');
export const requireKitchen = requireRole('kitchen');
