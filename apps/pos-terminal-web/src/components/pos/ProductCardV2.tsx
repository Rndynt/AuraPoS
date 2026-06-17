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
      className={`group bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 active:scale-98 hover:shadow-md relative h-full flex flex-col transition-transform duration-150 ${
        isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
      }`}
      data-testid={`card-product-${product.id}`}
      data-out-of-stock={isOutOfStock ? "true" : undefined}
      data-low-stock={isLowStock ? "true" : undefined}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg mb-2 bg-slate-100">
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

        {/* Out of stock overlay (precedence over inactive) */}
        {isOutOfStock && !isInactive && (
          <div
            className="absolute inset-0 bg-black/45 flex items-center justify-center"
            data-testid={`overlay-out-of-stock-${product.id}`}
          >
            <span className="text-white font-semibold text-sm">Stok Habis</span>
          </div>
        )}

        {/* Inactive overlay */}
        {isInactive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">Tidak Tersedia</span>
          </div>
        )}

        {/* Low-stock badge (top-left) */}
        {!isOutOfStock && isLowStock && availableQuantity !== null && (
          <div
            className="absolute top-1.5 left-1.5 bg-amber-500/95 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm"
            data-testid={`badge-low-stock-${product.id}`}
          >
            Stok Rendah · {availableQuantity}
          </div>
        )}

        {/* Available-stock badge for tracked products with healthy stock */}
        {stockTracked && !isOutOfStock && !isLowStock && availableQuantity !== null && (
          <div
            className="absolute top-1.5 left-1.5 bg-emerald-500/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm"
            data-testid={`badge-stock-${product.id}`}
          >
            Stok {availableQuantity}
          </div>
        )}

        {/* Variants Indicator - Bottom Right */}
        {hasVariants && (
          <div className="absolute bottom-1.5 right-1.5 bg-white/90 text-slate-800 p-1 rounded shadow-sm">
            <SlidersHorizontal size={14} />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col">
        <h3
          className="font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>
        <div className="mt-auto">
          <span
            className="text-blue-600 font-bold text-base"
            data-testid={`text-price-${product.id}`}
          >
            {formatIDR(product.base_price).replace(',00', '')}
          </span>
        </div>
      </div>
    </div>
  );
}
