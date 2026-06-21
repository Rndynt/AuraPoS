/**
 * Central order-action permission registry.
 *
 * AuraPoS does not yet persist first-class permission claims on tenant users or
 * auth sessions. Until that exists, these helpers derive the conservative
 * order-action permission set from the authenticated POS/tenant role. When a
 * caller supplies explicit permission claims, the registry intersects those
 * claims with role-derived permissions to avoid escalating a coarse role beyond
 * its current safe baseline.
 */

export const ORDER_ACTION_PERMISSIONS = {
  CANCEL_DRAFT: "orders:cancel_draft",
  CANCEL_ACTIVE: "orders:cancel_active",
  VOID: "orders:void",
  VOID_ITEM: "orders:void_item",
  REFUND: "orders:refund",
  DELETE_DRAFT: "orders:delete_draft",
  DELETE_ACTIVE: "orders:delete_active",
  UPDATE_DRAFT: "orders:update_draft",
  PAY_ACTIVE: "orders:pay_active",
  PARTIAL_PAYMENT: "orders:partial_payment",
  SPLIT_BILL: "orders:split_bill",
  SEND_TO_KITCHEN: "orders:send_to_kitchen",
} as const;

export type OrderActionPermission = (typeof ORDER_ACTION_PERMISSIONS)[keyof typeof ORDER_ACTION_PERMISSIONS];

export type OrderActionRole = "platform-admin" | "owner" | "manager" | "cashier" | "kitchen" | "viewer";

export type OrderActionPermissionContext = {
  posRole?: string | null;
  authTenantUser?: { role?: string | null; permissions?: readonly string[] | null } | null;
  permissions?: readonly string[] | null;
};

const currentOwnerManagerPermissions = [
  ORDER_ACTION_PERMISSIONS.CANCEL_DRAFT,
  ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE,
  ORDER_ACTION_PERMISSIONS.UPDATE_DRAFT,
  ORDER_ACTION_PERMISSIONS.PAY_ACTIVE,
  ORDER_ACTION_PERMISSIONS.PARTIAL_PAYMENT,
  ORDER_ACTION_PERMISSIONS.SPLIT_BILL,
  ORDER_ACTION_PERMISSIONS.SEND_TO_KITCHEN,
] as const;

const currentCashierPermissions = [
  ORDER_ACTION_PERMISSIONS.CANCEL_DRAFT,
  ORDER_ACTION_PERMISSIONS.UPDATE_DRAFT,
  ORDER_ACTION_PERMISSIONS.PAY_ACTIVE,
  ORDER_ACTION_PERMISSIONS.PARTIAL_PAYMENT,
  ORDER_ACTION_PERMISSIONS.SPLIT_BILL,
  ORDER_ACTION_PERMISSIONS.SEND_TO_KITCHEN,
] as const;

const currentKitchenPermissions = [ORDER_ACTION_PERMISSIONS.SEND_TO_KITCHEN] as const;

export const RESERVED_FUTURE_ORDER_ACTION_PERMISSIONS = [
  ORDER_ACTION_PERMISSIONS.VOID,
  ORDER_ACTION_PERMISSIONS.VOID_ITEM,
  ORDER_ACTION_PERMISSIONS.REFUND,
  ORDER_ACTION_PERMISSIONS.DELETE_DRAFT,
  ORDER_ACTION_PERMISSIONS.DELETE_ACTIVE,
] as const;

export const ROLE_ORDER_ACTION_PERMISSION_REGISTRY: Readonly<Record<OrderActionRole, readonly OrderActionPermission[]>> = {
  "platform-admin": currentOwnerManagerPermissions,
  owner: currentOwnerManagerPermissions,
  manager: currentOwnerManagerPermissions,
  cashier: currentCashierPermissions,
  kitchen: currentKitchenPermissions,
  viewer: [],
} as const;

function normalizeRole(role?: string | null): OrderActionRole | null {
  if (!role) return null;
  return Object.prototype.hasOwnProperty.call(ROLE_ORDER_ACTION_PERMISSION_REGISTRY, role) ? (role as OrderActionRole) : null;
}

function uniquePermissions(values: readonly string[]): OrderActionPermission[] {
  const allowed = new Set(Object.values(ORDER_ACTION_PERMISSIONS));
  return [...new Set(values)].filter((value): value is OrderActionPermission => allowed.has(value as OrderActionPermission));
}

export function resolveOrderActionPermissionsFromRole(role?: string | null): OrderActionPermission[] {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return [];
  return [...ROLE_ORDER_ACTION_PERMISSION_REGISTRY[normalizedRole]];
}

export function resolveOrderActionPermissionsFromRequestContext(context: OrderActionPermissionContext): OrderActionPermission[] {
  const role = context.posRole ?? context.authTenantUser?.role ?? null;
  const rolePermissions = resolveOrderActionPermissionsFromRole(role);
  const explicitClaims = uniquePermissions([...(context.permissions ?? []), ...(context.authTenantUser?.permissions ?? [])]);

  if (explicitClaims.length === 0) return rolePermissions;

  const rolePermissionSet = new Set(rolePermissions);
  return explicitClaims.filter((permission) => rolePermissionSet.has(permission));
}
