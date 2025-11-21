import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useTables, useOpenOrders } from "@/lib/api/tableHooks";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Check, ShoppingCart, Clock, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table } from "@shared/schema";

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "border-green-500 bg-green-50";
    case "occupied":
      return "border-orange-500 bg-orange-50";
    case "reserved":
      return "border-yellow-500 bg-yellow-50";
    case "maintenance":
      return "border-gray-400 bg-gray-100";
    default:
      return "border-gray-300 bg-gray-50";
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-500 hover:bg-green-600";
    case "occupied":
      return "bg-orange-500 hover:bg-orange-600";
    case "reserved":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "maintenance":
      return "bg-gray-400 cursor-not-allowed";
    default:
      return "bg-gray-300";
  }
};

interface SeatIndicatorProps {
  capacity: number;
  position: "top" | "right" | "bottom" | "left";
}

function SeatIndicator({ capacity, position }: SeatIndicatorProps) {
  const maxSeats = Math.min(capacity, 4);
  const seats = Array.from({ length: maxSeats }, (_, i) => i);

  const positionClasses = {
    top: "absolute -top-2 left-1/2 transform -translate-x-1/2 flex gap-1",
    right: "absolute -right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1",
    bottom: "absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1",
    left: "absolute -left-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1",
  };

  return (
    <div className={positionClasses[position]}>
      {seats.map((i) => (
        <div key={i} className="w-2 h-2 rounded-full bg-gray-400" />
      ))}
    </div>
  );
}

function TableCardNew({ table, selected, onSelect }: { table: Table; selected: boolean; onSelect: () => void }) {
  const isDisabled = table.status === "maintenance";

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`relative w-24 h-16 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition cursor-pointer disabled:cursor-not-allowed ${getStatusColor(table.status)} ${
        selected ? "ring-2 ring-offset-1 ring-blue-500" : ""
      }`}
      data-testid={`table-select-${table.tableNumber}`}
    >
      <div className="text-center">
        <div className="font-bold text-base">{table.tableNumber}</div>
        {table.status === "occupied" && <div className="text-xs text-orange-600">Checked-in</div>}
        {table.status === "reserved" && <div className="text-xs text-yellow-600">Reserved</div>}
        {table.status === "available" && <div className="text-xs text-green-600">Free</div>}
      </div>

      {/* Seat indicators */}
      <SeatIndicator capacity={table.capacity || 2} position="top" />
      <SeatIndicator capacity={table.capacity || 2} position="bottom" />
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

  const tables = tablesData?.tables || [];
  const orders = ordersData?.orders || [];

  const handleContinueOrder = async (order: any) => {
    try {
      // Fetch full order details with items from API
      const response = await fetch(`/api/orders/${order.id}`, {
        headers: {
          "x-tenant-id": localStorage.getItem("tenantId") || "demo-tenant",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      
      const json = await response.json();
      const fullOrder = json.data;
      
      // Load the full order (with items) into cart
      const orderId = cart.loadOrder(fullOrder);
      toast({
        title: "Order loaded",
        description: `Order #${order.orderNumber} loaded into cart. Continue editing and add more items if needed.`,
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
      reserved: tables.filter((t) => t.status === "reserved").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      free: tables.filter((t) => t.status === "available").length,
    };
  }, [tables]);

  const selectedTableData = tables.find((t) => t.id === selectedTable);
  
  // Get orders for selected table
  const tableOrders = useMemo(() => {
    if (!selectedTableData) return [];
    return orders.filter((order) => order.tableNumber === selectedTableData.tableNumber && order.status !== "completed" && order.status !== "cancelled");
  }, [selectedTableData, orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6 p-6">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Choose Tables</h1>
          <p className="text-sm text-muted-foreground">Select a table to manage reservations and check-ins</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-tables"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
          >
            All Tables
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
            Checked-in ({statusCounts.occupied})
          </Button>
        </div>

        {/* Status Legend */}
        <div className="flex gap-4 p-3 bg-muted rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50" />
            <span>Free: {statusCounts.free}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-50" />
            <span>Reserved: {statusCounts.reserved}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-orange-500 bg-orange-50" />
            <span>Checked-in: {statusCounts.occupied}</span>
          </div>
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-auto">
          {filteredTables.length > 0 ? (
            <div className="grid gap-6 p-4 bg-muted/30 rounded-lg auto-fit" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
              {filteredTables.map((table) => (
                <div key={table.id} className="flex justify-center">
                  <TableCardNew
                    table={table}
                    selected={selectedTable === table.id}
                    onSelect={() => setSelectedTable(table.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">No tables found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Guest Information */}
      <div className="w-80 border-l pl-6 py-4 flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-auto">
        {selectedTableData ? (
          <>
            <div>
              <h2 className="font-semibold text-lg">Table {selectedTableData.tableNumber}</h2>
              <p className="text-sm text-muted-foreground">{selectedTableData.tableName}</p>
              <p className="text-xs text-muted-foreground mt-1">Capacity: {selectedTableData.capacity} persons</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusBadgeColor(selectedTableData.status)} text-white`}>
                  {selectedTableData.status.charAt(0).toUpperCase() + selectedTableData.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Open Orders Section */}
            {tableOrders.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="w-4 h-4" />
                  Open Orders ({tableOrders.length})
                </div>
                {tableOrders.map((order) => (
                  <div key={order.id} className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Order #{order.orderNumber}</p>
                        <p className="text-sm font-semibold mt-1">Rp {parseFloat(order.total).toLocaleString("id-ID")}</p>
                        {order.customerName && <p className="text-xs text-muted-foreground">{order.customerName}</p>}
                      </div>
                      <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className="text-xs">
                        {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </Badge>
                    </div>
                    
                    {/* Order Items */}
                    {order.orderItems && order.orderItems.length > 0 && (
                      <div className="bg-background p-2 rounded text-xs space-y-1 border border-muted-foreground/10">
                        {order.orderItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-start gap-1">
                            <span className="text-muted-foreground">{item.productName}</span>
                            <span className="font-medium text-xs">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {order.paymentStatus !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleContinueOrder(order)}
                        data-testid={`button-continue-order-${order.id}`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Continue Order
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 space-y-3">
              {selectedTableData.status === "occupied" && (
                <Button variant="outline" className="w-full" size="sm" data-testid="button-checkout-table">
                  <Check className="w-4 h-4 mr-2" />
                  Check Out & Payment
                </Button>
              )}
              {selectedTableData.status === "available" && (
                <Button className="w-full bg-orange-500 hover:bg-orange-600" size="sm" data-testid="button-new-order">
                  <Clock className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              )}
              <Button variant="outline" className="w-full" size="sm" data-testid="button-view-details">
                View Details
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Select a table to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
