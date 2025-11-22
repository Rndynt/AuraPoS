import type { CartItem as CartItemType, PaymentMethod, OrderType } from "@/hooks/useCart";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, Printer, Edit2, Receipt, Banknote, Scan, ChevronUp, ChefHat, User } from "lucide-react";
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
  isProcessing?: boolean;
  // New metadata props
  customerName: string;
  setCustomerName: (name: string) => void;
  orderNumber: string;
  tableNumber?: string;
  setTableNumber?: (table: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  continueOrderId?: string | null;
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
  isProcessing = false,
  customerName,
  setCustomerName,
  orderNumber,
  tableNumber,
  setTableNumber,
  paymentMethod,
  setPaymentMethod,
  orderType,
  setOrderType,
  continueOrderId,
}: CartPanelProps) {
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
    <div className="w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Header with Order Number */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pesanan Baru</h2>
          <div className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-md">
            {orderNumber}
          </div>
        </div>
      </div>

      {/* Order Type Selection & Customer Info */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        {/* Order Type Selector */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl grid grid-cols-3 gap-1 mb-4">
          {(['dine-in', 'take-away', 'delivery'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`text-[11px] font-bold py-2 rounded-lg capitalize flex items-center justify-center gap-1 ${
                orderType === type
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
              data-testid={`button-order-type-${type}`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Customer Name & Table Number Cards */}
        <div className="flex gap-3">
          {/* Customer Name Card */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">
            <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0">
              <User size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                Pelanggan
              </p>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-transparent w-full text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                placeholder="Walk-in Guest"
                data-testid="input-customer-name"
              />
            </div>
            <Edit2
              size={12}
              className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 flex-shrink-0"
            />
          </div>

          {/* Table Number Card (only for dine-in) */}
          {orderType === 'dine-in' && showTableNumber && setTableNumber && (
            <div className="w-20 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex flex-col items-center justify-center hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer group">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold text-center">
                Meja
              </p>
              <div className="flex items-center gap-1">
                <Select 
                  value={tableNumber} 
                  onValueChange={setTableNumber}
                >
                  <SelectTrigger className="border-0 h-auto p-0 focus:ring-0 w-auto bg-transparent" data-testid="select-table">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                        {tableNumber || "-"}
                      </span>
                      <Edit2
                        size={10}
                        className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100"
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

      {/* Scrollable content area - ONLY THIS SECTION SCROLLS */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
        {items.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
            <ShoppingCart size={48} className="mb-3 opacity-50" />
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
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-5 pb-6 shadow-[0_-5px_25px_rgba(0,0,0,0.1)] relative z-20">
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
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 md:hidden">
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
                className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
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
    </div>
  );
}
