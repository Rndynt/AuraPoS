import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useTables, useOpenOrders } from "@/lib/api/tableHooks";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Search, X, ShoppingCart, Clock, Edit, ChevronDown, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table } from "@shared/schema";

const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "available":
      return "default";
    case "occupied":
      return "secondary";
    case "reserved":
      return "outline";
    case "maintenance":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "available":
      return "Available";
    case "occupied":
      return "Occupied";
    case "reserved":
      return "Reserved";
    case "maintenance":
      return "Maintenance";
    default:
      return status;
  }
};

function TableCard({ table, selected, onSelect }: { table: Table; selected: boolean; onSelect: () => void }) {
  const isDisabled = table.status === "maintenance";

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`relative w-full h-24 md:h-28 rounded-md border-2 bg-card flex flex-col items-center justify-center font-semibold transition cursor-pointer disabled:cursor-not-allowed hover-elevate ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      data-testid={`table-select-${table.tableNumber}`}
    >
      <Badge 
        variant={getStatusVariant(table.status)} 
        className="absolute top-1 right-1 text-xs"
      >
        {getStatusLabel(table.status)}
      </Badge>
      <div className="text-center space-y-1">
        <div className="text-base md:text-lg font-bold">{table.tableNumber}</div>
        {table.capacity && (
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Users className="w-4 h-4" />
            {table.capacity}
          </div>
        )}
      </div>
    </button>
  );
}

export default function TablesManagementPage() {
  const [, setLocation] = useLocation();
  const cart = useCart();
  const { toast } = useToast();
  const { data: tablesData, isLoading } = useTables();
  const { data: ordersData } = useOpenOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "reserved" | "occupied">("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const tables = tablesData?.tables || [];
  const orders = ordersData?.orders || [];

  const handleContinueOrder = async (order: any) => {
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        headers: {
          "x-tenant-id": localStorage.getItem("tenantId") || "demo-tenant",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      
      const json = await response.json();
      const fullOrder = json.data;
      
      const orderId = cart.loadOrder(fullOrder);
      toast({
        title: "Order loaded",
        description: `Order #${order.orderNumber} loaded into cart.`,
      });
      setLocation(`/pos?continueOrderId=${orderId}`);
    } catch (error) {
      console.error("Error loading order:", error);
      toast({
        title: "Error loading order",
        description: "Failed to load order into cart",
        variant: "destructive",
      });
    }
  };

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (table.tableName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      let matchesStatus = true;
      if (statusFilter === "reserved") matchesStatus = table.status === "reserved";
      if (statusFilter === "occupied") matchesStatus = table.status === "occupied";

      return matchesSearch && matchesStatus;
    });
  }, [tables, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: tables.length,
      reserved: tables.filter((t) => t.status === "reserved").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      available: tables.filter((t) => t.status === "available").length,
    };
  }, [tables]);

  const selectedTableData = tables.find((t) => t.id === selectedTable);
  
  const tableOrders = useMemo(() => {
    if (!selectedTableData) return [];
    return orders.filter((order) => order.tableNumber === selectedTableData.tableNumber && order.status !== "completed" && order.status !== "cancelled");
  }, [selectedTableData, orders]);

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(parseFloat(String(price)));
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          Loading tables...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header - Matches Orders Page */}
      <header className="border-b border-border bg-card px-4 md:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-semibold truncate" data-testid="heading-tables">
              Tables
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
              Manage and track your restaurant tables
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Badge variant="secondary">
              {statusCounts.available} Available
            </Badge>
            <Badge variant="secondary">
              {statusCounts.occupied} Occupied
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Tables Content Area */}
        <div className="flex-1 flex flex-col md:border-r border-border overflow-hidden">
          {/* Search & Filters */}
          <div className="px-4 md:px-6 py-3 border-b border-border flex-shrink-0 space-y-3">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-tables"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                data-testid="filter-all"
              >
                All ({statusCounts.all})
              </Button>
              <Button
                variant={statusFilter === "reserved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("reserved")}
                data-testid="filter-reserved"
              >
                Reserved ({statusCounts.reserved})
              </Button>
              <Button
                variant={statusFilter === "occupied" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("occupied")}
                data-testid="filter-occupied"
              >
                Occupied ({statusCounts.occupied})
              </Button>
            </div>
          </div>

          {/* Table Grid */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-4 md:p-6">
              {filteredTables.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredTables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      selected={selectedTable === table.id}
                      onSelect={() => setSelectedTable(table.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  No tables found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Table Details Sidebar - Matches Orders Page */}
        <div className="w-full md:w-96 bg-card flex flex-col border-t md:border-t-0 md:border-l overflow-hidden">
          {selectedTableData ? (
            <>
              <div className="p-4 md:p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Table Details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTable(null)}
                  data-testid="button-close-details"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 overflow-auto">
                <div className="p-4 md:p-6 space-y-6">
                  {/* Table Info */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Table Number</Label>
                      <p className="text-2xl font-bold">{selectedTableData.tableNumber}</p>
                    </div>
                    {selectedTableData.tableName && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Table Name</Label>
                        <p className="font-medium">{selectedTableData.tableName}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm text-muted-foreground">Capacity</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {selectedTableData.capacity} people
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant={getStatusVariant(selectedTableData.status)}>
                          {getStatusLabel(selectedTableData.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Active Orders */}
                  {tableOrders.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Active Orders ({tableOrders.length})
                      </h3>
                      <div className="space-y-3">
                        {tableOrders.map((order) => (
                          <Card key={order.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm">Order #{order.orderNumber}</CardTitle>
                                  {order.customerName && (
                                    <p className="text-xs text-muted-foreground mt-1">{order.customerName}</p>
                                  )}
                                </div>
                                <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                                  {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                              {/* Order Items - Always show first 2 items */}
                              {order.orderItems && order.orderItems.length > 0 && (
                                <>
                                  <div className="space-y-2">
                                    {order.orderItems.slice(0, 2).map((item: any, idx: number) => (
                                      <div key={idx} className="flex gap-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm">{item.productName || item.product_name}</p>
                                          {(item.variantName || item.variant_name) && (
                                            <p className="text-xs text-muted-foreground">
                                              {item.variantName || item.variant_name}
                                            </p>
                                          )}
                                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {item.selectedOptions.map((opt: any, optIdx: number) => (
                                                <Badge key={optIdx} variant="outline" className="text-xs">
                                                  {opt.option_name || opt.optionName}
                                                </Badge>
                                              ))}
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between mt-1">
                                            <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Show remaining items if more than 2 */}
                                  {order.orderItems.length > 2 && (
                                    <>
                                      <button
                                        onClick={() => toggleOrderExpand(order.id)}
                                        className="w-full flex items-center justify-between text-sm text-muted-foreground hover-elevate p-2 rounded-md"
                                        data-testid={`button-toggle-order-${order.id}`}
                                      >
                                        <span>View {order.orderItems.length - 2} more items</span>
                                        <ChevronDown
                                          className={`w-4 h-4 transition-transform ${
                                            expandedOrders.has(order.id) ? "rotate-180" : ""
                                          }`}
                                        />
                                      </button>

                                      {/* Expanded Remaining Items */}
                                      {expandedOrders.has(order.id) && (
                                        <div className="space-y-2">
                                          {order.orderItems.slice(2).map((item: any, idx: number) => (
                                            <div key={idx + 2} className="flex gap-3 bg-muted/30 p-2 rounded-md">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{item.productName || item.product_name}</p>
                                                {(item.variantName || item.variant_name) && (
                                                  <p className="text-xs text-muted-foreground">
                                                    {item.variantName || item.variant_name}
                                                  </p>
                                                )}
                                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {item.selectedOptions.map((opt: any, optIdx: number) => (
                                                      <Badge key={optIdx} variant="outline" className="text-xs">
                                                        {opt.option_name || opt.optionName}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                )}
                                                <div className="flex items-center justify-between mt-1">
                                                  <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              )}

                              {/* Order Total */}
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="font-semibold">Total</span>
                                <span className="font-bold">{formatPrice(order.total)}</span>
                              </div>

                              {/* Continue Order Button */}
                              {order.paymentStatus !== "paid" && (
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleContinueOrder(order)}
                                  data-testid={`button-continue-order-${order.id}`}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Continue Order
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {tableOrders.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto opacity-50 mb-2" />
                      <p className="text-sm">No active orders for this table</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="p-4 md:p-6 border-t border-border flex-shrink-0 space-y-2">
                {selectedTableData.status === "available" && (
                  <Button className="w-full" data-testid="button-new-order">
                    <Clock className="w-4 h-4 mr-2" />
                    Start New Order
                  </Button>
                )}
                {selectedTableData.status === "occupied" && (
                  <Button variant="outline" className="w-full" data-testid="button-checkout-table">
                    Checkout & Payment
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground space-y-2">
                <Users className="w-16 h-16 mx-auto opacity-50" />
                <p>Select a table to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
