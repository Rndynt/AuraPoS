import { useState } from "react";
import type { Product, ProductVariant } from "@pos/domain/catalog/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";

type VariantSelectorProps = {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAdd: (product: Product, variant: ProductVariant | undefined, qty: number) => void;
};

export function VariantSelector({
  product,
  open,
  onClose,
  onAdd,
}: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [qty, setQty] = useState(1);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAdd = () => {
    onAdd(product, selectedVariant, qty);
    onClose();
    setQty(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="dialog-variant-selector">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {product.has_variants && product.variants && (
            <div className="space-y-3">
              <Label>Select Variant</Label>
              <RadioGroup
                value={selectedVariant?.id}
                onValueChange={(id) =>
                  setSelectedVariant(product.variants?.find((v) => v.id === id))
                }
              >
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                    data-testid={`option-variant-${variant.id}`}
                  >
                    <RadioGroupItem value={variant.id} id={variant.id} />
                    <Label
                      htmlFor={variant.id}
                      className="flex-1 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {variant.name}
                        {variant.color && (
                          <Badge
                            style={{ backgroundColor: variant.color }}
                            className="w-4 h-4 p-0 rounded-full"
                          />
                        )}
                      </span>
                      {variant.price_delta !== 0 && (
                        <span className="text-sm font-medium">
                          {variant.price_delta && variant.price_delta > 0 ? "+" : ""}
                          {formatPrice(variant.price_delta || 0)}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-3">
            <Label>Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQty(Math.max(1, qty - 1))}
                data-testid="button-qty-minus"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="w-16 text-center text-lg font-semibold tabular-nums" data-testid="text-qty">
                {qty}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQty(qty + 1)}
                data-testid="button-qty-plus"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Base Price</span>
              <span className="tabular-nums">{formatPrice(product.base_price)}</span>
            </div>
            {selectedVariant && selectedVariant.price_delta !== 0 && (
              <div className="flex justify-between text-sm">
                <span>Variant</span>
                <span className="tabular-nums">
                  {selectedVariant.price_delta && selectedVariant.price_delta > 0 ? "+" : ""}
                  {formatPrice(selectedVariant.price_delta || 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Quantity</span>
              <span className="tabular-nums">×{qty}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums" data-testid="text-variant-total">
                {formatPrice(
                  (product.base_price + (selectedVariant?.price_delta || 0)) * qty
                )}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-variant">
            Cancel
          </Button>
          <Button onClick={handleAdd} data-testid="button-add-to-cart">
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
