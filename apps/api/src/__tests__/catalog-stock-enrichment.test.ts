import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { enrichCatalogProductsWithStock } = await import('../http/helpers/catalogStockEnrichment');

type CatalogProduct = {
  id: string;
  name: string;
  stock_tracking_enabled: boolean;
};

const product = (overrides: Partial<CatalogProduct> & { id: string }): CatalogProduct => ({
  name: `Product ${overrides.id}`,
  stock_tracking_enabled: true,
  ...overrides,
});

describe('enrichCatalogProductsWithStock', () => {
  it('uses inventory_balances quantity for tracked products at the active outlet', () => {
    const result = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1' })],
      balances: [
        { productId: 'p1', quantity: 12, reservedQuantity: 2, lowStockThreshold: null },
      ],
      outletId: 'outlet-A',
    });

    assert.equal(result[0].id, 'p1');
    assert.equal(result[0].stock_qty, 12);
    assert.equal(result[0].stockQty, 12);
    assert.equal(result[0].stockQuantity, 12);
    assert.equal(result[0].availableQuantity, 10);
    assert.equal(result[0].isOutOfStock, false);
    assert.equal(result[0].outletId, 'outlet-A');
  });

  it('marks tracked products without a balance row as out of stock', () => {
    const result = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1' })],
      balances: [],
      outletId: 'outlet-A',
    });

    assert.equal(result[0].stock_qty, 0);
    assert.equal(result[0].availableQuantity, 0);
    assert.equal(result[0].isOutOfStock, true);
    assert.equal(result[0].isLowStock, false);
  });

  it('flags low stock using per-balance threshold when present', () => {
    const result = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1' })],
      balances: [
        { productId: 'p1', quantity: 3, lowStockThreshold: 5 },
      ],
      outletId: 'outlet-A',
    });

    assert.equal(result[0].isOutOfStock, false);
    assert.equal(result[0].isLowStock, true);
    assert.equal(result[0].lowStockThreshold, 5);
  });

  it('falls back to default low-stock threshold when balance has none', () => {
    const result = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1' })],
      balances: [
        { productId: 'p1', quantity: 4, lowStockThreshold: null },
      ],
      outletId: 'outlet-A',
      defaultLowStockThreshold: 6,
    });

    assert.equal(result[0].isLowStock, true);
    assert.equal(result[0].lowStockThreshold, 6);
  });

  it('does not constrain non-tracked products', () => {
    const result = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1', stock_tracking_enabled: false })],
      balances: [],
      outletId: 'outlet-A',
    });

    assert.equal(result[0].isOutOfStock, false);
    assert.equal(result[0].isLowStock, false);
    assert.equal(result[0].availableQuantity, Number.POSITIVE_INFINITY);
  });

  it('returns disjoint stock for two outlets', () => {
    const outletAResult = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1' })],
      balances: [{ productId: 'p1', quantity: 10, lowStockThreshold: null }],
      outletId: 'outlet-A',
    });

    const outletBResult = enrichCatalogProductsWithStock({
      products: [product({ id: 'p1' })],
      balances: [{ productId: 'p1', quantity: 0, lowStockThreshold: null }],
      outletId: 'outlet-B',
    });

    assert.equal(outletAResult[0].availableQuantity, 10);
    assert.equal(outletAResult[0].isOutOfStock, false);
    assert.equal(outletBResult[0].availableQuantity, 0);
    assert.equal(outletBResult[0].isOutOfStock, true);
  });

  it('never reads from products.stock_qty for POS stock', () => {
    const legacyProducts = [
      { ...product({ id: 'p1' }), stock_qty: 99 } as CatalogProduct & { stock_qty: number },
    ];
    const result = enrichCatalogProductsWithStock({
      products: legacyProducts,
      balances: [], // no inventory_balances row
      outletId: 'outlet-A',
    });

    assert.equal(result[0].stock_qty, 0, 'should ignore legacy stock_qty and read from balances');
    assert.equal(result[0].isOutOfStock, true);
  });
});
