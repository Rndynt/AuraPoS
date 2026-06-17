import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { CheckProductAvailability } = await import('@pos/application/catalog/CheckProductAvailability');

const TENANT_ID = 'tenant-1';
const OUTLET_A = 'outlet-A';
const OUTLET_B = 'outlet-B';
const PRODUCT_ID = 'product-1';

function trackedProduct(overrides: Partial<{ stock_tracking_enabled: boolean; is_active: boolean }> = {}) {
  return {
    id: PRODUCT_ID,
    tenant_id: TENANT_ID,
    name: 'Kopi Susu',
    base_price: 25000,
    category: 'Beverage',
    has_variants: false,
    is_active: true,
    stock_tracking_enabled: true,
    ...overrides,
  };
}

function makeProductRepo(product: any) {
  return {
    async findById(id: string, tenantId: string) {
      if (id !== product.id || tenantId !== product.tenant_id) return null;
      return product;
    },
  };
}

function makeBalanceRepo(balances: Record<string, { quantity: number; reservedQuantity?: number; lowStockThreshold?: number | null }>) {
  return {
    async getBalance(_tenantId: string, outletId: string, productId: string) {
      const key = `${outletId}:${productId}`;
      const row = balances[key];
      if (!row) return null;
      return {
        id: `${key}-id`,
        tenantId: _tenantId,
        outletId,
        productId,
        quantity: row.quantity,
        reservedQuantity: row.reservedQuantity ?? 0,
        lowStockThreshold: row.lowStockThreshold ?? null,
        lastMovementId: null,
        lastCountedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    async listBalances() { return []; },
    async applyDelta() { throw new Error('not used'); },
    async setQuantity() { throw new Error('not used'); },
    async setThreshold() { throw new Error('not used'); },
    async listLowStock() { return []; },
  } as any;
}

describe('CheckProductAvailability outlet-aware', () => {
  it('reads from inventory_balances for active outlet, not product.stock_qty', async () => {
    const product = { ...trackedProduct(), stock_qty: 999 };
    const useCase = new CheckProductAvailability(
      makeProductRepo(product),
      makeBalanceRepo({ [`${OUTLET_A}:${PRODUCT_ID}`]: { quantity: 5 } }),
    );

    const result = await useCase.execute({
      productId: PRODUCT_ID,
      tenantId: TENANT_ID,
      outletId: OUTLET_A,
      requestedQuantity: 3,
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.availableQuantity, 5);
  });

  it('reports out of stock when balance is zero at active outlet', async () => {
    const useCase = new CheckProductAvailability(
      makeProductRepo(trackedProduct()),
      makeBalanceRepo({ [`${OUTLET_A}:${PRODUCT_ID}`]: { quantity: 0 } }),
    );

    const result = await useCase.execute({
      productId: PRODUCT_ID,
      tenantId: TENANT_ID,
      outletId: OUTLET_A,
      requestedQuantity: 1,
    });

    assert.equal(result.isAvailable, false);
    assert.equal(result.availableQuantity, 0);
    assert.equal(result.reason, 'Stok habis di outlet ini');
  });

  it('reports insufficient when requested exceeds outlet quantity', async () => {
    const useCase = new CheckProductAvailability(
      makeProductRepo(trackedProduct()),
      makeBalanceRepo({ [`${OUTLET_A}:${PRODUCT_ID}`]: { quantity: 2 } }),
    );

    const result = await useCase.execute({
      productId: PRODUCT_ID,
      tenantId: TENANT_ID,
      outletId: OUTLET_A,
      requestedQuantity: 5,
    });

    assert.equal(result.isAvailable, false);
    assert.equal(result.availableQuantity, 2);
    assert.match(result.reason ?? '', /Stok tidak cukup di outlet ini/);
  });

  it('treats balances at different outlets as independent', async () => {
    const useCase = new CheckProductAvailability(
      makeProductRepo(trackedProduct()),
      makeBalanceRepo({
        [`${OUTLET_A}:${PRODUCT_ID}`]: { quantity: 10 },
        [`${OUTLET_B}:${PRODUCT_ID}`]: { quantity: 0 },
      }),
    );

    const a = await useCase.execute({
      productId: PRODUCT_ID, tenantId: TENANT_ID, outletId: OUTLET_A, requestedQuantity: 1,
    });
    const b = await useCase.execute({
      productId: PRODUCT_ID, tenantId: TENANT_ID, outletId: OUTLET_B, requestedQuantity: 1,
    });

    assert.equal(a.isAvailable, true);
    assert.equal(b.isAvailable, false);
    assert.equal(b.availableQuantity, 0);
  });

  it('refuses without outlet context when tracking is on (no product.stock_qty fallback)', async () => {
    const product = { ...trackedProduct(), stock_qty: 9999 };
    const useCase = new CheckProductAvailability(
      makeProductRepo(product),
      makeBalanceRepo({}),
    );

    const result = await useCase.execute({
      productId: PRODUCT_ID,
      tenantId: TENANT_ID,
      outletId: null,
      requestedQuantity: 1,
    });

    assert.equal(result.isAvailable, false);
    assert.equal(result.availableQuantity, 0);
    assert.match(result.reason ?? '', /Outlet aktif/);
  });

  it('passes through when product stock tracking is disabled', async () => {
    const useCase = new CheckProductAvailability(
      makeProductRepo(trackedProduct({ stock_tracking_enabled: false })),
      makeBalanceRepo({}),
    );

    const result = await useCase.execute({
      productId: PRODUCT_ID,
      tenantId: TENANT_ID,
      outletId: OUTLET_A,
      requestedQuantity: 50,
    });

    assert.equal(result.isAvailable, true);
  });
});
