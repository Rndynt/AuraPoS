import { useState } from "react";
import type { Product } from "@pos/domain/catalog/types";
import { SlidersHorizontal } from "lucide-react";
import { formatIDR } from "@/lib/design-tokens";
import { ProductAvatar } from "@/components/ui/ProductAvatar";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

function isStockTracked(product: Product): boolean {
  return Boolean(product.stock_tracking_enabled);
}

function resolveAvailableQuantity(product: Product): number | null {
  if (!isStockTracked(product)) return null;
  if (typeof product.availableQuantity === "number") return product.availableQuantity;
  if (typeof product.stock_qty === "number") return product.stock_qty;
  return 0;
}

function resolveOutOfStock(product: Product): boolean {
  if (!isStockTracked(product)) return false;
  if (typeof product.isOutOfStock === "boolean") return product.isOutOfStock;
  return (resolveAvailableQuantity(product) ?? 0) <= 0;
}

function resolveLowStock(product: Product): boolean {
  if (!isStockTracked(product)) return false;
  if (resolveOutOfStock(product)) return false;
  if (typeof product.isLowStock === "boolean") return product.isLowStock;
  const available = resolveAvailableQuantity(product) ?? 0;
  const threshold = product.lowStockThreshold ?? 10;
  return available > 0 && available <= threshold;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasVariants = product.has_variants || (product.option_groups && product.option_groups.length > 0);
  const isInactive = !product.is_active;
  const stockTracked = isStockTracked(product);
  const isOutOfStock = resolveOutOfStock(product);
  const isLowStock = resolveLowStock(product);
  const availableQuantity = resolveAvailableQuantity(product);
  const isDisabled = isInactive || isOutOfStock;

  const handleClick = () => {
    if (isDisabled) return;
    onAddToCart(product);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
      className={`group bg-white rounded-xl shadow-sm border border-slate-100 active:scale-[0.96] hover:shadow-md relative flex flex-col transition-all duration-150 overflow-hidden ${
        isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
      }`}
      data-testid={`card-product-${product.id}`}
      data-out-of-stock={isOutOfStock ? "true" : undefined}
      data-low-stock={isLowStock ? "true" : undefined}
    >
      {/* Product Image — full width, flush to card edges */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
        {product.image_url && !imageFailed ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isDisabled ? "" : "group-hover:scale-105"
            }`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <ProductAvatar name={product.name} textClassName="text-2xl font-bold" />
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && !isInactive && (
          <div
            className="absolute inset-0 bg-black/45 flex items-center justify-center"
            data-testid={`overlay-out-of-stock-${product.id}`}
          >
            <span className="text-white font-semibold text-xs">Stok Habis</span>
          </div>
        )}

        {/* Inactive overlay */}
        {isInactive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-semibold text-xs">Tidak Tersedia</span>
          </div>
        )}

        {/* Low-stock badge */}
        {!isOutOfStock && isLowStock && availableQuantity !== null && (
          <div
            className="absolute top-1.5 left-1.5 bg-amber-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm"
            data-testid={`badge-low-stock-${product.id}`}
          >
            Stok {availableQuantity}
          </div>
        )}

        {/* Available-stock badge */}
        {stockTracked && !isOutOfStock && !isLowStock && availableQuantity !== null && (
          <div
            className="absolute top-1.5 left-1.5 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm"
            data-testid={`badge-stock-${product.id}`}
          >
            Stok {availableQuantity}
          </div>
        )}

        {/* Variants Indicator */}
        {hasVariants && (
          <div className="absolute bottom-1.5 right-1.5 bg-white/90 text-slate-700 p-1 rounded-md shadow-sm">
            <SlidersHorizontal size={12} />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-1">
        <h3
          className="font-bold text-slate-800 text-[11px] leading-snug line-clamp-2"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>
        <span
          className="text-blue-600 font-black text-sm tabular-nums"
          data-testid={`text-price-${product.id}`}
        >
          {formatIDR(product.base_price).replace(',00', '')}
        </span>
      </div>
    </div>
  );
}
