/**
 * Kitchen Display System (KDS) — Standalone Page
 * Auth: API key stored in localStorage (paired via 4-digit activation code from /kitchen)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChefHat, RefreshCcw, AlertCircle, Clock, CheckCircle,
  Loader2, WifiOff, Maximize2, Minimize2, LogOut,
  Volume2, VolumeX,
} from "lucide-react";
import { useKDSSound } from "@/hooks/useKDSSound";
import { KitchenTicket } from "@/components/kitchen-display/KitchenTicket";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useKitchenChannelReceiver } from "@/hooks/useKitchenChannel";
import type { KDSMessage } from "@/hooks/useKitchenChannel";
import { useToast } from "@/hooks/use-toast";
import {
  getLocalKitchenTickets,
  updateLocalKitchenTicketStatus,
  purgeServedKitchenTickets,
} from "@pos/offline";
import type { LocalKitchenTicket, KitchenTicketStatus } from "@pos/offline";
import type { Order } from "@pos/domain/orders/types";

// ── Normalize server response (camelCase) → domain Order type (snake_case) ────
function normalizeServerOrder(raw: any): Order {
  const items = (raw.items ?? []).map((item: any) => ({
    id: item.id,
    product_id: item.productId ?? item.product_id ?? '',
    product_name: item.productName ?? item.product_name ?? '(tanpa nama)',
    base_price: Number(item.unitPrice ?? item.base_price ?? 0),
    quantity: item.quantity ?? 1,
    item_subtotal: Number(item.itemSubtotal ?? item.item_subtotal ?? 0),
    variant_name: item.variantName ?? item.variant_name ?? null,
    selected_options: item.selected_options ?? item.selectedOptions ?? [],
    notes: item.notes ?? null,
    status: item.status ?? 'pending',
  }));

  return {
    id: raw.id,
    tenant_id: raw.tenantId ?? raw.tenant_id,
    order_number: raw.orderNumber ?? raw.order_number ?? raw.id,
    status: raw.status,
    payment_status: raw.paymentStatus ?? raw.payment_status ?? 'unpaid',
    customer_name: raw.customerName ?? raw.customer_name ?? null,
    table_number: raw.tableNumber ?? raw.table_number ?? null,
    order_type_name: raw.orderTypeName ?? raw.order_type_name ?? null,
    items,
    subtotal: Number(raw.subtotal ?? 0),
    tax_amount: Number(raw.taxAmount ?? raw.tax_amount ?? 0),
    service_charge_amount: Number(raw.serviceChargeAmount ?? raw.service_charge_amount ?? 0),
    discount_amount: Number(raw.discountAmount ?? raw.discount_amount ?? 0),
    total_amount: Number(raw.totalAmount ?? raw.total_amount ?? 0),
    paid_amount: Number(raw.paidAmount ?? raw.paid_amount ?? 0),
    notes: raw.notes ?? null,
    created_at: raw.createdAt ?? raw.created_at,
    updated_at: raw.updatedAt ?? raw.updated_at ?? null,
  } as Order;
}

// ── localStorage keys ─────────────────────────────────────────────────────────
const KDS_DEVICE_KEY  = "kds_device_key";
const KDS_DEVICE_NAME = "kds_device_name";
const KDS_TENANT_ID   = "kds_tenant_id";

const ACTIVE_STATUSES = ["confirmed", "preparing", "ready"] as const;
const AUTO_REFRESH_INTERVAL = 20_000;

// ── Helpers ───────────────────────────────────────────────────────────────────
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
    subtotal: 0, tax: 0, service_charge: 0, total: 0,
    payments: [],
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
  } as unknown as Order;
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
  return { isFullscreen, toggle };
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function StatusChip({ color, label, count }: { color: "orange" | "yellow" | "green"; label: string; count: number }) {
  const colorMap = {
    orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    green:  "bg-green-500/20 text-green-300 border-green-500/30",
  };
  const dotMap = { orange: "bg-orange-400", yellow: "bg-yellow-400", green: "bg-green-400" };
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${colorMap[color]}`}>
      <span className={`w-2 h-2 rounded-full ${dotMap[color]}`} />
      {label}
      <span className="font-black">{count}</span>
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function KDSPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const now = useClock();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { play, isMuted, toggleMute, unlock: unlockAudio } = useKDSSound();
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  // Read device credentials from localStorage
  const apiKey     = localStorage.getItem(KDS_DEVICE_KEY) ?? "";
  const deviceName = localStorage.getItem(KDS_DEVICE_NAME) ?? "KDS";
  const tenantId   = localStorage.getItem(KDS_TENANT_ID) ?? "";

  // ── Redirect to activation if no key ──────────────────────────────────────
  useEffect(() => {
    if (!apiKey) {
      setLocation("/kds/activate");
    } else {
      // Unlock audio context on first render (browser autoplay policy)
      unlockAudio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deactivate = () => {
    localStorage.removeItem(KDS_DEVICE_KEY);
    localStorage.removeItem(KDS_DEVICE_NAME);
    localStorage.removeItem(KDS_TENANT_ID);
    localStorage.removeItem("kds_device_id");
    setLocation("/kds/activate");
  };

  // ── Server orders query ───────────────────────────────────────────────────
  const { data: ordersData, isLoading, error, refetch } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/kds/orders", apiKey],
    queryFn: async () => {
      const res = await fetch("/api/kds/orders", {
        headers: { "x-kds-key": apiKey },
      });
      if (res.status === 401) {
        // API key revoked or invalid — deactivate
        deactivate();
        throw new Error("KDS session expired");
      }
      if (!res.ok) throw new Error("Failed to fetch orders");
      const json = await res.json();
      return json.data ?? json;
    },
    refetchInterval: AUTO_REFRESH_INTERVAL,
    enabled: isOnline && !!apiKey,
  });

  const serverOrders: Order[] = (ordersData?.orders ?? []).map(normalizeServerOrder);
  const serverActiveOrders = serverOrders.filter((o) =>
    (ACTIVE_STATUSES as readonly string[]).includes(o.status)
  );

  // ── Local offline tickets ─────────────────────────────────────────────────
  const { data: localTickets = [], refetch: refetchLocal } = useQuery<LocalKitchenTicket[]>({
    queryKey: ["local-kitchen-tickets", tenantId],
    queryFn: () => getLocalKitchenTickets(tenantId, ["confirmed", "preparing", "ready"]),
    refetchInterval: 5_000,
    enabled: !!tenantId,
  });

  // ── BroadcastChannel from POS ─────────────────────────────────────────────
  const handleKDSMessage = useCallback(
    (msg: KDSMessage) => {
      if (msg.type === "ticket_added") {
        queryClient.invalidateQueries({ queryKey: ["local-kitchen-tickets", tenantId] });
        play("new_ticket");
      } else if (msg.type === "status_updated" || msg.type === "ticket_removed") {
        queryClient.invalidateQueries({ queryKey: ["local-kitchen-tickets", tenantId] });
      }
    },
    [queryClient, tenantId, play]
  );
  useKitchenChannelReceiver(handleKDSMessage);

  // ── Purge old served tickets ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    purgeServedKitchenTickets(tenantId, 120).catch(() => {});
    const interval = setInterval(() => {
      purgeServedKitchenTickets(tenantId, 120).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(interval);
  }, [tenantId]);

  // ── Sound on new orders ───────────────────────────────────────────────────
  const serverOrderIds = new Set(serverActiveOrders.map((o) => o.id));
  const unseenLocalTickets = localTickets.filter(
    (t) => !t.serverOrderId || !serverOrderIds.has(t.serverOrderId)
  );
  const localAsOrders = unseenLocalTickets.map(localTicketToOrder);
  const allActiveOrders: Order[] = [...serverActiveOrders, ...localAsOrders];
  const localTicketIds = new Set(unseenLocalTickets.map((t) => t.id));

  const counts = {
    confirmed: allActiveOrders.filter((o) => o.status === "confirmed").length,
    preparing: allActiveOrders.filter((o) => o.status === "preparing").length,
    ready:     allActiveOrders.filter((o) => o.status === "ready").length,
  };

  const allActiveOrderIdKey = allActiveOrders.map((o) => o.id).join(",");
  useEffect(() => {
    if (!apiKey) return;
    const currentIds = new Set(allActiveOrders.map((o) => o.id));
    const prev = prevOrderIdsRef.current;
    if (prev.size > 0) {
      const newIds = [...currentIds].filter((id) => !prev.has(id));
      if (newIds.length > 0) play("new_ticket");
    }
    prevOrderIdsRef.current = currentIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allActiveOrderIdKey]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchLocal()]);
    setLastRefresh(new Date());
  };

  const STATUS_LABELS: Record<string, string> = {
    preparing: "Sedang Diproses",
    ready: "Siap Saji",
    served: "Sudah Disajikan",
  };

  const handleUpdateServerStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/kds/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-kds-key": apiKey },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) { deactivate(); return; }
      if (!res.ok) throw new Error("Gagal update status");
      toast({ title: "Status diperbarui", description: STATUS_LABELS[newStatus] ?? newStatus });
      await refetch();
      setLastRefresh(new Date());
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat memperbarui status order", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLocalStatus = async (ticketId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateLocalKitchenTicketStatus(ticketId, newStatus as KitchenTicketStatus);
      toast({ title: "Status lokal diperbarui", description: STATUS_LABELS[newStatus] ?? newStatus });
      await refetchLocal();
      setLastRefresh(new Date());
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat memperbarui status lokal", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (localTicketIds.has(orderId)) {
      await handleUpdateLocalStatus(orderId, newStatus);
    } else {
      await handleUpdateServerStatus(orderId, newStatus);
    }
  };

  // ── Guard: no API key ─────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-orange-400" />
        <p className="text-slate-400 text-sm">Mengarahkan ke halaman aktivasi…</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2">
          <WifiOff size={13} />
          Mode offline — menampilkan {unseenLocalTickets.length} tiket lokal.
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <ChefHat size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-none">
              {deviceName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {allActiveOrders.length} antrian aktif
              {unseenLocalTickets.length > 0 && (
                <span className="ml-1 text-amber-400 font-semibold">
                  · {unseenLocalTickets.length} lokal
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <StatusChip color="orange" label="Menunggu" count={counts.confirmed} />
            <StatusChip color="yellow" label="Diproses"  count={counts.preparing} />
            <StatusChip color="green"  label="Siap Saji" count={counts.ready} />
          </div>

          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-mono">
            <Clock size={11} />
            {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            data-testid="kds-button-refresh"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
            Refresh
          </button>

          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg transition-colors ${
              isMuted
                ? "bg-red-900/40 hover:bg-red-900/60 text-red-400"
                : "bg-slate-800 hover:bg-slate-700 text-slate-400"
            }`}
            title={isMuted ? "Aktifkan suara notifikasi" : "Matikan suara notifikasi"}
            data-testid="kds-button-mute"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            data-testid="kds-button-fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={deactivate}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
            title="Batalkan aktivasi perangkat ini"
            data-testid="kds-button-deactivate"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Mobile status row */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <StatusChip color="orange" label="Menunggu" count={counts.confirmed} />
        <StatusChip color="yellow" label="Diproses"  count={counts.preparing} />
        <StatusChip color="green"  label="Siap Saji" count={counts.ready} />
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-5">
        {isLoading && allActiveOrders.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 size={40} className="animate-spin opacity-40" />
            <p className="text-sm font-medium">Memuat antrian pesanan…</p>
          </div>
        ) : error && isOnline ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
            <AlertCircle size={40} className="opacity-40" />
            <p className="text-sm font-medium">Gagal memuat data</p>
            <button onClick={handleRefresh} className="text-sm font-bold text-orange-400 hover:underline">Coba lagi</button>
          </div>
        ) : allActiveOrders.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
            <CheckCircle size={48} className="opacity-20 text-green-400" />
            <h3 className="text-lg font-bold text-slate-400">
              {!isOnline ? "Tidak ada tiket lokal" : "Semua Selesai!"}
            </h3>
            <p className="text-sm text-slate-600">
              {!isOnline
                ? "Tiket lokal akan muncul saat POS membuat order offline."
                : "Tidak ada pesanan aktif di dapur saat ini."}
            </p>
          </div>
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
                    <span className="font-bold text-slate-600 normal-case tracking-normal">({group.length})</span>
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
