import { BarChart3, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChartDataPoint = {
  label: string;
  value: number;
  height: number;
  transactions: number;
};

type DashboardChartPresenterProps = {
  data: ChartDataPoint[];
  activeItem: ChartDataPoint | null;
  onItemClick: (item: ChartDataPoint) => void;
  formatValue: (value: number) => string;
  topProduct?: {
    name: string;
    sold: number;
    revenue: number;
    image: string;
  };
};

export function DashboardChartPresenter({
  data,
  activeItem,
  onItemClick,
  formatValue,
  topProduct,
}: DashboardChartPresenterProps) {
  return (
    <div className="grid md:grid-cols-[2fr_1fr] gap-4">
      {/* Chart Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2" data-testid="text-chart-title">
              <BarChart3 size={18} className="text-blue-600" /> Grafik Penjualan
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Klik pada batang grafik untuk melihat detail.
            </p>
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-64 flex items-end justify-between gap-3 px-2 pb-2 relative">
          {/* Grid Lines Background */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full h-px bg-slate-50"></div>
            ))}
          </div>

          {data.map((dataPoint, index) => {
            const isActive = activeItem?.label === dataPoint.label;
            return (
              <div
                key={index}
                onClick={() => onItemClick(dataPoint)}
                className="flex flex-col items-center gap-3 flex-1 group cursor-pointer h-full justify-end z-10"
                data-testid={`chart-bar-${index}`}
              >
                <div className="relative w-full rounded-t-xl flex items-end h-full group-hover:bg-slate-50/50 transition-colors p-1">
                  <div
                    className={cn(
                      "w-full rounded-t-xl transition-all duration-300 relative",
                      isActive
                        ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                        : "bg-blue-300 group-hover:bg-blue-400"
                    )}
                    style={{ height: `${dataPoint.height}%` }}
                  >
                    {/* Tooltip Hover (Desktop) */}
                    <div className="md:block hidden absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                      {formatValue(dataPoint.value)}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold transition-colors",
                    isActive
                      ? "text-blue-600 scale-110"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                  data-testid={`chart-label-${index}`}
                >
                  {dataPoint.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex flex-col gap-4">
        {/* Detail Card (Dynamic) */}
        <div
          className={cn(
            "flex-1 rounded-2xl p-5 border shadow-sm transition-all duration-300",
            activeItem
              ? "bg-blue-600 text-white border-blue-500 ring-4 ring-blue-500/10"
              : "bg-white text-slate-800 border-slate-100"
          )}
          data-testid="chart-detail-panel"
        >
          {activeItem ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase mb-1">
                <MousePointerClick size={14} /> Detail Periode
              </div>
              <h2 className="text-3xl font-black mb-1" data-testid="text-detail-period">
                {activeItem.label}
              </h2>
              <div className="w-full h-px bg-white/20 my-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-200 mb-1">Pendapatan</p>
                  <p className="text-xl font-bold" data-testid="text-detail-revenue">
                    {formatValue(activeItem.value)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-200 mb-1">Transaksi</p>
                  <p className="text-xl font-bold" data-testid="text-detail-transactions">
                    {activeItem.transactions} Order
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <BarChart3 size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-bold text-slate-500">Pilih Grafik</p>
              <p className="text-xs mt-1">
                Klik salah satu batang grafik untuk melihat rincian detail.
              </p>
            </div>
          )}
        </div>

        {/* Top Product Mini */}
        {topProduct && (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-fit" data-testid="card-top-product">
            <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
              <BarChart3 size={14} /> Top Product
            </h4>
            <div className="flex items-center gap-3">
              <img
                src={topProduct.image}
                className="w-12 h-12 rounded-lg object-cover"
                alt={topProduct.name}
                data-testid="img-top-product"
              />
              <div>
                <p className="text-sm font-bold text-slate-800" data-testid="text-top-product-name">
                  {topProduct.name}
                </p>
                <p className="text-[10px] text-slate-500" data-testid="text-top-product-stats">
                  {topProduct.sold} Terjual • {formatValue(topProduct.revenue)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
