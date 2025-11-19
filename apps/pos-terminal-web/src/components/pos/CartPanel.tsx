import type { CartItem as CartItemType, PaymentMethod } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, Printer, Edit2, Receipt, Banknote, Scan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useTenant } from "@/context/TenantContext";
import { useState } from "react";

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
  // New metadata props
  customerName: string;
  setCustomerName: (name: string) => void;
  orderNumber: string;
  tableNumber?: string;
  setTableNumber?: (table: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
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
  customerName,
  setCustomerName,
  orderNumber,
  tableNumber,
  setTableNumber,
  paymentMethod,
  setPaymentMethod,
}: CartPanelProps) {
  const { business_type, hasModule, isLoading } = useTenant();
  const [isEditingCustomerName, setIsEditingCustomerName] = useState(false);

  const showTableNumber = !isLoading && business_type === 'CAFE_RESTAURANT' && hasModule('enable_table_management');

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
      {/* Header with Customer Info */}
      <div className="p-4 border-b border-card-border flex-shrink-0 space-y-3">
        {/* Customer Name and Order Number */}
        <div className="bg-muted/50 rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            {isEditingCustomerName ? (
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={() => setIsEditingCustomerName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingCustomerName(false);
                }}
                placeholder="Customer's Name"
                className="flex-1"
                autoFocus
                data-testid="input-customer-name-edit"
              />
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <Receipt className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <h3 className="font-medium text-base">
                  {customerName || "Customer's Name"}
                </h3>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 flex-shrink-0"
              onClick={() => setIsEditingCustomerName(true)}
              data-testid="button-edit-customer-name"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Order Number: {orderNumber}
          </p>
        </div>

        {/* Table Selection - Only shown for CAFE_RESTAURANT with table management */}
        {showTableNumber && setTableNumber && (
          <div className="space-y-1.5">
            <Label htmlFor="table-select" className="text-sm">
              Select Table
            </Label>
            <Select 
              value={tableNumber} 
              onValueChange={setTableNumber}
            >
              <SelectTrigger id="table-select" data-testid="select-table">
                <SelectValue placeholder="Select table..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Table 1</SelectItem>
                <SelectItem value="2">Table 2</SelectItem>
                <SelectItem value="3">Table 3</SelectItem>
                <SelectItem value="4">Table 4</SelectItem>
                <SelectItem value="5">Table 5</SelectItem>
                <SelectItem value="6">Table 6</SelectItem>
                <SelectItem value="7">Table 7</SelectItem>
                <SelectItem value="8">Table 8</SelectItem>
                <SelectItem value="9">Table 9</SelectItem>
                <SelectItem value="10">Table 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty-cart">
                No Item Selected
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </ScrollArea>

      {/* Footer with totals and actions */}
      {items.length > 0 && (
        <div className="p-4 border-t border-card-border space-y-4 flex-shrink-0 bg-card">
          {/* Payment Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">Payment Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums" data-testid="text-subtotal">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums" data-testid="text-tax">
                {formatPrice(tax)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold pt-1">
              <span>Total Payable</span>
              <span className="tabular-nums" data-testid="text-total">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Payment Method</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="flex-col h-auto py-3 gap-1"
                onClick={() => setPaymentMethod("cash")}
                data-testid="button-payment-cash"
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                className="flex-col h-auto py-3 gap-1"
                onClick={() => setPaymentMethod("card")}
                data-testid="button-payment-card"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Card</span>
              </Button>
              <Button
                variant={paymentMethod === "scan" ? "default" : "outline"}
                className="flex-col h-auto py-3 gap-1"
                onClick={() => setPaymentMethod("scan")}
                data-testid="button-payment-scan"
              >
                <Scan className="w-5 h-5" />
                <span className="text-xs">Scan</span>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={onCharge}
              data-testid="button-place-order"
            >
              Place Order
            </Button>

            {hasKitchenTicket && onKitchenTicket && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onKitchenTicket}
                data-testid="button-print"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
