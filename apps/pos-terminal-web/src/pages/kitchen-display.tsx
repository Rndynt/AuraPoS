import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChefHat, ChevronLeft, RefreshCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrders } from "@/lib/api/hooks";
import { KitchenTicket } from "@/components/kitchen-display/KitchenTicket";
import { OrderQueue } from "@/components/kitchen-display/OrderQueue";
import { useTenant } from "@/context/TenantContext";
import type { Order } from "@pos/domain/orders/types";
import { getActiveTenantId } from "@/lib/tenant";

const formatIDR = (price: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(price));

export default function KitchenDisplayPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasModule } = useTenant();
  const isKitchenDisplayEnabled = hasModule("enable_kitchen_ticket");

  // If Kitchen Display is not enabled, show not available message
  if (!isKitchenDisplayEnabled) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100">
            <AlertCircle size={32} className="text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Kitchen Display Not Available
          </h1>
          <p className="text-slate-600">
            This feature is not enabled for your account. Please contact your administrator to enable Kitchen Display.
          </p>
          <Button
            onClick={() => setLocation("/")}
            variant="default"
            className="mt-4"
          >
            Go Back to POS
          </Button>
        </div>
      </div>
    );
  }
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all orders - will filter on client side
  const { data, isLoading, error, refetch } = useOrders();
  const orders = data?.orders || [];

  // Filter active orders for kitchen display
  const activeOrders = orders.filter((o: Order) =>
    ["confirmed", "preparing", "ready"].includes(o.status)
  );

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const tenantId = getActiveTenantId();
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update order status");
      }

      const statusLabel = {
        preparing: "Sedang disiapkan",
        ready: "Siap dihidangkan",
        completed: "Selesai",
      }[newStatus] || newStatus;

      toast({
        title: "Berhasil",
        description: `Order #${orderId} diubah ke ${statusLabel}`,
        variant: "default",
      });

      // Refetch orders
      await refetch();
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Gagal memperbarui status order",
        variant: "destructive",
      });
      console.error("Error updating order status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ChefHat className="text-orange-500" size={28} /> Kitchen Display
            </h1>
            <p className="text-sm text-slate-500">
              {activeOrders.length} Active Tickets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-refresh"
          >
            <RefreshCcw size={16} /> Refresh
          </Button>
        </div>
      </header>

      {/* Status Legend */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-6 text-sm font-bold text-slate-600">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500" /> Waiting
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" /> Preparing
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" /> Ready
        </span>
      </div>

      {/* Ticket Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <ChefHat size={64} className="mb-4 opacity-20 text-slate-400" />
            <p className="text-slate-400">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center">
            <ChefHat size={64} className="mb-4 opacity-20 text-slate-400" />
            <p className="text-slate-400">Error loading orders</p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <ChefHat size={64} className="mb-4 opacity-20" />
            <h3 className="text-xl font-bold">All Caught Up!</h3>
            <p>No active orders in the kitchen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map((order: Order) => (
              <KitchenTicket
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                isLoading={isUpdating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
