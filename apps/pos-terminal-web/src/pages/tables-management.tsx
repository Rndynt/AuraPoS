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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "border-green-500 bg-green-50 dark:bg-green-950/20";
    case "occupied":
      return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
    case "reserved":
      return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    case "maintenance":
      return "border-gray-400 bg-gray-100 dark:bg-gray-800";
    default:
      return "border-gray-300 bg-gray-50 dark:bg-gray-900";
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
      className={`relative w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center font-bold transition cursor-pointer disabled:cursor-not-allowed hover:shadow-md ${getStatusColor(table.status)} ${
        selected ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg" : ""
      }`}
      data-testid={`table-select-${table.tableNumber}`}
    >
      <div className="text-center space-y-0.5">
        <div className="text-lg sm:text-2xl font-bold">{table.tableNumber}</div>
        <div className="text-[10px] sm:text-xs opacity-75">
          {table.status === "occupied" && "Occupied"}
          {table.status === "reserved" && "Reserved"}
          {table.status === "available" && "Free"}
          {table.status === "maintenance" && "Maint."}
        </div>
        {table.capacity && <div className="text-[9px] sm:text-xs opacity-60">{table.capacity}p</div>}
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
  const [showDetailsMobile, setShowDetailsMobile] = useState(false);

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
      reserved: tables.filter((t) => t.status === "reserved").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      free: tables.filter((t) => t.status === "available").length,
    };
  }, [tables]);

  const selectedTableData = tables.find((t) => t.id === selectedTable);
  
  const tableOrders = useMemo(() => {
    if (!selectedTableData) return [];
    return orders.filter((order) => order.tableNumber === selectedTableData.tableNumber && order.status !== "completed" && order.status !== "cancelled");
  }, [selectedTableData, orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-muted-foreground" />
          <p className="text-xs sm:text-sm text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  // Table Details Component
  const TableDetailsContent = () => {
    if (!selectedTableData) return null;
    
    return (
      <div className="space-y-3">
        {/* Table Header - Compact on mobile */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-lg">
          <div className="text-2xl sm:text-3xl font-bold">{selectedTableData.tableNumber}</div>
          <p className="text-blue-100 text-xs sm:text-sm">{selectedTableData.tableName}</p>
          <p className="text-blue-100 text-xs sm:text-sm">Capacity: {selectedTableData.capacity} persons</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusBadgeColor(selectedTableData.status)} text-white text-xs`}>
            {getStatusLabel(selectedTableData.status)}
          </Badge>
        </div>

        {/* Open Orders */}
        {tableOrders.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <ShoppingCart className="w-4 h-4" />
              Open Orders ({tableOrders.length})
            </div>
            <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
              {tableOrders.map((order) => (
                <div key={order.id} className="bg-card border border-border p-2 sm:p-3 rounded-lg space-y-1.5 hover:shadow-md transition">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">Order #{order.orderNumber}</p>
                      <p className="text-sm sm:text-lg font-semibold text-foreground">Rp {parseFloat(order.total).toLocaleString("id-ID")}</p>
                      {order.customerName && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{order.customerName}</p>}
                    </div>
                    <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className="text-[10px] whitespace-nowrap">
                      {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  
                  {/* Order Items */}
                  {order.orderItems && order.orderItems.length > 0 && (
                    <div className="bg-muted p-1.5 sm:p-2 rounded text-[10px] sm:text-xs space-y-0.5 border border-muted-foreground/10">
                      {order.orderItems.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start gap-1">
                          <span className="text-muted-foreground font-medium truncate text-[10px] sm:text-xs">{item.productName || item.product_name}</span>
                          <span className="font-medium whitespace-nowrap text-[10px] sm:text-xs">×{item.quantity}</span>
                        </div>
                      ))}
                      {order.orderItems.length > 3 && (
                        <p className="text-[10px] text-muted-foreground italic pt-0.5">+{order.orderItems.length - 3} more</p>
                      )}
                    </div>
                  )}
                  
                  {order.paymentStatus !== "paid" && (
                    <Button
                      size="sm"
                      className="w-full text-[10px] sm:text-xs py-1 h-auto"
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
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 space-y-2 border-t">
          {selectedTableData.status === "occupied" && (
            <Button variant="outline" className="w-full text-xs sm:text-sm py-1 h-auto" data-testid="button-checkout-table">
              <Check className="w-3 h-3 mr-1" />
              Checkout & Payment
            </Button>
          )}
          {selectedTableData.status === "available" && (
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm py-1 h-auto" data-testid="button-new-order">
              <Clock className="w-3 h-3 mr-1" />
              New Order
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header - Compact & Sticky */}
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2 sm:px-4 sm:py-3 space-y-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tables</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">Manage your restaurant tables</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 text-xs sm:text-sm h-8 sm:h-9"
            data-testid="input-search-tables"
          />
        </div>

        {/* Filter Buttons - Compact */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
            className="whitespace-nowrap text-[10px] sm:text-xs py-1 h-7 sm:h-8"
          >
            All ({tables.length})
          </Button>
          <Button
            variant={statusFilter === "reserved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("reserved")}
            data-testid="filter-reserved"
            className="whitespace-nowrap text-[10px] sm:text-xs py-1 h-7 sm:h-8"
          >
            Reserved ({statusCounts.reserved})
          </Button>
          <Button
            variant={statusFilter === "occupied" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("occupied")}
            data-testid="filter-occupied"
            className="whitespace-nowrap text-[10px] sm:text-xs py-1 h-7 sm:h-8"
          >
            Occupied ({statusCounts.occupied})
          </Button>
        </div>

        {/* Status Summary - Compact */}
        <div className="flex gap-1 text-[10px] sm:text-xs overflow-x-auto pb-0.5 scrollbar-hide">
          <div className="flex items-center gap-1 px-1.5 py-1 bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-200 rounded whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>Free: {statusCounts.free}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-1 bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 rounded whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span>Reserved: {statusCounts.reserved}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-1 bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 rounded whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Occupied: {statusCounts.occupied}</span>
          </div>
        </div>
      </div>

      {/* Table Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {filteredTables.length > 0 ? (
          <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 auto-rows-fr">
              {filteredTables.map((table) => (
                <div key={table.id} className="min-h-20 sm:min-h-24">
                  <TableCard
                    table={table}
                    selected={selectedTable === table.id}
                    onSelect={() => {
                      setSelectedTable(table.id);
                      setShowDetailsMobile(true);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48">
            <div className="text-center space-y-2">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">No tables found</p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-96 lg:border-l lg:bg-background lg:overflow-y-auto">
        {selectedTableData ? (
          <div className="w-full p-4">
            <TableDetailsContent />
          </div>
        ) : (
          <div className="w-full p-4 text-center text-muted-foreground">
            <p className="text-sm">Select a table to view details</p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      <Sheet open={showDetailsMobile} onOpenChange={setShowDetailsMobile}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-3 py-3 sm:px-4 sm:py-4">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-base sm:text-lg">Table Details</SheetTitle>
          </SheetHeader>
          <div className="pb-4">
            <TableDetailsContent />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
