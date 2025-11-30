// @ts-nocheck - React 19 compatibility with shadcn/ui components
import type { CartItem as CartItemType, PaymentMethod, OrderType } from "@/hooks/useCart";
import type { OrderType as DomainOrderType } from "@pos/domain/orders/types";
import { CartItem } from "./CartItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, Printer, Edit2, Receipt, Banknote, Scan, ChevronUp, ChefHat, User, ShoppingBag, Trash2 } from "lucide-react";
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
import { useState, useCallback } from "react";
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
  onSaveDraft?: () => void;
  hasPartialPayment?: boolean;
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
  activeOrderTypes?: DomainOrderType[];
  setSelectedOrderTypeId?: (id: string | null) => void;
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
  onSaveDraft,
  hasPartialPayment = false,
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
  activeOrderTypes = [],
  setSelectedOrderTypeId,
}: CartPanelProps) {
  const { business_type, hasModule, isLoading } = useTenant();
  const [isEditingCustomerName, setIsEditingCustomerName] = useState(false);
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const { data: tablesData, isLoading: tablesLoading } = useTables();

  const showTableNumber = !isLoading && hasModule('enable_table_management');

  const displayOrderTypes = activeOrderTypes.length > 0 
    ? activeOrderTypes.map(ot => ({
        code: ot.code.toLowerCase().replace(/_/g, '-') as OrderType,
        id: ot.id,
        name: ot.name
      }))
    : [
        { code: 'dine-in' as OrderType, id: null, name: 'Dine In' },
        { code: 'take-away' as OrderType, id: null, name: 'Take Away' },
        { code: 'delivery' as OrderType, id: null, name: 'Delivery' }
      ];

  const handleOrderTypeSelect = useCallback((type: OrderType, orderTypeId: string | null) => {
    setOrderType(type);
    
    if (setSelectedOrderTypeId && orderTypeId) {
      setSelectedOrderTypeId(orderTypeId);
    }
  }, [setOrderType, setSelectedOrderTypeId]);

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
    <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col">
      {/* Header with Order Number */}
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Pesanan Baru</h2>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
              {orderNumber}
            </div>
            <button
              onClick={onClear}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              data-testid="button-clear-cart"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Flex container for order type and cart items - this is the scrollable area */}
      <div className='flex-1 overflow-y-auto bg-slate-50/50 flex flex-col relative z-0 min-h-0'>
        {/* Order Type Selection & Customer Info - Fixed at top of scroll area */}
        <div className='p-4 bg-white border-b border-slate-100 shadow-sm z-10'>
          {/* Order Type Selector */}
          <div className={`bg-slate-100 p-1 rounded-xl grid gap-1 mb-4`} style={{ gridTemplateColumns: `repeat(${Math.min(displayOrderTypes.length, 3)}, 1fr)` }}>
            {displayOrderTypes.map((ot) => (
              <button
                key={ot.code}
                onClick={() => handleOrderTypeSelect(ot.code, ot.id)}
                className={`text-[11px] font-bold py-2 rounded-lg capitalize flex items-center justify-center gap-1 ${
                  orderType === ot.code
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400'
                }`}
                data-testid={`button-order-type-${ot.code}`}
              >
                {ot.name || ot.code.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Customer Name & Table Number Cards */}
          <div className='flex gap-3'>
            {/* Customer Name Card */}
            <div className='flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-3 hover:border-blue-300 transition-colors group'>
              <div className='w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm group-hover:text-blue-500 flex-shrink-0'>
                <User size={16} />
              </div>
              <div className='flex-1 overflow-hidden'>
                <p className='text-[10px] text-slate-400 uppercase font-bold'>
                  Pelanggan
                </p>
                <input
                  type='text'
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className='bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none'
                  data-testid="input-customer-name"
                />
              </div>
              <Edit2
                size={12}
                className='text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0'
              />
            </div>

            {/* Table Number Card (only for dine-in) */}
            {orderType === 'dine-in' && showTableNumber && setTableNumber && (
              <div className='w-20 bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center hover:border-blue-300 cursor-pointer group'>
                <p className='text-[10px] text-slate-400 uppercase font-bold text-center'>
                  Meja
                </p>
                <div className='flex items-center gap-1'>
                  <Select 
                    value={tableNumber} 
                    onValueChange={setTableNumber}
                  >
                    <SelectTrigger className="border-0 h-auto p-0 focus:ring-0 w-auto bg-transparent" data-testid="select-table">
                      <div className="flex items-center gap-1">
                        <span className='text-lg font-black text-slate-700'>
                          {tableNumber || "-"}
                        </span>
                        <Edit2
                          size={10}
                          className='text-slate-300 opacity-0 group-hover:opacity-100'
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

        {/* Cart Items - Scrollable */}
        <div className='flex-1 min-h-0 p-4 space-y-3 pb-6 overflow-y-auto'>
          {items.length === 0 ? (
            <div className='h-40 flex flex-col items-center justify-center text-slate-300'>
              <ShoppingBag size={48} className='mb-3 opacity-50' />
              <p className='text-sm font-medium' data-testid="text-empty-cart">Belum ada pesanan</p>
            </div>
          ) : (
            items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemove={onRemove}
                getItemPrice={getItemPrice}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer with totals and actions - flex-shrink-0 keeps it from collapsing */}
      {items.length > 0 && (
        <div className='flex-shrink-0 bg-white border-t border-slate-200 shadow-[0_-5px_25px_rgba(0,0,0,0.1)]'>
          {/* Expandable Summary Section - normal flow, collapsed by default */}
          {isSummaryExpanded && (
            <div className='bg-white/95 backdrop-blur-md border-b border-slate-200 p-5'>
              <div className='space-y-3 pb-2'>
                <div className='flex justify-between text-sm text-slate-500'>
                  <span>Subtotal</span>
                  <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                </div>
                <div className='flex justify-between text-sm text-slate-500'>
                  <span>Pajak ({formatRateLabel(taxRate)})</span>
                  <span data-testid="text-tax">{formatPrice(tax)}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className='flex justify-between text-sm text-slate-500'>
                    <span>Service ({formatRateLabel(serviceChargeRate)})</span>
                    <span data-testid="text-service">{formatPrice(serviceCharge)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Main Footer Section */}
          <div className='p-5 pb-6'>
            {/* Total Section */}
            <div className='flex items-center justify-between mb-4'>
              <div
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className='cursor-pointer group'
              >
                <div className='flex items-center justify-between'>
                  <p className='text-xs text-slate-400 font-medium group-hover:text-blue-600 transition-colors'>
                    Total Tagihan
                  </p>
                  <button
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className='bg-white border border-slate-200 text-slate-400 w-6 h-6 flex items-center justify-center rounded-full shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95 transition-transform'
                    data-testid="button-toggle-pricing-details"
                  >
                    <ChevronUp
                      size={14}
                      className={`transition-transform duration-300 ${
                        isSummaryExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className='flex items-center gap-1'>
                  <span className='text-md font-black text-slate-800' data-testid="text-total">
                    {formatPrice(total)}
                  </span>
                  <span className='text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 md:hidden'>
                    Detail
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons - Always 2 columns: Simpan + Bayar - Only show on desktop */}
            <div className='hidden md:grid grid-cols-2 gap-3'>
              {/* Save Draft Button - Always visible, NO kitchen dependency */}
              <button
                onClick={onSaveDraft}
                disabled={isProcessing || items.length === 0}
                className='bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 py-3.5 rounded-xl font-bold flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all'
                data-testid="button-save-draft"
              >
                <div className='flex items-center gap-2 text-sm'>
                  <ShoppingBag size={18} />
                  <span>Simpan</span>
                </div>
                <span className='text-[9px] font-normal opacity-70'>
                  Simpan Draft
                </span>
              </button>
              {/* Pay Button - Always visible */}
              <button
                onClick={onCharge}
                disabled={isProcessing || items.length === 0}
                className='bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all'
                data-testid="button-complete-payment"
              >
                <div className='flex items-center gap-2 text-sm'>
                  <Banknote size={18} />
                  <span>Bayar</span>
                </div>
                <span className='text-[9px] opacity-80 font-normal'>
                  Proses Pembayaran
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
