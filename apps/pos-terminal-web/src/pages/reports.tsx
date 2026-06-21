import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Banknote,
  Package,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import type { POSPaymentMethod } from "@pos/domain/payments";
import { useOrders } from "@/hooks/api/useOrders";
import { PageHeader, CustomSelect } from "@/components/design";
import { UnifiedBottomNav } from "@/components/navigation/UnifiedBottomNav";

type PeriodLabel = "Hari Ini" | "Kemarin" | "Minggu Ini" | "Bulan Ini";
type ReportTab = "ringkasan" | "pembayaran" | "produk" | "tren";

type ReportOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  tableNumber: string;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  date: Date;
  items: Array<{ productName: string; quantity: number; itemSubtotal: number }>;
  payments: Array<{ payment_method?: POSPaymentMethod; paymentMethod?: POSPaymentMethod; amount?: number }>;
};

const PAYMENT_METHOD_META: Record<POSPaymentMethod, { label: string; color: string }> = {
  CASH: { label: "Tunai", color: "bg-emerald-100 text-emerald-700" },
  MANUAL_TRANSFER: { label: "Transfer Manual", color: "bg-blue-100 text-blue-700" },
  MANUAL_QRIS: { label: "QRIS Manual", color: "bg-violet-100 text-violet-700" },
};

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: "ringkasan", label: "Ringkasan", icon: BarChart3 },
  { id: "pembayaran", label: "Pembayaran", icon: Banknote },
  { id: "produk", label: "Produk Terlaris", icon: Package },
  { id: "tren", label: "Tren Jam", icon: TrendingUp },
];

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

const formatIDRCompact = (price: number) => {
  if (price >= 1_000_000) return `Rp ${(price / 1_000_000).toFixed(1)}jt`;
  if (price >= 1_000) return `Rp ${(price / 1_000).toFixed(0)}rb`;
  return formatIDR(price);
};

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function toPOSPaymentMethod(value: unknown): POSPaymentMethod | null {
  if (value === "CASH") return "CASH";
  if (value === "MANUAL_TRANSFER") return "MANUAL_TRANSFER";
  if (value === "MANUAL_QRIS") return "MANUAL_QRIS";
  return null;
}

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

function normalizeOrder(order: any): ReportOrder {
  const items: any[] = order.items ?? order.order_items ?? [];
  return {
    id: order.id,
    orderNumber: order.orderNumber ?? order.order_number ?? "",
    customerName: order.customerName ?? order.customer_name ?? "",
    tableNumber: order.tableNumber ?? order.table_number ?? "",
    total: toNumber(order.total ?? order.totalAmount ?? order.total_amount),
    paidAmount: toNumber(order.paidAmount ?? order.paid_amount),
    paymentStatus: order.paymentStatus ?? order.payment_status ?? "unpaid",
    status: order.status ?? "",
    date: new Date(order.orderDate ?? order.createdAt ?? order.created_at ?? 0),
    items: items.map((item: any) => ({
      productName: item.productName ?? item.product_name ?? "",
      quantity: toNumber(item.quantity),
      itemSubtotal: toNumber(item.itemSubtotal ?? item.item_subtotal),
    })),
    payments: Array.isArray(order.payments) ? order.payments : [],
  };
}

function MetricCard({ label, value, sub, icon: Icon, color = "blue" }: { label: string; value: string; sub?: string; icon?: React.ElementType; color?: "blue" | "green" | "amber" | "rose" | "slate" }) {
  const palette = {
    blue: { bg: "bg-blue-50", icon: "text-blue-500", value: "text-blue-700" },
    green: { bg: "bg-emerald-50", icon: "text-emerald-500", value: "text-emerald-700" },
    amber: { bg: "bg-amber-50", icon: "text-amber-500", value: "text-amber-700" },
    rose: { bg: "bg-rose-50", icon: "text-rose-500", value: "text-rose-700" },
    slate: { bg: "bg-slate-100", icon: "text-slate-500", value: "text-slate-700" },
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
      {Icon && <div className={`w-8 h-8 rounded-xl ${palette.bg} flex items-center justify-center`}><Icon size={16} className={palette.icon} /></div>}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-black mt-0.5 ${palette.value}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, amount, color }: { label: string; value: number; total: number; amount: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-3"><span className="text-slate-400 text-xs">{value} transaksi</span><span className="font-bold text-slate-800">{formatIDRCompact(amount)}</span></div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} /></div>
      <p className="text-[11px] text-slate-400">{pct}% dari total transaksi</p>
    </div>
  );
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<PeriodLabel>("Hari Ini");
  const [activeTab, setActiveTab] = useState<ReportTab>("ringkasan");

  const { startDate, endDate } = useMemo(() => getPeriodRange(period), [period]);
  const { data: orderRes, isLoading } = useOrders({ startDate, endDate, limit: 1000 });

  const rawOrders: any[] = (orderRes as any)?.data?.orders ?? (orderRes as any)?.orders ?? [];
  const orders = useMemo(() => rawOrders.map(normalizeOrder), [rawOrders]);

  const stats = useMemo(() => {
    const gross = orders.reduce((sum, order) => sum + order.total, 0);
    const collected = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    const piutang = orders.reduce((sum, order) => sum + Math.max(0, order.total - order.paidAmount), 0);
    const paid = orders.filter((order) => order.paymentStatus === "paid");
    const partial = orders.filter((order) => order.paymentStatus === "partial");
    const unpaid = orders.filter((order) => order.paymentStatus === "unpaid");
    const completed = orders.filter((order) => order.status === "completed");
    return {
      gross,
      collected,
      piutang,
      total: orders.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, order) => sum + order.total, 0),
      partialCount: partial.length,
      partialAmount: partial.reduce((sum, order) => sum + order.paidAmount, 0),
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((sum, order) => sum + order.total, 0),
      completedCount: completed.length,
      avgOrder: orders.length ? gross / orders.length : 0,
    };
  }, [orders]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!item.productName) continue;
        if (!map[item.productName]) map[item.productName] = { name: item.productName, qty: 0, revenue: 0 };
        map[item.productName].qty += item.quantity;
        map[item.productName].revenue += item.itemSubtotal;
      }
    }
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [orders]);

  const maxQty = topProducts[0]?.qty ?? 1;

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, revenue: 0 }));
    for (const order of orders) {
      if (!Number.isNaN(order.date.getTime())) {
        const hour = order.date.getHours();
        hours[hour].count += 1;
        hours[hour].revenue += order.total;
      }
    }
    return hours.filter((hour) => {
      const isBusinessHour = hour.hour >= 6 && hour.hour <= 23;
      const hasData = orders.some((order) => !Number.isNaN(order.date.getTime()) && order.date.getHours() === hour.hour);
      return isBusinessHour || hasData;
    });
  }, [orders]);

  const maxHourCount = Math.max(...hourlyData.map((hour) => hour.count), 1);

  const paymentMethodStats = useMemo(() => {
    const map: Record<POSPaymentMethod, { count: number; amount: number }> = {
      CASH: { count: 0, amount: 0 },
      MANUAL_TRANSFER: { count: 0, amount: 0 },
      MANUAL_QRIS: { count: 0, amount: 0 },
    };
    for (const order of orders) {
      for (const payment of order.payments) {
        const method = toPOSPaymentMethod(payment.payment_method ?? payment.paymentMethod);
        if (!method) continue;
        map[method].count += 1;
        map[method].amount += Number(payment.amount ?? 0);
      }
    }
    return Object.entries(map)
      .map(([method, data]) => ({ method: method as POSPaymentMethod, ...data }))
      .filter((row) => row.count > 0 || row.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [orders]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="Laporan"
        subtitle="Analisis penjualan bisnis"
        onBack={() => setLocation("/hub")}
        actions={<div className="w-36"><CustomSelect value={period} onChange={(e) => setPeriod(e.target.value as PeriodLabel)} options={[{ value: "Hari Ini", label: "Hari Ini" }, { value: "Kemarin", label: "Kemarin" }, { value: "Minggu Ini", label: "7 Hari" }, { value: "Bulan Ini", label: "Bulan Ini" }]} /></div>}
        bottomContent={
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`tab-${tab.id}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><Icon size={13} />{tab.label}</button>;
            })}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-[70px] md:pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400"><BarChart3 size={32} className="animate-pulse" /><p className="text-sm">Memuat laporan...</p></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400"><AlertCircle size={32} className="opacity-50" /><p className="text-sm font-medium">Belum ada transaksi pada periode ini</p><p className="text-xs text-slate-300">Coba pilih periode yang berbeda</p></div>
        ) : (
          <div className="p-4 space-y-4">
            {activeTab === "ringkasan" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Omset Kotor" value={formatIDRCompact(stats.gross)} sub={`${stats.total} transaksi`} icon={TrendingUp} color="blue" />
                  <MetricCard label="Terkumpul" value={formatIDRCompact(stats.collected)} sub="sudah dibayar" icon={CheckCircle2} color="green" />
                  <MetricCard label="Piutang" value={formatIDRCompact(stats.piutang)} sub={`${stats.unpaidCount + stats.partialCount} belum lunas`} icon={Clock} color={stats.piutang > 0 ? "amber" : "slate"} />
                  <MetricCard label="Rata-rata Order" value={formatIDRCompact(stats.avgOrder)} sub="per transaksi" icon={ShoppingCart} color="slate" />
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-700">Status Pembayaran</h3>
                  <ProgressBar label="Lunas" value={stats.paidCount} total={stats.total} amount={stats.paidAmount} color="bg-emerald-500" />
                  <ProgressBar label="Sebagian" value={stats.partialCount} total={stats.total} amount={stats.partialAmount} color="bg-amber-400" />
                  <ProgressBar label="Belum Bayar" value={stats.unpaidCount} total={stats.total} amount={stats.unpaidAmount} color="bg-rose-400" />
                </div>
              </div>
            )}

            {activeTab === "pembayaran" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-3 text-center"><div className="text-lg font-black text-emerald-600">{stats.paidCount}</div><div className="text-[11px] font-semibold text-slate-400 mt-0.5">Lunas</div><div className="text-[11px] font-bold text-slate-600 mt-1">{formatIDRCompact(stats.paidAmount)}</div></div>
                  <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-3 text-center"><div className="text-lg font-black text-amber-600">{stats.partialCount}</div><div className="text-[11px] font-semibold text-slate-400 mt-0.5">Sebagian</div><div className="text-[11px] font-bold text-slate-600 mt-1">{formatIDRCompact(stats.partialAmount)}</div></div>
                  <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-3 text-center"><div className="text-lg font-black text-rose-500">{stats.unpaidCount}</div><div className="text-[11px] font-semibold text-slate-400 mt-0.5">Belum Bayar</div><div className="text-[11px] font-bold text-slate-600 mt-1">{formatIDRCompact(stats.unpaidAmount)}</div></div>
                </div>
                {paymentMethodStats.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700">Metode Pembayaran</h3>
                    {paymentMethodStats.map(({ method, count, amount }) => {
                      const config = PAYMENT_METHOD_META[method];
                      const pct = stats.collected > 0 ? Math.round((amount / stats.collected) * 100) : 0;
                      return (
                        <div key={method} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${config.color}`}><Banknote size={11} /> {config.label}</span><span className="text-xs text-slate-400">{count}×</span></div>
                            <span className="font-bold text-sm text-slate-800">{formatIDRCompact(amount)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <p className="text-[11px] text-slate-400">{pct}% dari total terkumpul</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><h3 className="text-sm font-bold text-slate-700 mb-3">Metode Pembayaran</h3><p className="text-sm text-slate-400 text-center py-4">Detail metode pembayaran tersedia setelah transaksi diproses.</p></div>
                )}
                {stats.piutang > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"><AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-bold text-amber-800">Ada Piutang Tertunggak</p><p className="text-xs text-amber-600 mt-0.5">{stats.unpaidCount + stats.partialCount} pesanan belum lunas total <span className="font-bold">{formatIDR(stats.piutang)}</span></p></div></div>
                )}
              </div>
            )}

            {activeTab === "produk" && (
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400"><Package size={28} className="mx-auto mb-2 opacity-40" /><p className="text-sm">Belum ada data produk</p></div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-700">Produk Terlaris</h3><span className="text-xs text-slate-400">{topProducts.length} produk</span></div>
                    <div className="divide-y divide-slate-50">
                      {topProducts.map((product, index) => {
                        const barPct = maxQty > 0 ? (product.qty / maxQty) * 100 : 0;
                        return (
                          <div key={product.name} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 mb-2"><div className="flex items-center gap-3 min-w-0"><div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-black text-blue-600">{index + 1}</div><div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p><p className="text-xs text-slate-400">{product.qty} terjual</p></div></div><span className="text-sm font-bold text-slate-800">{formatIDRCompact(product.revenue)}</span></div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${barPct}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "tren" && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-700">Tren Per Jam</h3>
                {hourlyData.map((hour) => {
                  const pct = maxHourCount > 0 ? Math.round((hour.count / maxHourCount) * 100) : 0;
                  return (
                    <div key={hour.hour} className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">{hour.hour.toString().padStart(2, "0")}:00</span><div className="flex gap-3"><span className="text-slate-400 text-xs">{hour.count} trx</span><span className="font-bold text-slate-700">{formatIDRCompact(hour.revenue)}</span></div></div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <UnifiedBottomNav cartCount={0} />
    </div>
  );
}
