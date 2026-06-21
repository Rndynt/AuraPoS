import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ORDER_ACTION_PERMISSIONS, RESERVED_FUTURE_ORDER_ACTION_PERMISSIONS } from '@pos/application/business-flows';
import { resolveTrustedOrderActionPermissionContext } from '../http/auth/orderActionPermissionContext';

const hasCancelActive = (role?: string | null) =>
  resolveTrustedOrderActionPermissionContext({ posRole: role }).effectivePermissions.includes(ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE);

describe('trusted order action permission context adapter', () => {
  it('allows active cancellation for owner, manager, and platform-admin through role-derived registry permissions', () => {
    for (const role of ['owner', 'manager', 'platform-admin'] as const) {
      const context = resolveTrustedOrderActionPermissionContext({ posRole: role });
      assert.equal(context.role, role);
      assert.equal(context.source, 'role-derived');
      assert.equal(context.roleDerivedPermissions.includes(ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE), true);
      assert.equal(context.effectivePermissions.includes(ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE), true);
    }
  });

  it('excludes active cancellation for cashier, kitchen, viewer, and missing roles', () => {
    for (const role of ['cashier', 'kitchen', 'viewer', undefined, null] as const) {
      assert.equal(hasCancelActive(role), false, `${role} must not receive active cancellation`);
    }
  });

  it('does not grant reserved refund, void, or delete permissions by default', () => {
    for (const role of ['owner', 'manager', 'platform-admin', 'cashier', 'kitchen', 'viewer'] as const) {
      const context = resolveTrustedOrderActionPermissionContext({ posRole: role });
      for (const reserved of RESERVED_FUTURE_ORDER_ACTION_PERMISSIONS) {
        assert.equal(context.effectivePermissions.includes(reserved), false, `${role} must not receive ${reserved}`);
      }
    }
  });

  it('intersects explicit claims with role-derived baseline until persisted claims are trusted', () => {
    const cashierContext = resolveTrustedOrderActionPermissionContext({
      posRole: 'cashier',
      permissions: [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE, ORDER_ACTION_PERMISSIONS.PAY_ACTIVE],
    });
    assert.equal(cashierContext.source, 'role-explicit-intersection');
    assert.deepEqual(cashierContext.explicitPermissions, [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE, ORDER_ACTION_PERMISSIONS.PAY_ACTIVE]);
    assert.deepEqual(cashierContext.effectivePermissions, [ORDER_ACTION_PERMISSIONS.PAY_ACTIVE]);

    const managerContext = resolveTrustedOrderActionPermissionContext({
      authTenantUser: { role: 'manager', permissions: [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE] },
    });
    assert.deepEqual(managerContext.effectivePermissions, [ORDER_ACTION_PERMISSIONS.CANCEL_ACTIVE]);
  });
});
