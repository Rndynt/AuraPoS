import type { CartItem as CartItemType, PaymentMethod } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Drawer } from "vaul";
import { ShoppingBag, CreditCard, Printer, X, Edit2, User, Banknote, Scan, ChevronDown, ChevronUp, ChefHat, Trash2 } from "lucide-react";
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

type OrderType = 'dine-in' | 'take-away' | 'delivery';

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
  // Order type props (optional for backward compatibility)
  orderType?: OrderType;
  setOrderType?: (type: OrderType) => void;
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
  orderType: externalOrderType,
  setOrderType: externalSetOrderType,
}: MobileCartDrawerProps) {
  const { business_type, hasModule, isLoading } = useTenant();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const { data: tablesData, isLoading: tablesLoading } = useTables();
  
  const [internalOrderType, setInternalOrderType] = useState<OrderType>('dine-in');
  const orderType = externalOrderType ?? internalOrderType;
  const setOrderType = externalSetOrderType ?? setInternalOrderType;

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
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[55] md:hidden" />
        <Drawer.Content
          className={`fixed md:relative top-0 bottom-0 right-0 z-[60] bg-white border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 w-full md:w-[380px] h-[95vh] mt-[5vh] md:mt-0 md:h-auto ${
            open ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
          } rounded-t-[2rem] md:rounded-none`}
          data-testid="drawer-mobile-cart"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white rounded-t-[2rem] md:rounded-none relative z-40">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="md:hidden p-1 bg-slate-100 rounded-full"
                data-testid="button-close-drawer"
              >
                <ChevronDown size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Pesanan Baru</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
                {orderNumber}
              </div>
              <button
                onClick={onClear}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                data-testid="button-clear-cart"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Content area with customer info and cart items */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col relative z-0">
            {/* Order Type & Customer Info Section */}
            <div className="p-4 bg-white border-b border-slate-100 shadow-sm z-10">
              {/* Order Type Selector */}
              <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1 mb-4">
                {(['dine-in', 'take-away', 'delivery'] as OrderType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`text-[11px] font-bold py-2 rounded-lg capitalize flex items-center justify-center gap-1 ${
                      orderType === type
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400'
                    }`}
                    data-testid={`button-order-type-${type}`}
                  >
                    {type.replace('-', ' ')}
                  </button>
                ))}
              </div>
              
              {/* Customer Name & Table Number */}
              <div className="flex gap-3">
                {/* Customer Name Card */}
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-3 hover:border-blue-300 transition-colors group">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm group-hover:text-blue-500 flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Pelanggan
                    </p>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none"
                      placeholder="Walk-in Guest"
                      data-testid="input-customer-name"
                    />
                  </div>
                  <Edit2
                    size={12}
                    className="text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  />
                </div>
                
                {/* Table Number Card (only for dine-in) */}
                {orderType === 'dine-in' && showTableNumber && setTableNumber && (
                  <div className="w-20 bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center hover:border-blue-300 cursor-pointer group">
                    <p className="text-[10px] text-slate-400 uppercase font-bold text-center">
                      Meja
                    </p>
                    <div className="flex items-center gap-1">
                      <Select 
                        value={tableNumber} 
                        onValueChange={setTableNumber}
                      >
                        <SelectTrigger className="border-0 h-auto p-0 focus:ring-0 w-auto bg-transparent" data-testid="select-table-mobile">
                          <div className="flex items-center gap-1">
                            <span className="text-lg font-black text-slate-700">
                              {tableNumber || "-"}
                            </span>
                            <Edit2
                              size={10}
                              className="text-slate-300 opacity-0 group-hover:opacity-100"
                            />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {tablesLoading ? (
                            <div className="p-2 text-xs text-slate-400">Loading...</div>
                          ) : tablesData?.tables && tablesData.tables.length > 0 ? (
                            tablesData.tables
                              .filter(t => t.status !== 'maintenance')
                              .map((table) => (
                                <SelectItem key={table.id} value={table.tableNumber}>
                                  Table {table.tableNumber}
                                </SelectItem>
                              ))
                          ) : (
                            <div className="p-2 text-xs text-slate-400">No tables</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-4 space-y-3 pb-40 md:pb-6 flex-1">
              {items.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                  <ShoppingBag size={48} className="mb-3 opacity-50" />
                  <p className="text-sm font-medium" data-testid="text-empty-cart">
                    Belum ada pesanan
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
          </div>

          {/* Footer with totals and actions */}
          {items.length > 0 && (
            <div className="absolute md:relative bottom-0 left-0 right-0 z-30">
              {/* Expandable Summary Section - Slides UP from bottom */}
              <div
                className={`absolute bottom-full left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-5 rounded-t-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out -z-10 ${
                  isSummaryExpanded
                    ? 'translate-y-4 opacity-100 visible pb-6'
                    : 'translate-y-full opacity-0 invisible'
                }`}
              >
                <div className="space-y-3 pb-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span>
                    <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Pajak ({formatRateLabel(taxRate)})</span>
                    <span data-testid="text-tax">{formatPrice(tax)}</span>
                  </div>
                  {serviceCharge > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Service ({formatRateLabel(serviceChargeRate)})</span>
                      <span data-testid="text-service">{formatPrice(serviceCharge)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Main Footer - ALWAYS VISIBLE */}
              <div 
                className="bg-white border-t border-slate-200 p-5 pb-6 shadow-[0_-5px_25px_rgba(0,0,0,0.1)] relative z-20"
              >
                {/* Toggle Button */}
                <div
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-400 w-12 h-6 flex items-center justify-center rounded-full shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95"
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
                    <p className="text-xs text-slate-400 font-medium group-hover:text-blue-600 transition-colors">
                      Total Tagihan
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black text-slate-800" data-testid="text-total">
                        {formatPrice(total)}
                      </span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 md:hidden">
                        Detail
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                  <button
                    onClick={hasKitchenTicket && onKitchenTicket ? onKitchenTicket : onCharge}
                    disabled={isProcessing || items.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
                    data-testid={hasKitchenTicket ? "button-kitchen-ticket" : "button-place-order"}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <ChefHat size={18} />
                      <span>Simpan</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">
                      Ke Dapur
                    </span>
                  </button>
                  <button
                    onClick={onCharge}
                    disabled={isProcessing || items.length === 0}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-3.5 rounded-xl font-bold flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
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
