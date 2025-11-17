import type { Product } from "@/../../packages/domain/catalog/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-product-${product.id}`}>
      <CardContent className="p-0">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-base line-clamp-2" data-testid={`text-product-name-${product.id}`}>
              {product.name}
            </h3>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-semibold tabular-nums" data-testid={`text-price-${product.id}`}>
              {formatPrice(product.base_price)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {product.has_variants && (
              <Badge variant="secondary" className="text-xs">
                Variants
              </Badge>
            )}
            {product.stock_tracking_enabled && (
              <Badge
                variant="outline"
                className="text-xs gap-1"
              >
                <Package className="w-3 h-3" />
                {product.stock_qty}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full gap-2"
          onClick={() => onAddToCart(product)}
          data-testid={`button-add-${product.id}`}
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
