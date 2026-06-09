import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { hasAdvancedInventoryEntitlement, hasBasicStockEntitlement } = await import('../http/helpers/inventoryEntitlement');

describe('inventory entitlement helpers', () => {
  it('allows Basic Starter inventory products when Stok Dasar is active', () => {
    assert.equal(hasBasicStockEntitlement({ enableInventory: true, enableInventoryAdvanced: false }), true);
  });

  it('keeps /api/inventory/products gated for tenants without Stok Dasar', () => {
    assert.equal(hasBasicStockEntitlement({ enableInventory: false, enableInventoryAdvanced: false }), false);
  });

  it('does not treat Basic Stock as Advanced Inventory', () => {
    assert.equal(hasAdvancedInventoryEntitlement({ enableInventory: true, enableInventoryAdvanced: false }), false);
  });
});
