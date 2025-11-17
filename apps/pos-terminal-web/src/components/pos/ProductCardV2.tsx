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
      className="hover-elevate"
      data-testid={`card-product-${product.id}`}
    >
      {/* Product Image - full width at top */}
      <div className="aspect-[4/3] bg-muted rounded-t-md overflow-hidden">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Product Info */}
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-sm line-clamp-2"
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </h3>

          {product.has_variants && (
            <Badge variant="outline" className="text-xs shrink-0">
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
          <p className="text-xs text-muted-foreground">
            {product.stock_qty} Available
          </p>
        )}
      </CardContent>

      {/* Add to Cart Button */}
      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full gap-2"
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
