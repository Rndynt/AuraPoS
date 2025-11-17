import type { Product } from "@/../../packages/domain/catalog/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <Card
      className="flex h-full w-full flex-col rounded-3xl border border-slate-100 bg-card shadow-sm hover:shadow-md transition-shadow"
      data-testid={`card-product-${product.id}`}
    >
      <CardContent className="p-4 space-y-3 flex-1">
        {/* Product Image + Info */}
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-muted shrink-0">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="font-semibold text-sm line-clamp-2"
                data-testid={`text-product-name-${product.id}`}
              >
                {product.name}
              </h3>

              {product.has_variants && (
                <Badge
                  variant="outline"
                  className="text-[10px] rounded-full px-2 py-0.5 shrink-0"
                >
                  Variants
                </Badge>
              )}
            </div>

            <p
              className="text-lg font-semibold tabular-nums"
              data-testid={`text-price-${product.id}`}
            >
              {formatPrice(product.base_price)}
            </p>

            {product.stock_tracking_enabled && (
              <p className="text-[11px] text-muted-foreground">
                {product.stock_qty} Available
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {/* Add to Cart Button */}
      <CardFooter className="px-4 pb-4 pt-0">
        <Button
          className="w-full justify-center gap-2 rounded-full h-10 text-sm font-medium"
          onClick={() => onAddToCart(product)}
          data-testid={`button-add-${product.id}`}
        >
          <Plus className="w-4 h-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
