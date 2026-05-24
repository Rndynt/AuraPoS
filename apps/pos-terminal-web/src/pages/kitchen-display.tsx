import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ChefHat,
  ChevronLeft,
  RefreshCcw,
  AlertCircle,
  Clock,
  CheckCircle,
  Loader2,
  WifiOff,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOrders } from "@/lib/api/hooks";
import { KitchenTicket } from "@/components/kitchen-display/KitchenTicket";
import { useTenant } from "@/context/TenantContext";
import { useFeatures } from "@/hooks/useFeatures";
import type { Order } from "@pos/domain/orders/types";
import { getActiveTenantId } from "@/lib/tenant";
import { queryClient as globalQueryClient } from "@/lib/queryClient";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useKitchenChannelReceiver } from "@/hooks/useKitchenChannel";
import type { KDSMessage } from "@/hooks/useKitchenChannel";
import {
  getLocalKitchenTickets,
  updateLocalKitchenTicketStatus,
  deleteLocalKitchenTicket,
  purgeServedKitchenTickets,
} from "@pos/offline";
import type { LocalKitchenTicket, KitchenTicketStatus } from "@pos/offline";

const ACTIVE_STATUSES = ["confirmed", "preparing", "ready"] as const;
const AUTO_REFRESH_INTERVAL = 20_000;

// ─── Convert local ticket → minimal Order shape for KitchenTicket component ──

function localTicketToOrder(ticket: LocalKitchenTicket): Order {
  return {
    id: ticket.id,
    order_number: ticket.orderNumber,
    status: ticket.status,
    payment_status: "unpaid",
    customer_name: ticket.customerName ?? null,
    table_number: ticket.tableNumber ?? null,
    order_type_name: ticket.orderTypeName ?? null,
    items: ticket.items.map((item, idx) => ({
      id: `${ticket.id}-${idx}`,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: 0,
      total_price: 0,
      variant_name: item.variantName ?? null,
      modifiers: [],
    })),
    subtotal: 0,
    tax: 0,
    service_charge: 0,
    total: 0,
    payments: [],
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
  } as unknown as Order;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function KitchenDisplayPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { hasModule } = useTenant();
  const { hasFeature } = useFeatures();
  const queryClient = useQueryClient();
  const isEnabled = hasModule("enable_kitchen_ticket");
  const isOrderQueueEnabled = hasFeature("order_queue");
  const { isOnline } = useNetworkStatus();

  const [isUpdating, setIsUpdating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Server orders (online) ────────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useOrders(undefined, {
    refetchInterval: isOrderQueueEnabled ? 5000 : AUTO_REFRESH_INTERVAL,
    enabled: isOnline,
  });
  const serverOrders: Order[] = data?.orders ?? [];
  const serverActiveOrders = serverOrders.filter((o) =>
    (ACTIVE_STATUSES as readonly string[]).includes(o.status)
  );

  // ── Local kitchen tickets (offline + same-device local orders) ─────────────
  const tenantId = getActiveTenantId();

  const { data: localTickets = [], refetch: refetchLocal } = useQuery<LocalKitchenTicket[]>({
    queryKey: ["local-kitchen-tickets", tenantId],
    queryFn: () => getLocalKitchenTickets(tenantId, ["confirmed", "preparing", "ready"]),
    refetchInterval: 5_000,
  });

  // ── BroadcastChannel — instant updates when POS sends a new offline ticket ─
  const handleKDSMessage = useCallback(
    (msg: KDSMessage) => {
      if (msg.type === "ticket_added" || msg.type === "status_updated" || msg.type === "ticket_removed") {
        queryClient.invalidateQueries({ queryKey: ["local-kitchen-tickets", tenantId] });
      }
    },
    [queryClient, tenantId]
  );
  useKitchenChannelReceiver(handleKDSMessage);

  // ── EventSource for server order queue (when online) ──────────────────────
  useEffect(() => {
    if (!isOrderQueueEnabled || !isOnline) return;
    const es = new EventSource("/api/orders/queue/stream", { withCredentials: true });
    const onUpdate = () => {
      globalQueryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    };
    es.addEventListener("order_queue_updated", onUpdate as EventListener);
    return () => {
      es.removeEventListener("order_queue_updated", onUpdate as EventListener);
      es.close();
    };
  }, [isOrderQueueEnabled, isOnline]);

  // ── Purge old served tickets periodically ────────────────────────────────
  useEffect(() => {
    purgeServedKitchenTickets(tenantId, 120).catch(() => {});
    const interval = setInterval(() => {
      purgeServedKitchenTickets(tenantId, 120).catch(() => {});
    }, 5 * 60_000); // every 5 min
    return () => clearInterval(interval);
  }, [tenantId]);

  // ── Merge: local tickets only shown if no matching server order exists ─────
  // A local ticket is "superseded" once its serverOrderId appears in server orders.
  const serverOrderIds = new Set(serverActiveOrders.map((o) => o.id));
  const unseenLocalTickets = localTickets.filter(
    (t) => !t.serverOrderId || !serverOrderIds.has(t.serverOrderId)
  );

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchLocal()]);
    setLastRefresh(new Date());
  };

  // ── Server status update ──────────────────────────────────────────────────
  const handleUpdateServerStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status?mode=kitchen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal update status");
      const labels: Record<string, string> = {
        preparing: "Sedang Diproses",
        ready: "Siap Saji",
        served: "Sudah Disajikan",
      };
      toast({ title: "Status diperbarui", description: labels[newStatus] ?? newStatus });
      await refetch();
      setLastRefresh(new Date());
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat memperbarui status order", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Local status update ───────────────────────────────────────────────────
  const handleUpdateLocalStatus = async (ticketId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const s = newStatus as KitchenTicketStatus;
      await updateLocalKitchenTicketStatus(ticketId, s);
      if (s === "served") {
        // Keep ticket around briefly for KDS UX, then let purge handle it
      }
      await refetchLocal();
      setLastRefresh(new Date());
      const labels: Record<string, string> = {
        preparing: "Sedang Diproses",
        ready: "Siap Saji",
        served: "Sudah Disajikan",
      };
      toast({ title: "Status lokal diperbarui", description: labels[newStatus] ?? newStatus });
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat memperbarui status lokal", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Combined update handler ───────────────────────────────────────────────
  // The KitchenTicket component calls onUpdateStatus(orderId, newStatus).
  // We use a prefix to tell local vs server: local IDs are nanoid (not UUIDs).
  // We track which IDs are local via a Set.
  const localTicketIds = new Set(unseenLocalTickets.map((t) => t.id));
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (localTicketIds.has(orderId)) {
      await handleUpdateLocalStatus(orderId, newStatus);
    } else {
      await handleUpdateServerStatus(orderId, newStatus);
    }
  };

  // ── Build combined active order list ──────────────────────────────────────
  const localAsOrders = unseenLocalTickets.map(localTicketToOrder);
  const allActiveOrders: Order[] = [...serverActiveOrders, ...localAsOrders];

  const counts = {
    confirmed: allActiveOrders.filter((o) => o.status === "confirmed").length,
    preparing: allActiveOrders.filter((o) => o.status === "preparing").length,
    ready:     allActiveOrders.filter((o) => o.status === "ready").length,
  };

  // ── Feature gate ──────────────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100">
            <AlertCircle size={32} className="text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Kitchen Display Tidak Aktif</h1>
          <p className="text-slate-500">
            Fitur ini belum diaktifkan. Hubungi administrator untuk mengaktifkan Kitchen Display.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="mt-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors"
          >
            Kembali ke POS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">

      {/* ── Offline banner ──────────────────────────────────────────────────── */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2">
          <WifiOff size={13} />
          Mode offline — menampilkan {unseenLocalTickets.length} tiket lokal.
          Tiket dari terminal lain tidak tampil saat offline.
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            data-testid="button-back"
            title="Kembali ke POS"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 leading-none">Kitchen Display</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {allActiveOrders.length} antrian aktif
                {unseenLocalTickets.length > 0 && (
                  <span className="ml-1 text-amber-600 font-semibold">
                    ({unseenLocalTickets.length} lokal)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Status summary chips */}
        <div className="hidden md:flex items-center gap-2">
          <StatusChip color="orange" label="Menunggu" count={counts.confirmed} />
          <StatusChip color="yellow" label="Diproses"  count={counts.preparing} />
          <StatusChip color="green"  label="Siap Saji" count={counts.ready} />
        </div>

        {/* Refresh */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} />
            {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            data-testid="button-refresh"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            Refresh
          </button>
        </div>
      </header>

      {/* ── Mobile status legend ────────────────────────────────────────────── */}
      <div className="md:hidden bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-3">
        <StatusChip color="orange" label="Menunggu" count={counts.confirmed} />
        <StatusChip color="yellow" label="Diproses"  count={counts.preparing} />
        <StatusChip color="green"  label="Siap Saji" count={counts.ready} />
      </div>

      {/* ── Ticket Grid ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-5">
        {isLoading && allActiveOrders.length === 0 ? (
          <LoadingState />
        ) : error && isOnline ? (
          <ErrorState onRetry={handleRefresh} />
        ) : allActiveOrders.length === 0 ? (
          <EmptyState isOffline={!isOnline} />
        ) : (
          <>
            {(["confirmed", "preparing", "ready"] as const).map((status) => {
              const group = allActiveOrders.filter((o) => o.status === status);
              if (group.length === 0) return null;
              const sectionLabel = {
                confirmed: "🟠 Menunggu",
                preparing: "🟡 Sedang Diproses",
                ready:     "🟢 Siap Saji",
              }[status];
              return (
                <section key={status} className="mb-6">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-0.5">
                    {sectionLabel}{" "}
                    <span className="font-bold text-slate-400 normal-case tracking-normal">({group.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {group.map((order) => (
                      <div key={order.id} className="relative">
                        {localTicketIds.has(order.id) && (
                          <div className="absolute -top-1.5 left-3 z-10">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow">
                              <WifiOff size={9} /> LOKAL
                            </span>
                          </div>
                        )}
                        <KitchenTicket
                          order={order}
                          onUpdateStatus={handleUpdateStatus}
                          isLoading={isUpdating}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusChip({ color, label, count }: { color: "orange" | "yellow" | "green"; label: string; count: number }) {
  const colorMap = {
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    green:  "bg-green-50 text-green-700 border-green-200",
  };
  const dotMap = { orange: "bg-orange-500", yellow: "bg-yellow-400", green: "bg-green-500" };
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${colorMap[color]}`}>
      <span className={`w-2 h-2 rounded-full ${dotMap[color]}`} />
      {label}
      <span className="font-black">{count}</span>
    </span>
  );
}

function LoadingState() {
  return (
    <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 size={40} className="animate-spin opacity-40" />
      <p className="text-sm font-medium">Memuat antrian pesanan…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-400">
      <AlertCircle size={40} className="opacity-40" />
      <p className="text-sm font-medium">Gagal memuat data server</p>
      <button onClick={onRetry} className="text-sm font-bold text-blue-600 hover:underline">Coba lagi</button>
    </div>
  );
}

function EmptyState({ isOffline }: { isOffline: boolean }) {
  return (
    <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-400">
      <CheckCircle size={48} className="opacity-20 text-green-500" />
      <h3 className="text-lg font-bold text-slate-500">
        {isOffline ? "Tidak ada tiket lokal" : "Semua Selesai!"}
      </h3>
      <p className="text-sm">
        {isOffline
          ? "Tiket lokal akan muncul saat POS membuat order offline di perangkat ini."
          : "Tidak ada pesanan aktif di dapur saat ini."}
      </p>
    </div>
  );
}
