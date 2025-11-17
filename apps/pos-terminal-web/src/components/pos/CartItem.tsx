import type { CartItem as CartItemType } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CartItemProps = {
  item: CartItemType;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  getItemPrice: (item: CartItemType) => number;
};

export function CartItem({ item, onUpdateQty, onRemove, getItemPrice }: CartItemProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const itemPrice = getItemPrice(item);
  const totalPrice = itemPrice * item.quantity;

  return (
    <div className="py-3 border-b last:border-b-0" data-testid={`cart-item-${item.id}`}>
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {item.product.image_url && (
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-cart-product-${item.id}`}>
                {item.product.name}
              </h4>
              {item.variant && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {item.variant.name}
                </Badge>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 flex-shrink-0"
              onClick={() => onRemove(item.id)}
              data-testid={`button-remove-${item.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                data-testid={`button-qty-minus-${item.id}`}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <div className="w-8 text-center text-sm font-medium tabular-nums" data-testid={`text-qty-${item.id}`}>
                {item.quantity}
              </div>
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                data-testid={`button-qty-plus-${item.id}`}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="text-sm font-semibold tabular-nums" data-testid={`text-item-total-${item.id}`}>
              {formatPrice(totalPrice)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
