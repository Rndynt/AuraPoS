import { useState } from "react";
import type { Product } from "@pos/domain/catalog/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Layers } from "lucide-react";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <Card
      className="hover-elevate min-h-[280px] flex flex-col"
      data-testid={`card-product-${product.id}`}
    >
      {/* Product Image with Variants Icon Overlay */}
      <div className="relative aspect-[4/3] bg-muted rounded-t-md overflow-hidden">
        {product.image_url && !imageFailed ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        
        {/* Variants Icon Overlay - Top Right */}
        {product.has_variants && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md p-1.5 shadow-sm">
            <Layers className="w-4 h-4 text-foreground" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <CardContent className="p-3 space-y-2 flex-1">
        <h3
          className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>

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
