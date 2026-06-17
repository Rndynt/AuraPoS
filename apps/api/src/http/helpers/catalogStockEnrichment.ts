/**
 * Catalog Stock Enrichment Helper
 *
 * Joins a list of catalog products with active-outlet inventory balances so
 * POS responses carry outlet-scoped stock fields (`stock_qty`, `availableQuantity`,
 * `isOutOfStock`, `isLowStock`, `lowStockThreshold`, `outletId`).
 *
 * Source of truth is `inventory_balances.quantity` scoped by
 * tenant_id + outlet_id + product_id. `products.stock_qty` is never used here.
 */

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export interface StockEnrichmentBalance {
  productId: string;
  quantity: number;
  reservedQuantity?: number;
  lowStockThreshold: number | null;
}

export interface ProductLike {
  id: string;
  stock_tracking_enabled?: boolean;
  stock_qty?: number;
}

export interface EnrichedProduct<P extends ProductLike = ProductLike> {
  // Spread of original product, plus outlet-stock fields below.
  // Keep typing loose so we don't constrain other catalog metadata.
  [key: string]: unknown;
  id: string;
  stock_tracking_enabled: boolean;
  stock_qty: number;
  stockQty: number;
  stockQuantity: number;
  availableQuantity: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  lowStockThreshold: number;
  outletId: string | null;
}

export interface EnrichCatalogProductsInput<P extends ProductLike> {
  products: P[];
  balances: StockEnrichmentBalance[];
  outletId: string | null;
  defaultLowStockThreshold?: number;
}

/**
 * Returns a shallow-copied product list with outlet-scoped stock fields.
 *
 * Rules:
 *  - Products with `stock_tracking_enabled=false` are unconstrained:
 *    availableQuantity = Number.POSITIVE_INFINITY, isOutOfStock = false.
 *  - Products with tracking on and no balance row use quantity = 0.
 *  - `availableQuantity = max(0, quantity - reservedQuantity)`.
 *  - `isOutOfStock = availableQuantity <= 0`.
 *  - `isLowStock = !isOutOfStock && availableQuantity <= effectiveThreshold`.
 *  - When `outletId` is null (e.g. tenant-wide listing for management), tracked
 *    products fall back to product-level columns being unknown — quantity = 0
 *    and isOutOfStock = true, signalling the UI to refuse add-to-cart until an
 *    outlet is selected.
 */
export function enrichCatalogProductsWithStock<P extends ProductLike>(
  input: EnrichCatalogProductsInput<P>,
): Array<P & EnrichedProduct<P>> {
  const { products, balances, outletId, defaultLowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD } = input;
  const balanceMap = new Map<string, StockEnrichmentBalance>();
  for (const balance of balances) {
    balanceMap.set(balance.productId, balance);
  }

  return products.map((product) => {
    const tracking = Boolean(product.stock_tracking_enabled);

    if (!tracking) {
      return {
        ...product,
        stock_tracking_enabled: false,
        stock_qty: 0,
        stockQty: 0,
        stockQuantity: 0,
        availableQuantity: Number.POSITIVE_INFINITY,
        isOutOfStock: false,
        isLowStock: false,
        lowStockThreshold: defaultLowStockThreshold,
        outletId,
      } as P & EnrichedProduct<P>;
    }

    const balance = balanceMap.get(product.id);
    const quantity = balance?.quantity ?? 0;
    const reserved = balance?.reservedQuantity ?? 0;
    const effectiveThreshold = balance?.lowStockThreshold ?? defaultLowStockThreshold;
    const availableQuantity = Math.max(0, quantity - reserved);
    const isOutOfStock = availableQuantity <= 0;

    return {
      ...product,
      stock_tracking_enabled: true,
      stock_qty: quantity,
      stockQty: quantity,
      stockQuantity: quantity,
      availableQuantity,
      isOutOfStock,
      isLowStock: !isOutOfStock && availableQuantity <= effectiveThreshold,
      lowStockThreshold: effectiveThreshold,
      outletId,
    } as P & EnrichedProduct<P>;
  });
}
