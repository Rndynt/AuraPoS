import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  Wallet,
  Package,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { useOrders } from "@/hooks/api/useOrders";
import { PageHeader, CustomSelect } from "@/components/design";
import { UnifiedBottomNav } from "@/components/navigation/UnifiedBottomNav";

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

const formatIDRCompact = (price: number) => {
  if (price >= 1_000_000) return `Rp ${(price / 1_000_000).toFixed(1)}jt`;
  if (price >= 1_000) return `Rp ${(price / 1_000).toFixed(0)}rb`;
  return formatIDR(price);
};

type PeriodLabel = "Hari Ini" | "Kemarin" | "Minggu Ini" | "Bulan Ini";
type ReportTab = "ringkasan" | "pembayaran" | "produk" | "tren";

function getPeriodRange(period: PeriodLabel): { startDate: Date; endDate: Date } {
  const now = new Date();

  if (period === "Hari Ini") {
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  if (period === "Kemarin") {
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  if (period === "Minggu Ini") {
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

function norm(o: any) {
  const items: any[] = o.items ?? o.order_items ?? [];
  return {
    id: o.id,
    orderNumber: o.orderNumber ?? o.order_number ?? "",
    customerName: o.customerName ?? o.customer_name ?? "",
    tableNumber: o.tableNumber ?? o.table_number ?? "",
    total: parseFloat(o.total ?? o.totalAmount ?? o.total_amount ?? 0),
    paidAmount: parseFloat(o.paidAmount ?? o.paid_amount ?? 0),
    paymentStatus: o.paymentStatus ?? o.payment_status ?? "unpaid",
    status: o.status ?? "",
    date: new Date(o.orderDate ?? o.createdAt ?? o.created_at ?? 0),
    items: items.map((it: any) => ({
      productName: it.productName ?? it.product_name ?? "",
      quantity: Number(it.quantity ?? 0),
      itemSubtotal: parseFloat(it.itemSubtotal ?? it.item_subtotal ?? 0),
    })),
    payments: o.payments ?? [],
  };
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  color?: "blue" | "green" | "amber" | "rose" | "slate";
}) {
  const palette = {
    blue: { bg: "bg-blue-50", icon: "text-blue-500", value: "text-blue-700" },
    green: { bg: "bg-emerald-50", icon: "text-emerald-500", value: "text-emerald-700" },
    amber: { bg: "bg-amber-50", icon: "text-amber-500", value: "text-amber-700" },
    rose: { bg: "bg-rose-50", icon: "text-rose-500", value: "text-rose-700" },
    slate: { bg: "bg-slate-100", icon: "text-slate-500", value: "text-slate-700" },
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
      {Icon && (
        <div className={`w-8 h-8 rounded-xl ${palette.bg} flex items-center justify-center`}>
          <Icon size={16} className={palette.icon} />
        </div>
      )}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-black mt-0.5 ${palette.value}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  amount,
  color,
}: {
  label: string;
  value: number;
  total: number;
  amount: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs">{value} transaksi</span>
          <span className="font-bold text-slate-800">{formatIDRCompact(amount)}</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-400">{pct}% dari total transaksi</p>
    </div>
  );
}

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: "ringkasan", label: "Ringkasan", icon: BarChart3 },
  { id: "pembayaran", label: "Pembayaran", icon: CreditCard },
  { id: "produk", label: "Produk Terlaris", icon: Package },
  { id: "tren", label: "Tren Jam", icon: TrendingUp },
];

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<PeriodLabel>("Hari Ini");
  const [activeTab, setActiveTab] = useState<ReportTab>("ringkasan");

  const { startDate, endDate } = useMemo(() => getPeriodRange(period), [period]);
  const { data: orderRes, isLoading } = useOrders({ startDate, endDate, limit: 1000 });

  const rawOrders: any[] = (orderRes as any)?.data?.orders ?? (orderRes as any)?.orders ?? [];
  const orders = useMemo(() => rawOrders.map(norm), [rawOrders]);

  const stats = useMemo(() => {
    const gross = orders.reduce((s, o) => s + o.total, 0);
    const collected = orders.reduce((s, o) => s + o.paidAmount, 0);
    const piutang = orders.reduce((s, o) => s + Math.max(0, o.total - o.paidAmount), 0);
    const paid = orders.filter((o) => o.paymentStatus === "paid");
    const partial = orders.filter((o) => o.paymentStatus === "partial");
    const unpaid = orders.filter((o) => o.paymentStatus === "unpaid");
    const completed = orders.filter((o) => o.status === "completed");
    const avgOrder = orders.length ? gross / orders.length : 0;

    return {
      gross,
      collected,
      piutang,
      total: orders.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((s, o) => s + o.total, 0),
      partialCount: partial.length,
      partialAmount: partial.reduce((s, o) => s + o.paidAmount, 0),
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((s, o) => s + o.total, 0),
      completedCount: completed.length,
      avgOrder,
    };
  }, [orders]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of orders) {
      for (const it of o.items) {
        if (!it.productName) continue;
        if (!map[it.productName]) map[it.productName] = { name: it.productName, qty: 0, revenue: 0 };
        map[it.productName].qty += it.quantity;
        map[it.productName].revenue += it.itemSubtotal;
      }
    }
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [orders]);

  const maxQty = topProducts[0]?.qty ?? 1;

  const hourlyData = useMemo(() => {
    const hours: { hour: number; count: number; revenue: number }[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
      revenue: 0,
    }));
    for (const o of orders) {
      if (!isNaN(o.date.getTime())) {
        const h = o.date.getHours();
        hours[h].count += 1;
        hours[h].revenue += o.total;
      }
    }
    return hours.filter((h) => {
      const isBusinessHour = h.hour >= 6 && h.hour <= 23;
      const hasData = orders.some((o) => !isNaN(o.date.getTime()) && o.date.getHours() === h.hour);
      return isBusinessHour || hasData;
    });
  }, [orders]);

  const maxHourCount = Math.max(...hourlyData.map((h) => h.count), 1);

  const paymentMethodStats = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    for (const o of orders) {
      for (const p of o.payments ?? []) {
        const method: string = p.payment_method ?? p.paymentMethod ?? "other";
        if (!map[method]) map[method] = { count: 0, amount: 0 };
        map[method].count += 1;
        map[method].amount += Number(p.amount ?? 0);
      }
    }
    return Object.entries(map)
      .map(([method, d]) => ({ method, ...d }))
      .sort((a, b) => b.amount - a.amount);
  }, [orders]);

  const methodLabel: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    cash: { label: "Tunai", icon: Banknote, color: "bg-emerald-100 text-emerald-700" },
    card: { label: "Kartu", icon: CreditCard, color: "bg-blue-100 text-blue-700" },
    ewallet: { label: "E-Wallet", icon: Wallet, color: "bg-violet-100 text-violet-700" },
    other: { label: "Lainnya", icon: Banknote, color: "bg-slate-100 text-slate-600" },
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="Laporan"
        subtitle="Analisis penjualan bisnis"
        onBack={() => setLocation("/hub")}
        actions={
          <div className="w-36">
            <CustomSelect
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodLabel)}
              options={[
                { value: "Hari Ini", label: "Hari Ini" },
                { value: "Kemarin", label: "Kemarin" },
                { value: "Minggu Ini", label: "7 Hari" },
                { value: "Bulan Ini", label: "Bulan Ini" },
              ]}
            />
          </div>
        }
        bottomContent={
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-[70px] md:pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <BarChart3 size={32} className="animate-pulse" />
            <p className="text-sm">Memuat laporan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <AlertCircle size={32} className="opacity-50" />
            <p className="text-sm font-medium">Belum ada transaksi pada periode ini</p>
            <p className="text-xs text-slate-300">Coba pilih periode yang berbeda</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">

            {/* ── RINGKASAN TAB ── */}
            {activeTab === "ringkasan" && (
              <div className="space-y-4">
                {/* Primary metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Omset Kotor"
                    value={formatIDRCompact(stats.gross)}
                    sub={`${stats.total} transaksi`}
                    icon={TrendingUp}
                    color="blue"
                  />
                  <MetricCard
                    label="Terkumpul"
                    value={formatIDRCompact(stats.collected)}
                    sub="sudah dibayar"
                    icon={CheckCircle2}
                    color="green"
                  />
                  <MetricCard
                    label="Piutang"
                    value={formatIDRCompact(stats.piutang)}
                    sub={`${stats.unpaidCount + stats.partialCount} belum lunas`}
                    icon={Clock}
                    color={stats.piutang > 0 ? "amber" : "slate"}
                  />
                  <MetricCard
                    label="Rata-rata Order"
                    value={formatIDRCompact(stats.avgOrder)}
                    sub="per transaksi"
                    icon={ShoppingCart}
                    color="slate"
                  />
                </div>

                {/* Status breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-700">Status Pembayaran</h3>
                  <ProgressBar
                    label="Lunas"
                    value={stats.paidCount}
                    total={stats.total}
                    amount={stats.paidAmount}
                    color="bg-emerald-500"
                  />
                  <ProgressBar
                    label="Sebagian"
                    value={stats.partialCount}
                    total={stats.total}
                    amount={stats.partialAmount}
                    color="bg-amber-400"
                  />
                  <ProgressBar
                    label="Belum Bayar"
                    value={stats.unpaidCount}
                    total={stats.total}
                    amount={stats.unpaidAmount}
                    color="bg-rose-400"
                  />
                </div>

                {/* Quick summary row */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-slate-700 mb-3">Ringkasan Cepat</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Total Transaksi", value: `${stats.total} order` },
                      { label: "Transaksi Selesai", value: `${stats.completedCount} order` },
                      { label: "Transaksi Lunas", value: `${stats.paidCount} order` },
                      { label: "Rata-rata per Order", value: formatIDR(stats.avgOrder) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-sm text-slate-500">{row.label}</span>
                        <span className="text-sm font-bold text-slate-800">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PEMBAYARAN TAB ── */}
            {activeTab === "pembayaran" && (
              <div className="space-y-4">
                {/* Payment status cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-3 text-center">
                    <div className="text-lg font-black text-emerald-600">{stats.paidCount}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Lunas</div>
                    <div className="text-[11px] font-bold text-slate-600 mt-1">{formatIDRCompact(stats.paidAmount)}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-3 text-center">
                    <div className="text-lg font-black text-amber-600">{stats.partialCount}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Sebagian</div>
                    <div className="text-[11px] font-bold text-slate-600 mt-1">{formatIDRCompact(stats.partialAmount)}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-3 text-center">
                    <div className="text-lg font-black text-rose-500">{stats.unpaidCount}</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Belum Bayar</div>
                    <div className="text-[11px] font-bold text-slate-600 mt-1">{formatIDRCompact(stats.unpaidAmount)}</div>
                  </div>
                </div>

                {/* Payment method breakdown */}
                {paymentMethodStats.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">Metode Pembayaran</h3>
                    {paymentMethodStats.map(({ method, count, amount }) => {
                      const config = methodLabel[method] ?? { label: method, icon: CreditCard, color: "bg-slate-100 text-slate-600" };
                      const Icon = config.icon;
                      const pct = stats.collected > 0 ? Math.round((amount / stats.collected) * 100) : 0;
                      return (
                        <div key={method} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${config.color}`}>
                                <Icon size={11} /> {config.label}
                              </span>
                              <span className="text-xs text-slate-400">{count}×</span>
                            </div>
                            <span className="font-bold text-sm text-slate-800">{formatIDRCompact(amount)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">{pct}% dari total terkumpul</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Metode Pembayaran</h3>
                    <p className="text-sm text-slate-400 text-center py-4">
                      Detail metode pembayaran tersedia setelah transaksi diproses.
                    </p>
                  </div>
                )}

                {/* Piutang alert */}
                {stats.piutang > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Ada Piutang Tertunggak</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {stats.unpaidCount + stats.partialCount} pesanan belum lunas total{" "}
                        <span className="font-bold">{formatIDR(stats.piutang)}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PRODUK TERLARIS TAB ── */}
            {activeTab === "produk" && (
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
                    <Package size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Belum ada data produk</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-700">Produk Terlaris</h3>
                      <span className="text-xs text-slate-400">{topProducts.length} produk</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {topProducts.map((p, idx) => {
                        const barPct = maxQty > 0 ? (p.qty / maxQty) * 100 : 0;
                        return (
                          <div key={p.name} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-black w-5 text-center flex-shrink-0 ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-slate-300"}`}>
                                  #{idx + 1}
                                </span>
                                <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{p.qty} terjual</span>
                                <span className="text-sm font-bold text-slate-700">{formatIDRCompact(p.revenue)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
                              <div
                                className={`h-full rounded-full ${idx === 0 ? "bg-amber-400" : "bg-blue-400"}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TREN JAM TAB ── */}
            {activeTab === "tren" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <h3 className="text-sm font-bold text-slate-700">Transaksi per Jam</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Pola penjualan berdasarkan waktu</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {hourlyData.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Tidak ada data tren untuk periode ini</p>
                    ) : (
                      hourlyData.map((h) => {
                        const barPct = maxHourCount > 0 ? (h.count / maxHourCount) * 100 : 0;
                        const label = `${String(h.hour).padStart(2, "0")}:00`;
                        return (
                          <div key={h.hour} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-mono w-10 flex-shrink-0">{label}</span>
                            <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden relative">
                              <div
                                className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                                style={{ width: `${barPct}%` }}
                              />
                              {h.count > 0 && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white mix-blend-normal" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                                  {h.count}×
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-600 w-16 text-right flex-shrink-0">
                              {h.revenue > 0 ? formatIDRCompact(h.revenue) : "-"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Peak hour summary */}
                {hourlyData.some((h) => h.count > 0) && (() => {
                  const peak = [...hourlyData].sort((a, b) => b.count - a.count)[0];
                  return (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                      <TrendingUp size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-800">Jam Tersibuk</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          Pukul{" "}
                          <span className="font-bold">
                            {String(peak.hour).padStart(2, "0")}:00–{String(peak.hour + 1).padStart(2, "0")}:00
                          </span>{" "}
                          dengan {peak.count} transaksi ({formatIDRCompact(peak.revenue)})
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        )}
      </div>

      <UnifiedBottomNav cartCount={0} />
    </div>
  );
}
