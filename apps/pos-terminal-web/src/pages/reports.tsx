import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  Download,
  Printer,
  List,
  BarChart3,
  MousePointerClick,
} from "lucide-react";
import { CustomSelect, PageHeader, StatCard } from "@/components/design";

interface ChartDataPoint {
  label: string;
  value: number;
  height: number;
  transactions: number;
}

interface ChartDataSets {
  today: ChartDataPoint[];
  week: ChartDataPoint[];
  month: ChartDataPoint[];
}

interface Transaction {
  id: string;
  time: string;
  customer: string;
  total: number;
  method: string;
  status: string;
}

const CHART_DATA_SETS: ChartDataSets = {
  today: [
    { label: "10:00", value: 450000, height: 30, transactions: 5 },
    { label: "11:00", value: 750000, height: 50, transactions: 8 },
    { label: "12:00", value: 1500000, height: 100, transactions: 22 },
    { label: "13:00", value: 1200000, height: 80, transactions: 18 },
    { label: "14:00", value: 600000, height: 40, transactions: 7 },
    { label: "15:00", value: 450000, height: 30, transactions: 6 },
    { label: "16:00", value: 900000, height: 60, transactions: 12 },
  ],
  week: [
    { label: "Sen", value: 3500000, height: 60, transactions: 45 },
    { label: "Sel", value: 3200000, height: 55, transactions: 42 },
    { label: "Rab", value: 4100000, height: 70, transactions: 50 },
    { label: "Kam", value: 3800000, height: 65, transactions: 48 },
    { label: "Jum", value: 5500000, height: 90, transactions: 75 },
    { label: "Sab", value: 6200000, height: 100, transactions: 92 },
    { label: "Min", value: 5800000, height: 95, transactions: 85 },
  ],
  month: [
    { label: "Minggu 1", value: 25000000, height: 80, transactions: 350 },
    { label: "Minggu 2", value: 22000000, height: 70, transactions: 310 },
    { label: "Minggu 3", value: 28000000, height: 90, transactions: 400 },
    { label: "Minggu 4", value: 15000000, height: 40, transactions: 200 },
  ],
};

const TRANSACTION_HISTORY: Transaction[] = [
  {
    id: "#TRX-001",
    time: "14:30",
    customer: "Walk-in",
    total: 145000,
    method: "QRIS",
    status: "Lunas",
  },
  {
    id: "#TRX-002",
    time: "14:15",
    customer: "Meja 4",
    total: 250000,
    method: "Tunai",
    status: "Lunas",
  },
  {
    id: "#TRX-003",
    time: "13:45",
    customer: "Gojek",
    total: 85000,
    method: "E-Wallet",
    status: "Lunas",
  },
  {
    id: "#TRX-004",
    time: "13:20",
    customer: "Meja 1",
    total: 420000,
    method: "Debit",
    status: "Lunas",
  },
  {
    id: "#TRX-005",
    time: "12:55",
    customer: "Batal",
    total: 0,
    method: "-",
    status: "Batal",
  },
];

const formatIDR = (price: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

const ReportsPage = () => {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("Hari Ini");
  const [activeChartItem, setActiveChartItem] = useState<ChartDataPoint | null>(null);

  const chartData = useMemo(() => {
    if (period === "Minggu Ini") return CHART_DATA_SETS.week;
    if (period === "Bulan Ini") return CHART_DATA_SETS.month;
    return CHART_DATA_SETS.today;
  }, [period]);

  const handleBack = () => {
    setLocation("/");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      <PageHeader
        title="Laporan Penjualan"
        subtitle="Analisis detail transaksi"
        onBack={handleBack}
        actions={
          <>
            <div className="relative flex-1 md:flex-none md:w-40">
              <CustomSelect
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setActiveChartItem(null);
                }}
                options={[
                  { value: "Hari Ini", label: "Hari Ini" },
                  { value: "Minggu Ini", label: "Minggu Ini" },
                  { value: "Bulan Ini", label: "Bulan Ini" },
                ]}
              />
            </div>
            <button 
              className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100"
              data-testid="button-download"
            >
              <Download size={18} />
            </button>
            <button 
              className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200"
              data-testid="button-print"
            >
              <Printer size={18} />
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">
              Omset Kotor
            </p>
            <h3 className="text-2xl font-black text-slate-800">Rp 4.2jt</h3>
            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">
              Laba Bersih
            </p>
            <h3 className="text-2xl font-black text-blue-600">Rp 1.8jt</h3>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Estimasi 45% margin
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">
              Total Transaksi
            </p>
            <h3 className="text-2xl font-black text-slate-800">64</h3>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Pesanan selesai
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">
              Rata-rata Order
            </p>
            <h3 className="text-2xl font-black text-slate-800">Rp 65rb</h3>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Per pelanggan
            </span>
          </div>
        </div>

        {/* Interactive Chart & Detail Grid */}
        <div className="grid md:grid-cols-[2fr_1fr] gap-4">
          {/* Chart Section */}
          <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col"
            data-testid="card-chart"
          >
            <h3 className="font-bold text-slate-800 mb-6 text-sm">
              Grafik Tren Penjualan ({period})
            </h3>
            <div className="h-48 flex items-end justify-between gap-3 px-2 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-px bg-slate-50"></div>
                ))}
              </div>
              {chartData.map((d, i) => {
                const isActive = activeChartItem?.label === d.label;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveChartItem(d)}
                    className="flex-1 flex flex-col justify-end gap-2 group cursor-pointer h-full z-10"
                    data-testid={`chart-bar-${d.label}`}
                  >
                    <div className="relative w-full rounded-t-lg h-full flex items-end group-hover:bg-slate-50 transition-colors p-0.5">
                      <div
                        className={`w-full rounded-t-lg transition-all relative ${
                          isActive
                            ? "bg-blue-600 shadow-lg"
                            : "bg-blue-400 group-hover:bg-blue-500"
                        }`}
                        style={{ height: `${d.height}%` }}
                      >
                        <div className="hidden md:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {formatIDR(d.value)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] text-center font-bold transition-colors ${
                        isActive ? "text-blue-600 scale-110" : "text-slate-400"
                      }`}
                    >
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Panel */}
          <div
            className={`rounded-xl p-5 border shadow-sm transition-all duration-300 ${
              activeChartItem
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-white text-slate-800 border-slate-100"
            }`}
            data-testid="card-chart-detail"
          >
            {activeChartItem ? (
              <div className="h-full flex flex-col justify-center animate-in fade-in">
                <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase mb-1">
                  <MousePointerClick size={14} /> Detail Data
                </div>
                <h2 className="text-3xl font-black mb-1">
                  {activeChartItem.label}
                </h2>
                <div className="w-full h-px bg-white/20 my-4"></div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-blue-200 mb-1">Pendapatan</p>
                    <p className="text-2xl font-bold" data-testid="text-detail-revenue">
                      {formatIDR(activeChartItem.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-1">
                      Total Transaksi
                    </p>
                    <p className="text-xl font-bold" data-testid="text-detail-transactions">
                      {activeChartItem.transactions} Order
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <BarChart3 size={48} className="mb-3 opacity-20" />
                <p className="text-sm font-bold">Pilih Grafik</p>
                <p className="text-xs mt-1">
                  Klik batang grafik untuk melihat detail spesifik.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <List size={16} /> Riwayat Transaksi
            </h3>
            <button 
              className="text-blue-600 text-xs font-bold hover:underline"
              data-testid="button-view-all"
            >
              Lihat Semua
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500 font-bold border-b border-slate-200 bg-white">
                <tr>
                  <th className="p-4">ID Order</th>
                  <th className="p-4">Waktu</th>
                  <th className="p-4">Pelanggan</th>
                  <th className="p-4">Metode</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TRANSACTION_HISTORY.map((trx, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate-50 transition-colors"
                    data-testid={`row-transaction-${idx}`}
                  >
                    <td className="p-4 font-bold text-blue-600" data-testid={`text-id-${idx}`}>
                      {trx.id}
                    </td>
                    <td className="p-4 text-slate-500" data-testid={`text-time-${idx}`}>
                      {trx.time}
                    </td>
                    <td className="p-4 font-medium text-slate-700" data-testid={`text-customer-${idx}`}>
                      {trx.customer}
                    </td>
                    <td className="p-4" data-testid={`text-method-${idx}`}>
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                        {trx.method}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800" data-testid={`text-total-${idx}`}>
                      {formatIDR(trx.total)}
                    </td>
                    <td className="p-4 text-center" data-testid={`text-status-${idx}`}>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          trx.status === "Lunas"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
