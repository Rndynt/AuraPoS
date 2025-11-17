import { useState } from "react";
import type { Product } from "@/../../packages/domain/catalog/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncrease = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <Card
      className="flex h-full w-full flex-col rounded-3xl border border-slate-100 bg-card shadow-sm hover:shadow-md transition-shadow"
      data-testid={`card-product-${product.id}`}
    >
      <CardContent className="p-4 pb-3 space-y-4 flex-1">
        {/* TOP: image + title + price */}
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

          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className="font-semibold text-sm line-clamp-2"
                  data-testid={`text-product-name-${product.id}`}
                >
                  {product.name}
                </h3>
                {product.stock_tracking_enabled && (
                  <p className="text-[11px] text-muted-foreground">
                    {product.stock_qty} Available
                  </p>
                )}
              </div>

              {product.has_variants && (
                <Badge
                  variant="outline"
                  className="text-[10px] rounded-full px-2 py-0.5"
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
          </div>
        </div>

        {/* Cup Size & Ice Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium">Cup Size</span>
            <span className="font-medium">Ice Level</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Cup Size pills */}
            <div className="flex gap-1">
              {["S", "M", "L"].map((size, index) => (
                <button
                  key={size}
                  type="button"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
                    index === 1
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Ice Level pills */}
            <div className="flex gap-1">
              {["20", "30", "50"].map((level, levelIndex) => (
                <button
                  key={level}
                  type="button"
                  className={`inline-flex h-7 px-2 items-center justify-center rounded-full border text-[11px] ${
                    levelIndex === 2
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground font-medium">
          Amount
        </div>

        <div className="inline-flex items-center rounded-full border bg-background px-2 py-1">
          <button
            type="button"
            onClick={handleDecrease}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-6 text-center text-sm tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={handleIncrease}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        
      </CardContent>

      {/* BOTTOM: amount + Add button */}
      <CardFooter className="px-4 pb-4 pt-0 flex items-center gap-3">
        
        <Button
          className="flex-1 justify-center gap-2 rounded-full h-9 text-sm"
          onClick={() => onAddToCart(product)}
          data-testid={`button-add-${product.id}`}
        >
          <Plus className="w-4 h-4" />
          
        </Button>
        
      </CardFooter>
    </Card>
  );
}