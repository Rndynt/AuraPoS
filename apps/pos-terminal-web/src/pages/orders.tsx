import { useMemo, useState } from "react";
import { useOrder, useOrders, useRecordPayment } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UnifiedBottomNav } from "@/components/navigation/UnifiedBottomNav";
import { 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat,
  CheckCircle,
  Search,
} from "lucide-react";
import type { Order, OrderItem, SelectedOption } from "@pos/domain/orders/types";

const ORDER_STATUS_CONFIG = {
  draft: { label: "Draft", variant: "outline" as const, icon: Clock, color: "text-gray-600" },
  confirmed: { label: "Confirmed", variant: "secondary" as const, icon: Clock, color: "text-blue-600" },
  preparing: { label: "Preparing", variant: "secondary" as const, icon: ChefHat, color: "text-orange-600" },
  ready: { label: "Ready", variant: "default" as const, icon: CheckCircle, color: "text-emerald-600" },
  completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
};

const PAYMENT_STATUS_CONFIG = {
  paid: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  unpaid: { label: "Unpaid", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

type OrderStatusFilter = "all" | "confirmed" | "preparing" | "ready" | "completed";

type NormalizedMoneyFields = {
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
};

type NormalizedOrderItem = Omit<OrderItem, "selected_options"> & {
  selected_options?: SelectedOption[];
};

type NormalizedOrder = Omit<Order, keyof NormalizedMoneyFields | "created_at"> &
  NormalizedMoneyFields & {
    created_at?: Date;
    items: NormalizedOrderItem[];
    payment_status: Order["payment_status"];
  };

const normalizeMoney = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeItem = (item: Partial<OrderItem>): NormalizedOrderItem => ({
  id: item.id || crypto.randomUUID(),
  product_id: item.product_id || "",
  product_name: item.product_name || (item as any).productName || "",
  base_price: normalizeMoney(item.base_price ?? (item as any).basePrice),
  variant_id: item.variant_id || (item as any).variantId,
  variant_name: item.variant_name || (item as any).variantName,
  variant_price_delta: normalizeMoney(item.variant_price_delta ?? (item as any).variantPriceDelta),
  selected_options: item.selected_options as SelectedOption[] | undefined,
  selected_option_groups: item.selected_option_groups,
  quantity: item.quantity || 0,
  item_subtotal: normalizeMoney(item.item_subtotal ?? (item as any).itemSubtotal),
  notes: item.notes,
  status: item.status as NormalizedOrderItem["status"],
});

const normalizeOrder = (order: Partial<Order>): NormalizedOrder => {
  const created_at = order.created_at || (order as any).createdAt || (order as any).orderDate;

  return {
    id: order.id || "",
    tenant_id: order.tenant_id || (order as any).tenantId || "",
    order_type_id: order.order_type_id || (order as any).orderTypeId,
    sales_channel:
      (order.sales_channel as NormalizedOrder["sales_channel"]) || (order as any).salesChannel,
    items: Array.isArray(order.items)
      ? order.items.map((item) => normalizeItem(item))
      : [],
    subtotal: normalizeMoney(order.subtotal ?? (order as any).subtotal),
    tax_amount: normalizeMoney(order.tax_amount ?? (order as any).taxAmount),
    service_charge_amount: normalizeMoney(
      order.service_charge_amount ?? (order as any).serviceCharge ?? (order as any).service_charge
    ),
    discount_amount: normalizeMoney(order.discount_amount ?? (order as any).discountAmount),
    total_amount: normalizeMoney(order.total_amount ?? (order as any).total),
    paid_amount: normalizeMoney(order.paid_amount ?? (order as any).paidAmount),
    payment_status: order.payment_status || (order as any).paymentStatus || "unpaid",
    payments: (order as any).payments,
    order_number: order.order_number || (order as any).orderNumber || "-",
    status: order.status || "draft",
    customer_name: order.customer_name || (order as any).customerName,
    table_number: order.table_number || (order as any).tableNumber,
    notes: order.notes,
    created_at: created_at ? new Date(created_at as Date | string) : undefined,
    updated_at: order.updated_at,
    completed_at: order.completed_at,
  };
};

export default function OrdersPage() {
  const [filterStatus, setFilterStatus] = useState<OrderStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data, isLoading, error } = useOrders();
  const { data: selectedOrderResponse } = useOrder(selectedOrderId || undefined);
  const recordPaymentMutation = useRecordPayment();

  const normalizedOrders = useMemo(
    () => (data?.orders || []).map((order) => normalizeOrder(order)),
    [data]
  );

  // Filter orders based on status filter AND search query
  const filteredOrders = useMemo(() => {
    const activeOrders = normalizedOrders.filter(o => 
      ["draft", "confirmed", "preparing", "ready"].includes(o.status)
    );
    
    let result = activeOrders;
    
    if (filterStatus !== "all") {
      result = result.filter(o => o.status === filterStatus);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.customer_name?.toLowerCase().includes(query) ||
        o.order_number?.toLowerCase().includes(query) ||
        o.table_number?.toString().includes(query)
      );
    }
    
    return result;
  }, [normalizedOrders, filterStatus, searchQuery]);

  const selectedOrder = useMemo(() => {
    if (selectedOrderResponse) return normalizeOrder(selectedOrderResponse);
    if (selectedOrderId) return normalizedOrders.find((order) => order.id === selectedOrderId) || null;
    return null;
  }, [normalizedOrders, selectedOrderId, selectedOrderResponse]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return "-";

    const parsedDate = new Date(date);
    if (!Number.isFinite(parsedDate.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsedDate);
  };

  // Calculate filter counts
  const activeOrders = normalizedOrders.filter(o => 
    ["draft", "confirmed", "preparing", "ready"].includes(o.status)
  );
  
  const filterCounts = {
    all: activeOrders.length,
    confirmed: activeOrders.filter(o => o.status === "confirmed").length,
    preparing: activeOrders.filter(o => o.status === "preparing").length,
    ready: activeOrders.filter(o => o.status === "ready").length,
    completed: normalizedOrders.filter(o => o.status === "completed").length,
  };

  const handleProcessTransaction = async () => {
    if (!selectedOrder) return;

    const remainingAmount = selectedOrder.total_amount - selectedOrder.paid_amount;

    if (remainingAmount <= 0) {
      toast({
        title: "Already Paid",
        description: "This order has already been fully paid.",
        variant: "destructive",
      });
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        orderId: selectedOrder.id,
        amount: remainingAmount,
        payment_method: "cash",
      });

      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatPrice(remainingAmount)} recorded successfully.`,
      });
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 relative">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative pb-[60px] md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 md:p-6">
          {/* Title Section */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800" data-testid="heading-orders">
                Pesanan
              </h1>
              <p className="text-slate-500 text-sm">
                Kelola dan pantau semua pesanan Anda
              </p>
            </div>
            <div className="flex gap-2 text-xs font-bold">
              <div className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg">
                {filterCounts.confirmed} Confirmed
              </div>
              <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                {filterCounts.preparing} Prep
              </div>
            </div>
          </div>

          {/* Search & Filter Section */}
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari pesanan..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-orders"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {(["all", "confirmed", "preparing", "ready", "completed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    filterStatus === status
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  data-testid={`filter-${status}`}
                >
                  {status === "all" ? "Semua" : status}
                  {` (${filterCounts[status]})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Orders List */}
          <div className="flex-1 flex flex-col overflow-hidden md:border-r border-slate-200">
            {/* Order Cards */}
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-4 md:p-6 space-y-3">
                {isLoading ? (
                  <div className="text-center py-16 text-slate-500">
                    Memuat pesanan...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    Tidak ada pesanan
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const statusConfig = ORDER_STATUS_CONFIG[order.status];
                    const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG["unpaid"];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <Card
                        key={order.id}
                        className={`cursor-pointer hover-elevate transition-all ${
                          selectedOrder?.id === order.id ? "ring-2 ring-blue-600" : ""
                        }`}
                        onClick={() => setSelectedOrderId(order.id)}
                        data-testid={`order-card-${order.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">
                                {order.customer_name || "Pelanggan"}
                              </CardTitle>
                              <p className="text-sm text-slate-500 mt-1">
                                #{order.order_number}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                              <Badge variant={statusConfig.variant} className="text-xs">
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                              {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                            </span>
                            <Badge className={paymentConfig.className} variant="outline">
                              {paymentConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-sm text-slate-600">
                              {formatDate(order.created_at)}
                            </span>
                            <span className="font-bold text-slate-800">
                              {formatPrice(order.total_amount)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Order Details Panel */}
          <div className="w-full md:w-96 bg-white flex flex-col border-t md:border-t-0 md:border-l border-slate-200 overflow-hidden">
            {selectedOrder ? (
              <>
                <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-lg font-semibold text-slate-800">Detail Pesanan</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedOrderId(null)}
                    data-testid="button-close-details"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 overflow-auto">
                  <div className="p-4 md:p-6 space-y-6 pb-20">
                    {/* Customer Info */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-slate-600">Nama Pelanggan</Label>
                        <p className="font-medium mt-1">
                          {selectedOrder.customer_name || "Pelanggan"}
                        </p>
                      </div>
                      {selectedOrder.table_number && (
                        <div>
                          <Label className="text-sm text-slate-600">Meja</Label>
                          <p className="font-medium mt-1">{selectedOrder.table_number}</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Order Details */}
                    <div>
                      <h3 className="font-semibold mb-3 text-slate-800">Item Pesanan</h3>
                      <div className="space-y-3">
                        {selectedOrder.items?.length ? (
                          selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{item.product_name}</p>
                                {item.variant_name && (
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {item.variant_name}
                                  </p>
                                )}
                                {item.selected_options && item.selected_options.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.selected_options.map((opt, optIdx) => (
                                      <Badge key={optIdx} variant="outline" className="text-xs">
                                        {opt.option_name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm text-slate-600">
                                    x{item.quantity}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {formatPrice(item.item_subtotal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-600">Tidak ada item untuk pesanan ini.</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Order Summary */}
                    <div>
                      <h3 className="font-semibold mb-3 text-slate-800">Ringkasan Pesanan</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Subtotal</span>
                          <span>{formatPrice(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pajak</span>
                          <span>{formatPrice(selectedOrder.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Biaya Layanan</span>
                          <span>{formatPrice(selectedOrder.service_charge_amount)}</span>
                        </div>
                        {selectedOrder.discount_amount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Diskon</span>
                            <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-base pt-2">
                          <span>Total</span>
                          <span>{formatPrice(selectedOrder.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-4 md:p-6 border-t border-slate-200 flex-shrink-0">
                  <Button 
                    className="w-full" 
                    data-testid="button-process-transaction"
                    onClick={handleProcessTransaction}
                    disabled={recordPaymentMutation.isPending || selectedOrder.payment_status === "paid"}
                  >
                    {recordPaymentMutation.isPending ? "Memproses..." : "Proses Transaksi"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-600 space-y-2">
                  <ChefHat className="w-16 h-16 mx-auto opacity-30" />
                  <p>Pilih pesanan untuk melihat detail</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <UnifiedBottomNav cartCount={0} />
    </div>
  );
}
