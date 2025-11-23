import { useMemo, useState } from "react";
import { useOrder, useOrders, useRecordPayment } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UnifiedBottomNav } from "@/components/navigation/UnifiedBottomNav";
import { 
  ListFilter, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat,
  CheckCircle,
  Utensils,
  ShoppingBag,
  CreditCard
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

type OrderViewTab = "all" | "dine-in" | "takeaway" | "ready-payment" | "completed";

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
  const [activeTab, setActiveTab] = useState<OrderViewTab>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch all orders without filtering by status on the API level
  // We'll filter on the client side to avoid double filtering issues
  const { data, isLoading, error } = useOrders();

  const { data: selectedOrderResponse } = useOrder(selectedOrderId || undefined);
  
  const recordPaymentMutation = useRecordPayment();

  const normalizedOrders = useMemo(
    () => (data?.orders || []).map((order) => normalizeOrder(order)),
    [data]
  );

  // Filter orders based on active tab
  const filteredOrders = useMemo(() => {
    if (activeTab === "all") {
      return normalizedOrders.filter(o => 
        ["draft", "confirmed", "preparing", "ready"].includes(o.status)
      );
    }
    if (activeTab === "dine-in") {
      return normalizedOrders.filter(o => 
        o.status === "draft" && o.table_number
      );
    }
    if (activeTab === "takeaway") {
      return normalizedOrders.filter(o => 
        o.status === "draft" && !o.table_number
      );
    }
    if (activeTab === "ready-payment") {
      return normalizedOrders.filter(o => 
        ["confirmed", "preparing", "ready"].includes(o.status) && 
        o.payment_status !== "paid"
      );
    }
    if (activeTab === "completed") {
      return normalizedOrders.filter(o => o.status === "completed");
    }
    return normalizedOrders;
  }, [normalizedOrders, activeTab]);

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

  const getTabCounts = () => {
    const allOrders = normalizedOrders;
    return {
      all: allOrders.filter(o => ["draft", "confirmed", "preparing", "ready"].includes(o.status)).length,
      dineIn: allOrders.filter(o => o.status === "draft" && o.table_number).length,
      takeaway: allOrders.filter(o => o.status === "draft" && !o.table_number).length,
      readyPayment: allOrders.filter(o => 
        ["confirmed", "preparing", "ready"].includes(o.status) && 
        o.payment_status !== "paid"
      ).length,
      completed: allOrders.filter(o => o.status === "completed").length,
    };
  };

  const counts = getTabCounts();

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
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 md:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-semibold truncate" data-testid="heading-orders">
              Order List
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
              Manage and track all your orders
            </p>
          </div>
          <Button variant="outline" size="sm" className="flex-shrink-0" data-testid="button-see-all">
            See All
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Orders List */}
        <div className="flex-1 flex flex-col md:border-r border-border overflow-hidden">
          {/* Tabs Filter */}
          <div className="px-4 md:px-6 py-3 border-b border-border flex-shrink-0 overflow-x-auto">
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as OrderViewTab)}>
              <TabsList className="w-full h-auto inline-flex md:grid md:grid-cols-5 gap-1 md:gap-2 p-1">
                <TabsTrigger 
                  value="all" 
                  data-testid="tab-all" 
                  className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3"
                >
                  <ListFilter className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">All</span>
                  <Badge variant="secondary" className="text-xs px-1 h-4 md:h-5">{counts.all}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="dine-in" 
                  data-testid="tab-dine-in" 
                  className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3"
                >
                  <Utensils className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">Dine-In</span>
                  <Badge variant="secondary" className="text-xs px-1 h-4 md:h-5">{counts.dineIn}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="takeaway" 
                  data-testid="tab-takeaway" 
                  className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3"
                >
                  <ShoppingBag className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">Takeaway</span>
                  <Badge variant="secondary" className="text-xs px-1 h-4 md:h-5">{counts.takeaway}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="ready-payment" 
                  data-testid="tab-ready-payment" 
                  className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3"
                >
                  <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">Payment</span>
                  <Badge variant="secondary" className="text-xs px-1 h-4 md:h-5">{counts.readyPayment}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  data-testid="tab-completed" 
                  className="flex items-center gap-1 md:gap-2 whitespace-nowrap px-2 md:px-3"
                >
                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm">Done</span>
                  <Badge variant="secondary" className="text-xs px-1 h-4 md:h-5">{counts.completed}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Order Cards */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-4 md:p-6 space-y-3 pb-20">
              {isLoading ? (
                <div className="text-center py-16 text-muted-foreground">
                  Loading orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No orders found
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const statusConfig = ORDER_STATUS_CONFIG[order.status];
                  const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG["unpaid"];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card
                      key={order.id}
                      className={`cursor-pointer hover-elevate ${
                        selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                      data-testid={`order-card-${order.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">
                              {order.customer_name || "Customer"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              #{order.order_number}
                            </p>
                          </div>
                          <Badge variant={statusConfig.variant}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                          </span>
                          <Badge className={paymentConfig.className}>
                            {paymentConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </span>
                          <span className="font-semibold">
                            {formatPrice(order.total_amount)}
                          </span>
                        </div>
                        {order.table_number && (
                          <div className="text-sm text-muted-foreground">
                            Table: {order.table_number}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Order Details Panel */}
        <div className="w-full md:w-96 bg-card flex flex-col border-t md:border-t-0 md:border-l overflow-hidden">
          {selectedOrder ? (
            <>
              <div className="p-4 md:p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Customer Information</h2>
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
                      <Label className="text-sm text-muted-foreground">Customer Name</Label>
                      <p className="font-medium">
                        {selectedOrder.customer_name || "Customer"}
                      </p>
                    </div>
                    {selectedOrder.table_number && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Table</Label>
                        <p className="font-medium">{selectedOrder.table_number}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Order Details */}
                  <div>
                    <h3 className="font-semibold mb-3">Order Details</h3>
                    <div className="space-y-3">
                      {selectedOrder.items?.length ? (
                        selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{item.product_name}</p>
                              {item.variant_name && (
                                <p className="text-xs text-muted-foreground">
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
                                <span className="text-sm text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground">No items for this order.</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div>
                    <h3 className="font-semibold mb-3">Order Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatPrice(selectedOrder.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service</span>
                        <span>{formatPrice(selectedOrder.service_charge_amount)}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold text-base pt-1">
                        <span>Total</span>
                        <span>{formatPrice(selectedOrder.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 md:p-6 border-t border-border flex-shrink-0">
                <Button 
                  className="w-full" 
                  data-testid="button-process-transaction"
                  onClick={handleProcessTransaction}
                  disabled={recordPaymentMutation.isPending || selectedOrder.payment_status === "paid"}
                >
                  {recordPaymentMutation.isPending ? "Processing..." : "Process Transaction"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground space-y-2">
                <ChefHat className="w-16 h-16 mx-auto opacity-50" />
                <p>Select an order to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <UnifiedBottomNav cartCount={0} />
    </div>
  );
}
