import { useMemo, useState } from "react";
import { useOrder, useOrders } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  ListFilter, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat 
} from "lucide-react";
import type { Order, OrderItem, SelectedOption } from "@pos/domain/orders/types";

const ORDER_STATUS_CONFIG = {
  draft: { label: "Draft", variant: "outline" as const, icon: Clock, color: "text-gray-600" },
  confirmed: { label: "Confirmed", variant: "secondary" as const, icon: Clock, color: "text-blue-600" },
  completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
};

const PAYMENT_STATUS_CONFIG = {
  paid: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  unpaid: { label: "Unpaid", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

type OrderStatusFilter = "all" | "draft" | "confirmed" | "completed" | "cancelled";

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
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading } = useOrders(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  const { data: selectedOrderResponse } = useOrder(selectedOrderId || undefined);

  const normalizedOrders = useMemo(
    () => (data?.orders || []).map((order) => normalizeOrder(order)),
    [data]
  );

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

  const getStatusCounts = () => {
    const allOrders = normalizedOrders;
    return {
      all: allOrders.length,
      draft: allOrders.filter((o) => o.status === "draft").length,
      confirmed: allOrders.filter((o) => o.status === "confirmed").length,
      completed: allOrders.filter((o) => o.status === "completed").length,
      cancelled: allOrders.filter((o) => o.status === "cancelled").length,
    };
  };

  const counts = getStatusCounts();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="heading-orders">
              Order List
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track all your orders
            </p>
          </div>
          <Button variant="outline" size="sm" data-testid="button-see-all">
            See All
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Orders List */}
        <div className="flex-1 flex flex-col border-r border-border">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ListFilter className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                data-testid="filter-all"
              >
                All ({counts.all})
              </Button>
              <Button
                variant={statusFilter === "confirmed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("confirmed")}
                data-testid="filter-confirmed"
              >
                Confirmed ({counts.confirmed})
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
                data-testid="filter-completed"
              >
                Completed ({counts.completed})
              </Button>
              <Button
                variant={statusFilter === "cancelled" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("cancelled")}
                data-testid="filter-cancelled"
              >
                Cancelled ({counts.cancelled})
              </Button>
            </div>
          </div>

          {/* Order Cards */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-3">
              {isLoading ? (
                <div className="text-center py-16 text-muted-foreground">
                  Loading orders...
                </div>
              ) : normalizedOrders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No orders found
                </div>
              ) : (
                normalizedOrders.map((order) => {
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
        <div className="w-96 bg-card flex flex-col">
          {selectedOrder ? (
            <>
              <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
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

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
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

              <div className="p-6 border-t border-border flex-shrink-0">
                <Button className="w-full" data-testid="button-process-transaction">
                  Proccess Transaction
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
    </div>
  );
}
