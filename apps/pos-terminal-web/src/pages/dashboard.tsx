import { useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  Calendar,
  ChevronDown,
  Wallet,
  ShoppingBag,
  ArrowDownRight,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { SummaryCard } from "@/components/pos/shared/SummaryCard";
import { DashboardChartPresenter, type ChartDataPoint } from "@/components/pos/shared/DashboardChartPresenter";

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

type PeriodKey = "today" | "yesterday" | "week" | "month";

const CHART_DATA_SETS: Record<PeriodKey, ChartDataPoint[]> = {
  today: [
    { label: "10:00", value: 450000, height: 30, transactions: 5 },
    { label: "11:00", value: 750000, height: 50, transactions: 8 },
    { label: "12:00", value: 1500000, height: 100, transactions: 22 },
    { label: "13:00", value: 1200000, height: 80, transactions: 18 },
    { label: "14:00", value: 600000, height: 40, transactions: 7 },
    { label: "15:00", value: 450000, height: 30, transactions: 6 },
    { label: "16:00", value: 900000, height: 60, transactions: 12 },
  ],
  yesterday: [
    { label: "10:00", value: 420000, height: 28, transactions: 4 },
    { label: "11:00", value: 680000, height: 45, transactions: 7 },
    { label: "12:00", value: 1400000, height: 93, transactions: 20 },
    { label: "13:00", value: 1100000, height: 73, transactions: 16 },
    { label: "14:00", value: 550000, height: 37, transactions: 6 },
    { label: "15:00", value: 400000, height: 27, transactions: 5 },
    { label: "16:00", value: 850000, height: 57, transactions: 11 },
  ],
  week: [
    { label: "Senin", value: 3500000, height: 60, transactions: 45 },
    { label: "Selasa", value: 3200000, height: 55, transactions: 42 },
    { label: "Rabu", value: 4100000, height: 70, transactions: 50 },
    { label: "Kamis", value: 3800000, height: 65, transactions: 48 },
    { label: "Jumat", value: 5500000, height: 90, transactions: 75 },
    { label: "Sabtu", value: 6200000, height: 100, transactions: 92 },
    { label: "Minggu", value: 5800000, height: 95, transactions: 85 },
  ],
  month: [
    { label: "Minggu 1", value: 25000000, height: 80, transactions: 350 },
    { label: "Minggu 2", value: 22000000, height: 70, transactions: 310 },
    { label: "Minggu 3", value: 28000000, height: 90, transactions: 400 },
    { label: "Minggu 4", value: 15000000, height: 40, transactions: 200 },
  ],
};

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Classic Beef Burger",
    price: 45000,
    stock: 5,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60",
  },
  {
    id: 2,
    name: "French Fries",
    price: 18000,
    stock: 8,
    image: "https://images.unsplash.com/photo-1541592103048-4e22ecc25e67?auto=format&fit=crop&w=500&q=60",
  },
];

const TOP_PRODUCT = {
  name: "Classic Beef Burger",
  sold: 45,
  revenue: 2025000,
  image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60",
};

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("today");
  const [activeChartItem, setActiveChartItem] = useState<ChartDataPoint | null>(null);

  const currentChartData = CHART_DATA_SETS[selectedPeriod] || CHART_DATA_SETS.today;

  const handlePeriodChange = (period: PeriodKey) => {
    setSelectedPeriod(period);
    setActiveChartItem(null);
  };

  const handleBack = () => {
    setLocation("/");
  };

  const getSummaryDataByPeriod = () => {
    switch (selectedPeriod) {
      case "today":
        return {
          revenue: "Rp 4.2jt",
          transactions: 64,
          avgBill: "Rp 65rb",
        };
      case "yesterday":
        return {
          revenue: "Rp 4.0jt",
          transactions: 59,
          avgBill: "Rp 67rb",
        };
      case "week":
        return {
          revenue: "Rp 32.1jt",
          transactions: 437,
          avgBill: "Rp 73rb",
        };
      case "month":
        return {
          revenue: "Rp 90.0jt",
          transactions: 1260,
          avgBill: "Rp 71rb",
        };
      default:
        return {
          revenue: "Rp 4.2jt",
          transactions: 64,
          avgBill: "Rp 65rb",
        };
    }
  };

  const summaryData = getSummaryDataByPeriod();

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8">
      {/* Header Dashboard */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800" data-testid="text-page-title">
              Dashboard
            </h1>
            <p className="text-[10px] text-slate-500 font-medium" data-testid="text-page-subtitle">
              Analisa Performa
            </p>
          </div>
        </div>

        {/* Period Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodKey)}
              className="appearance-none bg-white border border-slate-200 pl-9 pr-8 py-2 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm transition-all"
              data-testid="select-period"
            >
              <option value="today">Hari Ini</option>
              <option value="yesterday">Kemarin</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            <Calendar
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Summary Cards Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <SummaryCard
            icon={Wallet}
            label={selectedPeriod === "today" ? "Omset Sales" : "Total Revenue"}
            value={summaryData.revenue}
            trend={{
              icon: TrendingUp,
              value: "+18% Trend",
            }}
            variant="gradient"
          />
          <SummaryCard
            icon={ShoppingBag}
            label="Transaksi"
            value={summaryData.transactions}
            trend={{
              icon: CheckCircle,
              value: "Paid",
              positive: true,
            }}
          />
          <SummaryCard
            icon={ArrowDownRight}
            label="Avg. Bill"
            value={summaryData.avgBill}
            subtitle="Per pelanggan"
          />
          <SummaryCard
            icon={AlertCircle}
            label="Stok Menipis"
            value="2 Item"
            subtitle="Segera restock!"
            variant="alert"
          />
        </div>

        {/* Interactive Chart Section */}
        <DashboardChartPresenter
          data={currentChartData}
          activeItem={activeChartItem}
          onItemClick={setActiveChartItem}
          formatValue={formatIDR}
          topProduct={TOP_PRODUCT}
        />

        {/* Payment Methods & Alerts */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Payment Methods */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm" data-testid="card-payment-methods">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">
              Metode Pembayaran
            </h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-4 bg-slate-100">
              <div
                className="bg-green-500 h-full"
                style={{ width: "45%" }}
                data-testid="bar-payment-cash"
              ></div>
              <div
                className="bg-blue-500 h-full"
                style={{ width: "35%" }}
                data-testid="bar-payment-qris"
              ></div>
              <div
                className="bg-purple-500 h-full"
                style={{ width: "20%" }}
                data-testid="bar-payment-card"
              ></div>
            </div>
            <div className="flex justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-bold text-slate-600">
                  Tunai (45%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-bold text-slate-600">
                  QRIS (35%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-bold text-slate-600">
                  Kartu (20%)
                </span>
              </div>
            </div>
          </div>

          {/* Alert List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" data-testid="card-low-stock-alerts">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Peringatan Sistem
              </h3>
            </div>
            <div className="p-2">
              {MOCK_PRODUCTS.filter((p) => p.stock < 10).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border-b border-slate-50 last:border-none"
                  data-testid={`alert-item-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden">
                      <img
                        src={item.image}
                        className="w-full h-full object-cover"
                        alt={item.name}
                      />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {item.name}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                    Sisa {item.stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
