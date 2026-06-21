import type { NextFunction, Request, Response } from 'express';
import {
  resolveOrderActionPermissionsFromRequestContext,
  resolveOrderActionPermissionsFromRole,
  type OrderActionPermission,
} from '@pos/application/business-flows';

export type OrderActionPermissionContextSource = 'role-derived' | 'explicit-claims' | 'role-explicit-intersection';

export type TrustedOrderActionPermissionContext = {
  role: string | null;
  roleDerivedPermissions: OrderActionPermission[];
  explicitPermissions: OrderActionPermission[];
  effectivePermissions: OrderActionPermission[];
  source: OrderActionPermissionContextSource;
};

export type OrderActionPermissionRequestContextInput = {
  posRole?: string | null;
  authTenantUser?: { role?: string | null; permissions?: readonly string[] | null } | null;
  permissions?: readonly string[] | null;
};

declare global {
  namespace Express {
    interface Request {
      orderActionPermissionContext?: TrustedOrderActionPermissionContext;
    }
  }
}

function uniquePermissionClaims(values: readonly string[]): OrderActionPermission[] {
  if (values.length === 0) return [];

  const resolved = resolveOrderActionPermissionsFromRequestContext({
    posRole: 'platform-admin',
    permissions: values,
  });
  return [...new Set(resolved)];
}

export function resolveTrustedOrderActionPermissionContext(
  input: OrderActionPermissionRequestContextInput,
): TrustedOrderActionPermissionContext {
  const role = input.posRole ?? input.authTenantUser?.role ?? null;
  const roleDerivedPermissions = resolveOrderActionPermissionsFromRole(role);
  const explicitPermissions = uniquePermissionClaims([
    ...(input.permissions ?? []),
    ...(input.authTenantUser?.permissions ?? []),
  ]);
  const effectivePermissions = resolveOrderActionPermissionsFromRequestContext(input);

  return {
    role,
    roleDerivedPermissions,
    explicitPermissions,
    effectivePermissions,
    source: explicitPermissions.length === 0 ? 'role-derived' : 'role-explicit-intersection',
  };
}

export function attachOrderActionPermissionContext(req: Request, _res: Response, next: NextFunction): void {
  req.orderActionPermissionContext = resolveTrustedOrderActionPermissionContext({
    posRole: req.posRole,
    authTenantUser: req.authTenantUser,
  });
  next();
}

export function getOrderActionPermissionContext(req: Request): TrustedOrderActionPermissionContext {
  if (!req.orderActionPermissionContext) {
    req.orderActionPermissionContext = resolveTrustedOrderActionPermissionContext({
      posRole: req.posRole,
      authTenantUser: req.authTenantUser,
    });
  }

  return req.orderActionPermissionContext;
}
