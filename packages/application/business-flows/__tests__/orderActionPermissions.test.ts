import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ORDER_ACTION_PERMISSIONS,
  RESERVED_FUTURE_ORDER_ACTION_PERMISSIONS,
  resolveOrderActionPermissionsFromRequestContext,
  resolveOrderActionPermissionsFromRole,
} from "../permissions/orderActionPermissions";

const has = (role: string | null | undefined, permission: string) => resolveOrderActionPermissionsFromRole(role).includes(permission as any);

describe("order action permission registry", () => {
  it("maps owner, manager, and platform-admin to active cancellation", () => {
    assert.equal(has("owner", ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE), true);
    assert.equal(has("manager", ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE), true);
    assert.equal(has("platform-admin", ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE), true);
  });

  it("does not map cashier, kitchen, viewer, unknown, or missing roles to active cancellation", () => {
    for (const role of ["cashier", "kitchen", "viewer", "waiter", undefined, null]) {
      assert.equal(has(role as any, ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE), false, `${role} must not cancel active orders`);
    }
  });

  it("keeps viewer and missing roles mutation-free", () => {
    assert.deepEqual(resolveOrderActionPermissionsFromRole("viewer"), []);
    assert.deepEqual(resolveOrderActionPermissionsFromRole(undefined), []);
  });

  it("does not grant reserved refund/void/delete permissions to any current role", () => {
    for (const role of ["platform-admin", "owner", "manager", "cashier", "kitchen", "viewer"] as const) {
      const permissions = resolveOrderActionPermissionsFromRole(role);
      for (const reserved of RESERVED_FUTURE_ORDER_ACTION_PERMISSIONS) {
        assert.equal(permissions.includes(reserved), false, `${role} must not receive reserved permission ${reserved}`);
      }
    }
  });

  it("intersects explicit claims with role-derived permissions to avoid escalation", () => {
    assert.deepEqual(resolveOrderActionPermissionsFromRequestContext({ posRole: "cashier", permissions: [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE] }), []);
    assert.deepEqual(resolveOrderActionPermissionsFromRequestContext({ posRole: "manager", permissions: [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE] }), [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE]);
  });
});
