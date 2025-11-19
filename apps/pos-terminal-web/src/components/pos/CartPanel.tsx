import type { CartItem as CartItemType } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, Printer, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/context/TenantContext";

type CartPanelProps = {
  items: CartItemType[];
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  getItemPrice: (item: CartItemType) => number;
  subtotal: number;
  taxRate: number;
  tax: number;
  serviceChargeRate: number;
  serviceCharge: number;
  total: number;
  onCharge: () => void;
  onPartialPayment?: () => void;
  onKitchenTicket?: () => void;
  hasPartialPayment?: boolean;
  hasKitchenTicket?: boolean;
};

export function CartPanel({
  items,
  onUpdateQty,
  onRemove,
  onClear,
  getItemPrice,
  subtotal,
  taxRate,
  tax,
  serviceChargeRate,
  serviceCharge,
  total,
  onCharge,
  onPartialPayment,
  onKitchenTicket,
  hasPartialPayment = false,
  hasKitchenTicket = false,
}: CartPanelProps) {
  const { business_type, hasModule, isLoading } = useTenant();

  const showTableNumber = !isLoading && business_type === 'CAFE_RESTAURANT' && hasModule('enable_table_management');
  const showDelivery = !isLoading && hasModule('enable_delivery');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatRateLabel = (rate: number) => {
    const percentage = rate * 100;
    const decimals = Number.isInteger(percentage) ? 0 : 1;
    return `${percentage.toFixed(decimals)}%`;
  };

  return (
    <div className="w-full h-full bg-card border-l border-card-border flex flex-col">
      <div className="p-4 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <h2 className="font-semibold text-lg">Order</h2>
          {items.length > 0 && (
            <Badge variant="secondary" data-testid="badge-item-count">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            data-testid="button-clear-cart"
          >
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty-cart">
                Cart is empty
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQty={onUpdateQty}
                  onRemove={onRemove}
                  getItemPrice={getItemPrice}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {items.length > 0 && (
        <div className="p-4 border-t border-card-border space-y-4">
          {(showTableNumber || showDelivery) && (
            <div className="space-y-3 pb-2 border-b border-card-border">
              {showTableNumber && (
                <div className="space-y-1.5">
                  <Label htmlFor="table-number" className="text-sm">
                    Table Number
                  </Label>
                  <Input
                    id="table-number"
                    type="text"
                    placeholder="e.g., Table 5"
                    data-testid="input-table-number"
                  />
                </div>
              )}
              {showDelivery && (
                <div className="space-y-1.5">
                  <Label htmlFor="delivery-address" className="text-sm">
                    Delivery Address
                  </Label>
                  <Textarea
                    id="delivery-address"
                    placeholder="Enter delivery address..."
                    rows={2}
                    data-testid="textarea-delivery-address"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums" data-testid="text-subtotal">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({formatRateLabel(taxRate)})</span>
              <span className="tabular-nums" data-testid="text-tax">
                {formatPrice(tax)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Service ({formatRateLabel(serviceChargeRate)})
              </span>
              <span className="tabular-nums" data-testid="text-service">
                {formatPrice(serviceCharge)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold pt-1">
              <span>Total</span>
              <span className="tabular-nums" data-testid="text-total">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={onCharge}
              data-testid="button-charge"
            >
              <CreditCard className="w-5 h-5" />
              Charge {formatPrice(total)}
            </Button>

            {hasPartialPayment && onPartialPayment && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={onPartialPayment}
                data-testid="button-partial-payment"
              >
                <CreditCard className="w-4 h-4" />
                Pay DP
              </Button>
            )}

            {hasKitchenTicket && onKitchenTicket && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onKitchenTicket}
                data-testid="button-kitchen-ticket"
              >
                <Printer className="w-4 h-4" />
                Send to Kitchen
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
