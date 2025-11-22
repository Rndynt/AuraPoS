import type { CartItem as CartItemType, PaymentMethod } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Drawer } from "vaul";
import { ShoppingCart, CreditCard, Printer, X, Edit2, Receipt, Banknote, Scan, ChevronDown, ChevronUp, ChefHat } from "lucide-react";
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
import { useTables } from "@/lib/api/tableHooks";

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
  isProcessing?: boolean;
  // New metadata props
  customerName: string;
  setCustomerName: (name: string) => void;
  orderNumber: string;
  tableNumber?: string;
  setTableNumber?: (table: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  continueOrderId?: string | null;
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
  isProcessing = false,
  customerName,
  setCustomerName,
  orderNumber,
  tableNumber,
  setTableNumber,
  paymentMethod,
  setPaymentMethod,
  continueOrderId,
}: MobileCartDrawerProps) {
  const { business_type, hasModule, isLoading } = useTenant();
  const [isEditingCustomerName, setIsEditingCustomerName] = useState(false);
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const { data: tablesData, isLoading: tablesLoading } = useTables();

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
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border rounded-t-xl z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(92vh - env(safe-area-inset-bottom, 0px))" }}
          data-testid="drawer-mobile-cart"
        >
          {/* Header with Customer Info */}
          <div className="p-4 border-b border-card-border flex-shrink-0 space-y-3">
            <Drawer.Handle className="mx-auto w-12 h-1 bg-muted-foreground/30 rounded-full mb-4" />
            
            {/*<div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-drawer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>*/}

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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Order Number: {orderNumber}
                </p>
                {showTableNumber && setTableNumber && (
                  <div className="flex items-center gap-2">
                    {isEditingTable ? (
                      <Select 
                        value={tableNumber} 
                        onValueChange={(val) => {
                          setTableNumber(val);
                          setIsEditingTable(false);
                        }}
                        defaultOpen={true}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs" data-testid="select-table-mobile">
                          <SelectValue placeholder={tablesLoading ? "..." : "Table..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {tablesLoading ? (
                            <div className="p-2 text-xs text-muted-foreground">Loading...</div>
                          ) : tablesData?.tables && tablesData.tables.length > 0 ? (
                            tablesData.tables
                              .filter(t => t.status !== 'maintenance')
                              .map((table) => (
                                <SelectItem key={table.id} value={table.tableNumber}>
                                  Table {table.tableNumber}
                                </SelectItem>
                              ))
                          ) : (
                            <div className="p-2 text-xs text-muted-foreground">No tables</div>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => setIsEditingTable(true)}
                        data-testid="badge-table-number"
                      >
                        {tableNumber ? `Table ${tableNumber}` : "Set Table"}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-8 space-y-3">
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

          {/* Footer with totals and actions */}
          {items.length > 0 && (
            <div className="relative flex-shrink-0">
              {/* Expandable Summary Section - Slides UP from bottom */}
              <div
                className={`absolute bottom-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-5 rounded-t-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out -z-10 ${
                  isSummaryExpanded
                    ? 'translate-y-4 opacity-100 visible pb-6'
                    : 'translate-y-full opacity-0 invisible'
                }`}
              >
                <div className="space-y-3 pb-2">
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>Pajak ({formatRateLabel(taxRate)})</span>
                    <span data-testid="text-tax">{formatPrice(tax)}</span>
                  </div>
                  {serviceCharge > 0 && (
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Service ({formatRateLabel(serviceChargeRate)})</span>
                      <span data-testid="text-service">{formatPrice(serviceCharge)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Main Footer - ALWAYS VISIBLE */}
              <div 
                className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-5 shadow-[0_-5px_25px_rgba(0,0,0,0.1)] relative z-20"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
              >
                {/* Toggle Button */}
                <div
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 w-12 h-6 flex items-center justify-center rounded-full shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-transform"
                  data-testid="button-toggle-pricing-details"
                >
                  <ChevronUp
                    size={16}
                    className={`transition-transform duration-300 ${
                      isSummaryExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                
                {/* Total Section */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className="cursor-pointer group"
                  >
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Total Tagihan
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100" data-testid="text-total">
                        {formatPrice(total)}
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                        Detail
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                  {hasKitchenTicket && onKitchenTicket ? (
                    <button
                      onClick={onKitchenTicket}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200/50 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
                      data-testid="button-print"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <ChefHat size={18} />
                        <span>Simpan</span>
                      </div>
                      <span className="text-[10px] opacity-80 font-normal">
                        Ke Dapur
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={onCharge}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                      data-testid={continueOrderId ? "button-update-order" : "button-place-order"}
                    >
                      {isProcessing ? (
                        <>
                          <Printer className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Processing...</span>
                        </>
                      ) : continueOrderId ? (
                        <span className="text-sm">Update Order</span>
                      ) : (
                        <span className="text-sm">Place Order</span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={onCharge}
                    disabled={isProcessing}
                    className="bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 text-green-700 dark:text-green-500 border border-green-200 dark:border-green-800 py-3.5 rounded-xl font-bold flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
                    data-testid="button-complete-payment"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote size={18} />
                      <span>Bayar</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">
                      Tutup Bill
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
