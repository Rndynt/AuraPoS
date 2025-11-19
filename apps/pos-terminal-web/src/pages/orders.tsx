import { useState } from "react";
import { useOrders } from "@/lib/api/hooks";
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
import type { Order } from "@/../../packages/domain/orders/types";

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

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading } = useOrders(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  const orders = data?.orders || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusCounts = () => {
    const allOrders = data?.orders || [];
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
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No orders found
                </div>
              ) : (
                orders.map((order) => {
                  const statusConfig = ORDER_STATUS_CONFIG[order.status];
                  const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card
                      key={order.id}
                      className={`cursor-pointer hover-elevate ${
                        selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedOrder(order)}
                      data-testid={`order-card-${order.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">
                              {order.customer_name || "Walk-in Customer"}
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
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
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
                  onClick={() => setSelectedOrder(null)}
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
                        {selectedOrder.customer_name || "Walk-in Customer"}
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
                      {selectedOrder.items.map((item, idx) => (
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
                      ))}
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
