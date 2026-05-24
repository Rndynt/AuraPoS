import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChefHat, RefreshCcw, AlertCircle, Clock, CheckCircle,
  Loader2, WifiOff, Maximize2, Minimize2, Lock, Delete,
} from "lucide-react";
import { KitchenTicket } from "@/components/kitchen-display/KitchenTicket";
import { getActiveTenantId } from "@/lib/tenant";
import { queryClient as globalQueryClient } from "@/lib/queryClient";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useKitchenChannelReceiver } from "@/hooks/useKitchenChannel";
import type { KDSMessage } from "@/hooks/useKitchenChannel";
import {
  getLocalKitchenTickets,
  updateLocalKitchenTicketStatus,
  purgeServedKitchenTickets,
} from "@pos/offline";
import type { LocalKitchenTicket, KitchenTicketStatus } from "@pos/offline";
import type { Order } from "@pos/domain/orders/types";

const ACTIVE_STATUSES = ["confirmed", "preparing", "ready"] as const;
const AUTO_REFRESH_INTERVAL = 20_000;
const KDS_PIN_KEY = "kds_pin";
const KDS_UNLOCKED_KEY = "kds_unlocked_until";
const UNLOCK_DURATION_MS = 8 * 60 * 60 * 1000;

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

function isUnlocked(): boolean {
  const until = localStorage.getItem(KDS_UNLOCKED_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

function setUnlocked() {
  localStorage.setItem(KDS_UNLOCKED_KEY, String(Date.now() + UNLOCK_DURATION_MS));
}

function getStoredPin(): string | null {
  return localStorage.getItem(KDS_PIN_KEY);
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState("");
  const storedPin = getStoredPin();

  const submit = (pin: string) => {
    if (!storedPin) {
      setHint("PIN belum diatur. Hubungi kasir untuk mengatur PIN dari halaman Kitchen Display.");
      return;
    }
    if (pin === storedPin) {
      setUnlocked();
      onUnlock();
    } else {
      setShake(true);
      setInput("");
      setHint("PIN salah, coba lagi.");
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleKey = (k: string) => {
    if (input.length >= 6) return;
    const next = input + k;
    setInput(next);
    setHint("");
    if (next.length === (storedPin?.length ?? 4)) {
      setTimeout(() => submit(next), 100);
    }
  };

  const handleDelete = () => setInput((p) => p.slice(0, -1));

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-8 select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <ChefHat size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Kitchen Display</h1>
        <p className="text-slate-400 text-sm">Masukkan PIN untuk membuka akses dapur</p>
      </div>

      <div className={`flex gap-3 transition-transform ${shake ? "animate-[wiggle_0.5s_ease-in-out]" : ""}`}
        style={shake ? { animation: "wiggle 0.5s ease-in-out" } : {}}>
        {Array.from({ length: storedPin?.length ?? 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < input.length
                ? "bg-orange-400 border-orange-400 scale-110"
                : "bg-transparent border-slate-600"
            }`}
          />
        ))}
      </div>

      {hint && (
        <p className="text-sm text-red-400 font-semibold -mt-4">{hint}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "⌫") return (
            <button
              key={i}
              onClick={handleDelete}
              className="w-20 h-20 rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all flex items-center justify-center text-slate-300"
              data-testid="kds-pin-delete"
            >
              <Delete size={22} />
            </button>
          );
          return (
            <button
              key={i}
              onClick={() => handleKey(k)}
              className="w-20 h-20 rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all text-2xl font-bold text-white"
              data-testid={`kds-pin-key-${k}`}
            >
              {k}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
        <Lock size={11} /> Sesi otomatis terkunci setelah 8 jam
      </p>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
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

export default function KDSPage() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const now = useClock();
  const tenantId = getActiveTenantId();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hasPinSet, setHasPinSet] = useState(() => !!getStoredPin());
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    const until = localStorage.getItem(KDS_UNLOCKED_KEY);
    if (!until) return;
    const remaining = parseInt(until, 10) - Date.now();
    if (remaining <= 0) { setUnlocked(false); return; }
    lockTimerRef.current = setTimeout(() => setUnlocked(false), remaining);
    return () => { if (lockTimerRef.current) clearTimeout(lockTimerRef.current); };
  }, [unlocked]);

  const { data: ordersData, isLoading, error, refetch } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await fetch(`/api/orders?tenantId=${tenantId}`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const json = await res.json();
      return json.data ?? json;
    },
    refetchInterval: AUTO_REFRESH_INTERVAL,
    enabled: isOnline && unlocked,
  });

  const serverOrders: Order[] = ordersData?.orders ?? [];
  const serverActiveOrders = serverOrders.filter((o) =>
    (ACTIVE_STATUSES as readonly string[]).includes(o.status)
  );

  const { data: localTickets = [], refetch: refetchLocal } = useQuery<LocalKitchenTicket[]>({
    queryKey: ["local-kitchen-tickets", tenantId],
    queryFn: () => getLocalKitchenTickets(tenantId, ["confirmed", "preparing", "ready"]),
    refetchInterval: 5_000,
    enabled: unlocked,
  });

  const handleKDSMessage = useCallback(
    (msg: KDSMessage) => {
      if (msg.type === "ticket_added" || msg.type === "status_updated" || msg.type === "ticket_removed") {
        queryClient.invalidateQueries({ queryKey: ["local-kitchen-tickets", tenantId] });
      }
    },
    [queryClient, tenantId]
  );
  useKitchenChannelReceiver(handleKDSMessage);

  useEffect(() => {
    if (!isOnline || !unlocked) return;
    const es = new EventSource("/api/orders/queue/stream");
    const onUpdate = () => {
      globalQueryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    };
    es.addEventListener("order_queue_updated", onUpdate as EventListener);
    return () => { es.removeEventListener("order_queue_updated", onUpdate as EventListener); es.close(); };
  }, [isOnline, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    purgeServedKitchenTickets(tenantId, 120).catch(() => {});
    const interval = setInterval(() => {
      purgeServedKitchenTickets(tenantId, 120).catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(interval);
  }, [tenantId, unlocked]);

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

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchLocal()]);
    setLastRefresh(new Date());
  };

  const handleUpdateServerStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status?mode=kitchen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Gagal update status");
      await refetch();
      setLastRefresh(new Date());
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLocalStatus = async (ticketId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateLocalKitchenTicketStatus(ticketId, newStatus as KitchenTicketStatus);
      await refetchLocal();
      setLastRefresh(new Date());
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

  if (!hasPinSet && !unlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
          <ChefHat size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white mb-2">Kitchen Display</h1>
          <p className="text-slate-400 text-sm max-w-sm">
            PIN belum diatur. Buka halaman <strong className="text-white">Kitchen Display</strong> di aplikasi kasir,
            atur PIN, lalu kembali ke halaman ini.
          </p>
        </div>
        <button
          onClick={() => { setHasPinSet(!!getStoredPin()); }}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
        >
          Cek Ulang
        </button>
      </div>
    );
  }

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

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
            <h1 className="text-base font-black text-white leading-none">Kitchen Display</h1>
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
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            data-testid="kds-button-fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={() => {
              localStorage.removeItem(KDS_UNLOCKED_KEY);
              setUnlocked(false);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
            title="Kunci layar"
            data-testid="kds-button-lock"
          >
            <Lock size={15} />
          </button>
        </div>
      </header>

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
