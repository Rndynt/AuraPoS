import type { CartItem as CartItemType } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Drawer } from "vaul";
import { ShoppingCart, CreditCard, Printer, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/context/TenantContext";
import { useState } from "react";

type MobileCartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function MobileCartDrawer({
  open,
  onOpenChange,
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
}: MobileCartDrawerProps) {
  const { business_type, hasModule, isLoading } = useTenant();
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);
  const [pricingDetailsExpanded, setPricingDetailsExpanded] = useState(false);

  const showTableNumber = !isLoading && business_type === 'CAFE_RESTAURANT' && hasModule('enable_table_management');
  const showDelivery = !isLoading && hasModule('enable_delivery');
  const showOrderDetails = showTableNumber || showDelivery;

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
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border rounded-t-xl z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(85vh - env(safe-area-inset-bottom, 0px))" }}
          data-testid="drawer-mobile-cart"
        >
          {/* Header */}
          <div className="p-4 border-b border-card-border flex-shrink-0">
            <Drawer.Handle className="mx-auto w-12 h-1 bg-muted-foreground/30 rounded-full mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Order</h2>
                {items.length > 0 && (
                  <Badge variant="secondary">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClear}>
                    Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-close-drawer"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-8 space-y-3">
              {items.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Cart is empty</p>
                </div>
              ) : (
                <>
                  {/* Order Details Section (Collapsible) */}
                  {showOrderDetails && (
                    <div className="border border-card-border rounded-md">
                      <button
                        onClick={() => setOrderDetailsExpanded(!orderDetailsExpanded)}
                        className="w-full p-3 flex items-center justify-between hover-elevate"
                        data-testid="button-toggle-order-details-mobile"
                      >
                        <span className="font-medium text-sm">Order Details</span>
                        {orderDetailsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      
                      {orderDetailsExpanded && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-card-border">
                          {showTableNumber && (
                            <div className="space-y-1.5">
                              <Label htmlFor="table-number-mobile" className="text-sm">
                                Table Number
                              </Label>
                              <Input
                                id="table-number-mobile"
                                type="text"
                                placeholder="e.g., Table 5"
                                data-testid="input-table-number-mobile"
                              />
                            </div>
                          )}
                          {showDelivery && (
                            <div className="space-y-1.5">
                              <Label htmlFor="delivery-address-mobile" className="text-sm">
                                Delivery Address
                              </Label>
                              <Textarea
                                id="delivery-address-mobile"
                                placeholder="Enter delivery address..."
                                rows={2}
                                data-testid="textarea-delivery-address-mobile"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cart Items List */}
                  <div className="space-y-0">
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
                </>
              )}
          </div>

          {/* Footer with totals and actions */}
          {items.length > 0 && (
            <div
              className="p-4 border-t border-card-border space-y-4 bg-card flex-shrink-0"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            >
              <div className="space-y-2">
                {/* Collapsible Pricing Details */}
                <button
                  onClick={() => setPricingDetailsExpanded(!pricingDetailsExpanded)}
                  className="w-full flex items-center justify-between text-sm hover-elevate p-2 -mx-2 rounded-md"
                  data-testid="button-toggle-pricing-details"
                >
                  <span className="text-muted-foreground">Pricing Details</span>
                  {pricingDetailsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                
                {pricingDetailsExpanded && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({formatRateLabel(taxRate)})</span>
                      <span className="tabular-nums">{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Service ({formatRateLabel(serviceChargeRate)})
                      </span>
                      <span className="tabular-nums">{formatPrice(serviceCharge)}</span>
                    </div>
                  </div>
                )}
                
                <Separator />
                <div className="flex justify-between text-lg font-semibold pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={onCharge}
                  data-testid="button-charge-mobile"
                >
                  <CreditCard className="w-5 h-5" />
                  Charge {formatPrice(total)}
                </Button>

                {hasPartialPayment && onPartialPayment && (
                  <Button
                    variant="secondary"
                    className="w-full gap-2"
                    onClick={onPartialPayment}
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
                  >
                    <Printer className="w-4 h-4" />
                    Send to Kitchen
                  </Button>
                )}
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
