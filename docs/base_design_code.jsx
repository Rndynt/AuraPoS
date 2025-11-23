import React, { useState, useMemo } from "react";
import {
  LayoutGrid,
  Coffee,
  UtensilsCrossed,
  ShoppingBag,
  Settings,
  LogOut,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  User,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Package,
  ChefHat,
  X,
  MapPin,
  Edit2,
  Square,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Box,
  Users2,
  FileText,
  Store,
  ChevronLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Calendar,
  AlertCircle,
  ArrowDownRight,
  MoreHorizontal,
  MousePointerClick,
  Layers,
  Truck,
  Grid,
  ToggleLeft,
  ToggleRight,
  Save,
  List,
  History,
  Shield,
  Key,
  Phone,
  Download,
  Filter,
  Printer,
  RefreshCcw,
} from "lucide-react";

// ==========================================
// 1. MOCK DATA (DATA DUMMY)
// ==========================================

const CATEGORIES = [
  { id: "all", name: "Semua", icon: LayoutGrid },
  { id: "burger", name: "Burger", icon: UtensilsCrossed },
  { id: "coffee", name: "Kopi", icon: Coffee },
  { id: "pizza", name: "Pizza", icon: UtensilsCrossed },
];

const PRODUCTS = [
  {
    id: 1,
    name: "Classic Beef Burger",
    price: 45000,
    category: "burger",
    stock: 15,
    stockTracking: true,
    sku: "BG-001",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60",
    variants: [
      {
        name: "Tingkat Kematangan",
        type: "radio",
        required: true,
        options: [
          { name: "Medium Well", price: 0 },
          { name: "Well Done", price: 0 },
        ],
      },
      {
        name: "Extra Topping",
        type: "checkbox",
        required: false,
        options: [
          { name: "Extra Cheese", price: 5000 },
          { name: "Egg", price: 4000 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Cappuccino Art",
    price: 25000,
    category: "coffee",
    stock: 50,
    stockTracking: false,
    sku: "CP-002",
    image:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60",
    variants: [
      {
        name: "Temperature",
        type: "radio",
        required: true,
        options: [
          { name: "Hot", price: 0 },
          { name: "Iced", price: 3000 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "French Fries",
    price: 18000,
    category: "snack",
    stock: 5,
    stockTracking: true,
    sku: "SN-003",
    image:
      "https://images.unsplash.com/photo-1541592103048-4e22ecc25e67?auto=format&fit=crop&w=500&q=60",
    variants: [],
  },
  {
    id: 4,
    name: "Supreme Pizza",
    price: 85000,
    category: "pizza",
    stock: 8,
    stockTracking: true,
    sku: "PZ-004",
    image:
      "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=60",
    variants: [],
  },
];

const TABLES = [
  {
    id: "T1",
    name: "Meja 1",
    capacity: 4,
    status: "occupied",
    orders: [{ id: "#ORD-001", items: 3, total: 145000, customer: "Budi S" }],
  },
  { id: "T2", name: "Meja 2", capacity: 2, status: "available", orders: [] },
  { id: "T3", name: "Meja 3", capacity: 4, status: "available", orders: [] },
  { id: "T4", name: "Meja 4", capacity: 6, status: "reserved", orders: [] },
  {
    id: "T5",
    name: "VIP 1",
    capacity: 8,
    status: "occupied",
    orders: [{ id: "#ORD-004", items: 12, total: 850000, customer: "PT Maju" }],
  },
  { id: "T6", name: "Meja 6", capacity: 2, status: "maintenance", orders: [] },
  { id: "T7", name: "Meja 7", capacity: 4, status: "available", orders: [] },
  { id: "T8", name: "Meja 8", capacity: 4, status: "available", orders: [] },
];

const CHART_DATA_SETS = {
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

const TOP_PRODUCTS = [
  {
    name: "Classic Beef Burger",
    sold: 45,
    revenue: 2025000,
    image: PRODUCTS[0].image,
  },
  {
    name: "Cappuccino Art",
    sold: 38,
    revenue: 950000,
    image: PRODUCTS[1].image,
  },
  {
    name: "Supreme Pizza",
    sold: 22,
    revenue: 1870000,
    image: PRODUCTS[3].image,
  },
];

const FEATURE_CATALOG = [
  {
    id: "module_table",
    title: "Table Management",
    description: "Denah meja digital & status meja.",
    icon: Grid,
    category: "Operasional",
    enabled: true,
    price: "Free",
  },
  {
    id: "module_kitchen",
    title: "Kitchen Display",
    description: "Kirim pesanan ke layar dapur.",
    icon: ChefHat,
    category: "Operasional",
    enabled: true,
    price: "Rp 50.000/bln",
  },
  {
    id: "order_delivery",
    title: "Delivery Management",
    description: "Pesanan pengiriman & alamat.",
    icon: Truck,
    category: "Tipe Pesanan",
    enabled: false,
    price: "Free",
  },
  {
    id: "order_qris",
    title: "QRIS Integration",
    description: "Pembayaran QRIS otomatis.",
    icon: CreditCard,
    category: "Pembayaran",
    enabled: true,
    price: "Fee Transaksi",
  },
  {
    id: "module_loyalty",
    title: "Member Loyalty",
    description: "Poin & database pelanggan.",
    icon: Users,
    category: "Marketing",
    enabled: false,
    price: "Rp 100.000/bln",
  },
];

const MOCK_EMPLOYEES = [
  { id: 1, name: "Andi Saputra", role: "Manager", status: "active" },
  { id: 2, name: "Siti Aminah", role: "Kasir", status: "active" },
  { id: 3, name: "Budi Santoso", role: "Waiter", status: "inactive" },
];

const STOCK_LOGS = [
  {
    id: 1,
    item: "Classic Beef Burger",
    change: -2,
    type: "sale",
    date: "10:30 AM",
  },
  {
    id: 2,
    item: "French Fries",
    change: +50,
    type: "restock",
    date: "09:00 AM",
  },
];

const TRANSACTION_HISTORY = [
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

const formatIDR = (price) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

// ==========================================
// 2. KOMPONEN UI HELPERS
// ==========================================

const CustomSelect = ({ value, onChange, options, className = "" }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={onChange}
      className="appearance-none w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      <ChevronDown size={16} />
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-slate-500">{label}</label>
    <input
      type={type}
      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

// ==========================================
// 3. MANAGEMENT VIEWS
// ==========================================

// --- 3F. REPORT VIEW (FIXED GRAPH & INTERACTIVE) ---
const ReportView = ({ onBack }) => {
  const [period, setPeriod] = useState("Hari Ini");
  const [activeChartItem, setActiveChartItem] = useState(null); // State untuk interaksi klik grafik

  const chartData = useMemo(() => {
    if (period === "Minggu Ini") return CHART_DATA_SETS.week;
    if (period === "Bulan Ini") return CHART_DATA_SETS.month;
    return CHART_DATA_SETS.today;
  }, [period]);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Laporan Penjualan
            </h1>
            <p className="text-xs text-slate-500">Analisis detail transaksi</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
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
          <button className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100">
            <Download size={18} />
          </button>
          <button className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200">
            <Printer size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. Financial Summary */}
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
            <span className="text-[10px] text-slate-400 mt-1">
              Estimasi 45% margin
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">
              Total Transaksi
            </p>
            <h3 className="text-2xl font-black text-slate-800">64</h3>
            <span className="text-[10px] text-slate-400 mt-1">
              Pesanan selesai
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">
              Rata-rata Order
            </p>
            <h3 className="text-2xl font-black text-slate-800">Rp 65rb</h3>
            <span className="text-[10px] text-slate-400 mt-1">
              Per pelanggan
            </span>
          </div>
        </div>

        {/* 2. Interactive Chart & Detail Grid */}
        <div className="grid md:grid-cols-[2fr_1fr] gap-4">
          {/* Chart Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
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

          {/* Detail Panel (Seragam dengan Dashboard) */}
          <div
            className={`rounded-xl p-5 border shadow-sm transition-all duration-300 ${
              activeChartItem
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-white text-slate-800 border-slate-100"
            }`}
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
                    <p className="text-2xl font-bold">
                      {formatIDR(activeChartItem.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-1">
                      Total Transaksi
                    </p>
                    <p className="text-xl font-bold">
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

        {/* 3. Transaction History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <List size={16} /> Riwayat Transaksi
            </h3>
            <button className="text-blue-600 text-xs font-bold hover:underline">
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
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-blue-600">{trx.id}</td>
                    <td className="p-4 text-slate-500">{trx.time}</td>
                    <td className="p-4 font-medium text-slate-700">
                      {trx.customer}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                        {trx.method}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      {formatIDR(trx.total)}
                    </td>
                    <td className="p-4 text-center">
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

// --- STOCK MANAGER ---
const StockManager = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Stok & Inventaris
            </h1>
            <p className="text-xs text-slate-500">Kelola ketersediaan produk</p>
          </div>
        </div>
        <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100">
          <History size={16} /> Riwayat
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
              <Package size={14} /> Total Item
            </div>
            <div className="text-2xl font-black text-slate-800">
              {PRODUCTS.length}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-1">
              <AlertCircle size={14} /> Stok Kritis
            </div>
            <div className="text-2xl font-black text-red-600">
              {PRODUCTS.filter((p) => p.stock < 10).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4 text-center">Sisa Stok</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PRODUCTS.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden">
                        <img
                          src={product.image}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          SKU: {product.sku}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded font-bold text-xs ${
                        product.stock < 10
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {product.stock} Unit
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 font-bold text-xs hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- EMPLOYEE MANAGER ---
const EmployeeManager = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold text-slate-800">Karyawan</h1>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
          <Plus size={16} /> Baru
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {MOCK_EMPLOYEES.map((emp) => (
            <div
              key={emp.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg border border-slate-200">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{emp.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase font-bold text-slate-500">
                      {emp.role}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        emp.status === "active"
                          ? "bg-green-500"
                          : "bg-slate-300"
                      }`}
                    ></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Key size={18} />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- STORE PROFILE ---
const StoreProfile = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Profil Toko</h1>
        </div>
        <button className="text-blue-600 font-bold text-sm hover:bg-blue-50 px-3 py-1.5 rounded-lg">
          Simpan
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full mb-4 flex items-center justify-center border-4 border-white shadow-lg">
            <Store size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Aura Pos Resto</h2>
          <p className="text-sm text-slate-500">ID: TENANT-88291</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b pb-2">
            Informasi
          </h3>
          <InputField label="Nama Usaha" value="Aura Pos Resto" />
          <InputField label="Telepon" value="+62 812-3456-7890" />
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Alamat</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              defaultValue="Jl. Sudirman No. 45"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PRODUCT MANAGER (FIXED UI SELECT) ---
const ProductManager = ({ onBack }) => {
  const [viewState, setViewState] = useState("list");
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Makanan",
    price: "",
    stockTracking: false,
    stockQty: 0,
    sku: "",
  });
  const [optionGroups, setOptionGroups] = useState([]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "Makanan",
      price: product.price,
      stockTracking: product.stock && product.stock < 999,
      stockQty: product.stock || 0,
      sku: product.sku || "",
    });
    if (product.variants) {
      const mappedGroups = product.variants.map((v, idx) => ({
        id: idx,
        name: v.name,
        type: v.type === "radio" ? "single" : "multiple",
        required: v.required,
        options: v.options.map((o) => ({ name: o.name, price: o.price })),
      }));
      setOptionGroups(mappedGroups);
    } else {
      setOptionGroups([]);
    }
    setViewState("form");
  };

  const handleAddGroup = () => {
    setOptionGroups([
      ...optionGroups,
      { id: Date.now(), name: "", type: "single", required: true, options: [] },
    ]);
  };

  const handleAddOption = (groupId) => {
    setOptionGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: [...g.options, { name: "", price: 0 }] }
          : g
      )
    );
  };

  if (viewState === "form") {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewState("list")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800">
              {editingProduct ? "Edit Produk" : "Tambah Produk"}
            </h2>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200">
            <Save size={16} /> Simpan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Box size={18} /> Informasi Dasar
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Nama Produk"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <InputField
                label="Harga (Rp)"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
              <InputField
                label="SKU"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">
                  Kategori
                </label>
                <CustomSelect
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  options={[
                    { value: "Makanan", label: "Makanan" },
                    { value: "Minuman", label: "Minuman" },
                    { value: "Snack", label: "Snack" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Lacak Stok?</p>
                <p className="text-xs text-slate-400">
                  Aktifkan jika stok terbatas.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {formData.stockTracking && (
                  <input
                    type="number"
                    className="w-24 border border-slate-200 rounded-lg p-2 text-sm text-center"
                    placeholder="Qty"
                    value={formData.stockQty}
                    onChange={(e) =>
                      setFormData({ ...formData, stockQty: e.target.value })
                    }
                  />
                )}
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      stockTracking: !formData.stockTracking,
                    })
                  }
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    formData.stockTracking ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      formData.stockTracking ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Layers size={18} /> Varian & Opsi
                </h3>
              </div>
              <button
                onClick={handleAddGroup}
                className="text-blue-600 text-xs font-bold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                + Tambah Grup
              </button>
            </div>
            <div className="space-y-6">
              {optionGroups.map((group, idx) => (
                <div
                  key={group.id}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 p-4 flex flex-col md:flex-row gap-3 md:items-center border-b border-slate-200">
                    <input
                      type="text"
                      placeholder="Nama Grup (mis: Ukuran)"
                      className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold w-full md:w-64 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={group.name}
                      onChange={(e) => {
                        const newG = [...optionGroups];
                        newG[idx].name = e.target.value;
                        setOptionGroups(newG);
                      }}
                    />
                    <div className="w-full md:w-48">
                      <CustomSelect
                        value={group.type}
                        onChange={(e) => {
                          const newG = [...optionGroups];
                          newG[idx].type = e.target.value;
                          setOptionGroups(newG);
                        }}
                        options={[
                          { value: "single", label: "Pilih Satu (Radio)" },
                          { value: "multiple", label: "Pilih Banyak (Check)" },
                        ]}
                      />
                    </div>
                    <button className="text-red-500 hover:bg-red-50 p-2 rounded-lg ml-auto transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    {group.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Nama Opsi (mis: Pedas)"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={opt.name}
                            onChange={() => {}}
                          />
                        </div>
                        <div className="relative w-32">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            Rp
                          </div>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-right focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={opt.price}
                            onChange={() => {}}
                          />
                        </div>
                        <button className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddOption(group.id)}
                      className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Plus size={14} /> Tambah Opsi
                    </button>
                  </div>
                </div>
              ))}
              {optionGroups.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center gap-2">
                  <Layers size={32} className="opacity-20" />
                  <p>Belum ada varian.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold text-slate-800">Produk</h1>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setOptionGroups([]);
            setViewState("form");
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200"
        >
          <Plus size={18} /> Tambah
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {PRODUCTS.map((product) => (
          <div
            key={product.id}
            onClick={() => handleEdit(product)}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 cursor-pointer transition-all group"
          >
            <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
              <img
                src={product.image}
                className="w-full h-full object-cover"
                alt={product.name}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 truncate">
                  {product.name}
                </h4>
                <span className="font-bold text-blue-600 text-sm">
                  {formatIDR(product.price)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    product.stock < 10
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  Stok: {product.stock}
                </span>
                <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 rounded">
                  SKU: {product.sku}
                </span>
              </div>
            </div>
            <ChevronLeft
              className="text-slate-300 rotate-180 group-hover:text-blue-500"
              size={20}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// --- FEATURE MARKETPLACE ---
const FeatureMarketplace = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold text-slate-800">App Market</h1>
        </div>
        <p className="text-sm text-slate-500 ml-11">
          Kelola fitur aktif sesuai kebutuhan bisnis.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {[...new Set(FEATURE_CATALOG.map((f) => f.category))].map((cat) => (
          <div key={cat} className="mb-8">
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider border-l-4 border-blue-600 pl-2">
              {cat}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {FEATURE_CATALOG.filter((f) => f.category === cat).map(
                (feature) => (
                  <div
                    key={feature.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      feature.enabled
                        ? "bg-white border-blue-200 shadow-blue-100 shadow-sm"
                        : "bg-slate-50 border-slate-200 opacity-70 hover:opacity-100 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          feature.enabled
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <feature.icon size={20} />
                      </div>
                      <div className="flex flex-col items-end">
                        <button
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            feature.enabled ? "bg-blue-600" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              feature.enabled
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 mt-1">
                          {feature.enabled ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-slate-500 mb-4 min-h-[40px] line-clamp-2">
                      {feature.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-200">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          feature.price === "Free"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {feature.price}
                      </span>
                      <button className="text-xs font-bold text-blue-600 hover:underline">
                        Konfigurasi
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 3. DASHBOARD VIEW (FIXED PRO VERSION)
// ==========================================
const DashboardView = ({ onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [activeChartItem, setActiveChartItem] = useState(null);

  const currentChartData =
    CHART_DATA_SETS[selectedPeriod] || CHART_DATA_SETS.today;

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Dashboard</h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Analisa Performa
            </p>
          </div>
        </div>
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setActiveChartItem(null);
            }}
            className="appearance-none bg-white border border-slate-200 pl-9 pr-8 py-2 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
          >
            <option value="today">Hari Ini</option>
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
      </header>

      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase mb-2">
                <Wallet size={14} />{" "}
                {selectedPeriod === "today" ? "Omset Sales" : "Total Revenue"}
              </div>
              <div className="text-2xl md:text-3xl font-black tracking-tight">
                {selectedPeriod === "today"
                  ? "Rp 4.2jt"
                  : selectedPeriod === "week"
                  ? "Rp 28.5jt"
                  : "Rp 110.5jt"}
              </div>
              <div className="text-[10px] text-blue-50 font-medium flex items-center gap-1 mt-2 bg-white/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm">
                <TrendingUp size={10} /> +18% Trend
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
              <ShoppingBag size={14} /> Transaksi
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-800">
              {selectedPeriod === "today" ? "64" : "452"}
            </div>
            <div className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
              <CheckCircle size={10} /> Paid
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
              <ArrowDownRight size={14} /> Avg. Bill
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-800">
              Rp 65rb
            </div>
            <div className="text-[10px] text-slate-400 mt-2">Per pelanggan</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-2">
              <AlertCircle size={14} /> Stok Menipis
            </div>
            <div className="text-2xl md:text-3xl font-black text-red-600">
              2 Item
            </div>
            <div className="text-[10px] text-red-400 mt-2 font-medium">
              Segera restock!
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="grid md:grid-cols-[2fr_1fr] gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600" /> Grafik
                  Penjualan
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Klik pada batang grafik untuk melihat detail.
                </p>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-3 px-2 pb-2 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-px bg-slate-50"></div>
                ))}
              </div>
              {currentChartData.map((data, index) => {
                const isActive = activeChartItem?.label === data.label;
                return (
                  <div
                    key={index}
                    onClick={() => setActiveChartItem(data)}
                    className="flex flex-col items-center gap-3 flex-1 group cursor-pointer h-full justify-end z-10"
                  >
                    <div className="relative w-full rounded-t-xl flex items-end h-full group-hover:bg-slate-50/50 transition-colors p-1">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-300 relative ${
                          isActive
                            ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            : "bg-blue-300 group-hover:bg-blue-400"
                        }`}
                        style={{ height: `${data.height}%` }}
                      >
                        <div className="md:block hidden absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                          {formatIDR(data.value)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold transition-colors ${
                        isActive
                          ? "text-blue-600 scale-110"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      {data.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="flex flex-col gap-4">
            <div
              className={`flex-1 rounded-2xl p-5 border shadow-sm transition-all duration-300 ${
                activeChartItem
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-white text-slate-800 border-slate-100"
              }`}
            >
              {activeChartItem ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase mb-1">
                    <MousePointerClick size={14} /> Detail Periode
                  </div>
                  <h2 className="text-3xl font-black mb-1">
                    {activeChartItem.label}
                  </h2>
                  <div className="w-full h-px bg-white/20 my-4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-200 mb-1">Pendapatan</p>
                      <p className="text-xl font-bold">
                        {formatIDR(activeChartItem.value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-200 mb-1">Transaksi</p>
                      <p className="text-xl font-bold">
                        {activeChartItem.transactions} Order
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <BarChart3 size={48} className="mb-3 opacity-20" />
                  <p className="text-sm font-bold text-slate-500">
                    Pilih Grafik
                  </p>
                  <p className="text-xs mt-1">
                    Klik batang grafik untuk detail.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-fit">
              <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <ChefHat size={14} /> Top Product
              </h4>
              <div className="flex items-center gap-3">
                <img
                  src={TOP_PRODUCTS[0].image}
                  className="w-12 h-12 rounded-lg object-cover"
                  alt=""
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {TOP_PRODUCTS[0].name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {TOP_PRODUCTS[0].sold} Terjual •{" "}
                    {formatIDR(TOP_PRODUCTS[0].revenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* C. PAYMENT METHODS & ALERTS */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Payment Methods */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">
              Metode Pembayaran
            </h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-4 bg-slate-100">
              <div
                className="bg-green-500 h-full"
                style={{ width: "45%" }}
              ></div>
              <div
                className="bg-blue-500 h-full"
                style={{ width: "35%" }}
              ></div>
              <div
                className="bg-purple-500 h-full"
                style={{ width: "20%" }}
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" /> Peringatan
                Sistem
              </h3>
            </div>
            <div className="p-2">
              {PRODUCTS.filter((p) => p.stock < 10).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border-b border-slate-50 last:border-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden">
                      <img
                        src={item.image}
                        className="w-full h-full object-cover"
                        alt=""
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
};

// ==========================================
// 4. POS VIEW (FIXED - TIDAK DIUBAH)
// ==========================================
const POSView = ({ onGoToTables, onGoToSettings }) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine-in");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [customerName, setCustomerName] = useState("Walk-in Guest");
  const [tableNumber, setTableNumber] = useState("12");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOptions, setModalOptions] = useState({});
  const [modalQty, setModalQty] = useState(1);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory =
        activeCategory === "all" || product.category === activeCategory;
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleProductClick = (product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setModalQty(1);
      const defaultOptions = {};
      product.variants.forEach((v) => {
        if (v.type === "radio" && v.required && v.options.length > 0)
          defaultOptions[v.name] = v.options[0];
        else if (v.type === "checkbox") defaultOptions[v.name] = [];
      });
      setModalOptions(defaultOptions);
    } else {
      addToCart(product, [], 1);
    }
  };

  const addToCart = (product, selectedVariants = [], quantity = 1) => {
    const variantPrice = selectedVariants.reduce((acc, curr) => {
      if (Array.isArray(curr.value))
        return acc + curr.value.reduce((sum, item) => sum + item.price, 0);
      return acc + (curr.value.price || 0);
    }, 0);
    const finalPrice = product.price + variantPrice;
    const uniqueId = `${product.id}-${JSON.stringify(selectedVariants)}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.uniqueId === uniqueId
      );
      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].qty += quantity;
        return newCart;
      }
      return [
        ...prev,
        {
          ...product,
          uniqueId,
          price: finalPrice,
          basePrice: product.price,
          qty: quantity,
          selectedVariants,
        },
      ];
    });
    setSelectedProduct(null);
  };

  const updateQty = (uniqueId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.uniqueId === uniqueId
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleConfirmModal = () => {
    const variantsArray = Object.keys(modalOptions).map((key) => ({
      name: key,
      value: modalOptions[key],
    }));
    addToCart(selectedProduct, variantsArray, modalQty);
  };

  const calculateModalTotal = () => {
    if (!selectedProduct) return 0;
    let total = selectedProduct.price;
    Object.keys(modalOptions).forEach((key) => {
      const val = modalOptions[key];
      if (Array.isArray(val)) val.forEach((v) => (total += v.price));
      else if (val) total += val.price;
    });
    return total * modalQty;
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
      {/* MODAL PRODUK - Z-Index 70 agar di atas segalanya */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedProduct.name}
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {selectedProduct.variants.map((variant, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between">
                    <h4 className="font-bold text-slate-700 text-sm">
                      {variant.name}
                    </h4>
                    {variant.required && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        Wajib
                      </span>
                    )}
                  </div>
                  {variant.options.map((opt, optIdx) => {
                    const isSelected =
                      variant.type === "radio"
                        ? modalOptions[variant.name]?.name === opt.name
                        : modalOptions[variant.name]?.some(
                            (i) => i.name === opt.name
                          );
                    return (
                      <label
                        key={optIdx}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              isSelected
                                ? "font-semibold text-blue-900"
                                : "text-slate-600"
                            }`}
                          >
                            {opt.name}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className="text-xs font-medium text-slate-500">
                            +{formatIDR(opt.price)}
                          </span>
                        )}
                        <input
                          type={variant.type === "radio" ? "radio" : "checkbox"}
                          className="hidden"
                          checked={!!isSelected}
                          onChange={() => {
                            setModalOptions((prev) => {
                              if (variant.type === "radio")
                                return { ...prev, [variant.name]: opt };
                              const list = prev[variant.name] || [];
                              const exists = list.find(
                                (i) => i.name === opt.name
                              );
                              return {
                                ...prev,
                                [variant.name]: exists
                                  ? list.filter((i) => i.name !== opt.name)
                                  : [...list, opt],
                              };
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              ))}
              <div className="pt-4 border-t border-dashed border-slate-200">
                <p className="font-bold text-sm text-slate-700 mb-3">Jumlah</p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="w-10 h-10 rounded-full border hover:bg-slate-50"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-xl font-bold w-8 text-center">
                    {modalQty}
                  </span>
                  <button
                    onClick={() => setModalQty(modalQty + 1)}
                    className="w-10 h-10 rounded-full border hover:bg-slate-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
              <button
                onClick={handleConfirmModal}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-between px-6 hover:bg-blue-700"
              >
                <span>Tambah</span>
                <span>{formatIDR(calculateModalTotal())}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
        <header className="px-4 md:px-8 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">
              Resto POS Pro
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> Cabang Pusat
              </span>
              <span>•</span>
              <span className="text-green-600 font-bold">Online</span>
            </div>
          </div>
          <div className="w-1/3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari menu..."
              className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>
        <div className="px-4 md:px-8 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                <cat.icon size={16} /> {cat.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="group bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 active:scale-95 hover:shadow-md cursor-pointer relative h-full flex flex-col"
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg mb-2 bg-slate-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur text-white text-[10px] font-medium px-2 py-0.5 rounded">
                    {product.stock} Stok
                  </div>
                  {product.variants?.length > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 bg-white/90 text-slate-800 p-1 rounded shadow-sm">
                      <SlidersHorizontal size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="mt-auto">
                    <span className="text-blue-600 font-bold text-base">
                      {formatIDR(product.price).replace(",00", "")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[55] md:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}
      <aside
        className={`fixed md:relative top-0 bottom-0 right-0 z-[60] bg-white border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 w-full md:w-[380px] h-[95vh] mt-[5vh] md:mt-0 md:h-auto ${
          isCartOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"
        } rounded-t-[2rem] md:rounded-none`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white rounded-t-[2rem] md:rounded-none relative z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(false)}
              className="md:hidden p-1 bg-slate-100 rounded-full"
            >
              <ChevronDown size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800">Pesanan Baru</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
              #ORD-255
            </div>
            <button
              onClick={() => setCart([])}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col relative z-0">
          <div className="p-4 bg-white border-b border-slate-100 shadow-sm z-10">
            <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1 mb-4">
              {["dine-in", "take-away", "delivery"].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`text-[11px] font-bold py-2 rounded-lg capitalize flex items-center justify-center gap-1 ${
                    orderType === type
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-400"
                  }`}
                >
                  {type.replace("-", " ")}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-3 hover:border-blue-300 transition-colors group">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm group-hover:text-blue-500">
                  <User size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    Pelanggan
                  </p>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none"
                  />
                </div>
                <Edit2
                  size={12}
                  className="text-slate-300 opacity-0 group-hover:opacity-100"
                />
              </div>
              {orderType === "dine-in" && (
                <div className="w-20 bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center hover:border-blue-300 cursor-pointer group">
                  <p className="text-[10px] text-slate-400 uppercase font-bold text-center">
                    Meja
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-black text-slate-700">
                      {tableNumber}
                    </span>
                    <Edit2
                      size={10}
                      className="text-slate-300 opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3 pb-40 md:pb-6 flex-1">
            {cart.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                <ShoppingBag size={48} className="mb-3 opacity-50" />
                <p className="text-sm font-medium">Belum ada pesanan</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.uniqueId}
                  className="flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      className="w-full h-full object-cover"
                      alt={item.name}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-700 text-sm truncate pr-4">
                        {item.name}
                      </h4>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">
                        {formatIDR(item.price * item.qty)}
                      </span>
                    </div>
                    {item.selectedVariants?.length > 0 && (
                      <div className="text-[10px] text-slate-500 my-1 bg-slate-50 p-1.5 rounded border border-slate-100 w-max max-w-full">
                        {item.selectedVariants.map((v, i) => (
                          <span key={i} className="block truncate">
                            • {v.name}:{" "}
                            {Array.isArray(v.value)
                              ? v.value.map((x) => x.name).join(", ")
                              : v.value.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() =>
                          setCart((c) =>
                            c.filter((x) => x.uniqueId !== item.uniqueId)
                          )
                        }
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                        <button
                          onClick={() => updateQty(item.uniqueId, -1)}
                          className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.uniqueId, 1)}
                          className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="absolute md:relative bottom-0 left-0 right-0 z-30">
          <div
            className={`absolute bottom-full left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-5 rounded-t-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out -z-10 ${
              isSummaryExpanded
                ? "translate-y-4 opacity-100 visible pb-6"
                : "translate-y-full opacity-0 invisible"
            }`}
          >
            <div className="space-y-3 pb-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Pajak (11%)</span>
                <span>{formatIDR(tax)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border-t border-slate-200 p-5 pb-6 shadow-[0_-5px_25px_rgba(0,0,0,0.1)] relative z-20">
            <div
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-400 w-12 h-6 flex items-center justify-center rounded-full shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95"
            >
              <ChevronUp
                size={16}
                className={`transition-transform duration-300 ${
                  isSummaryExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="cursor-pointer group"
              >
                <p className="text-xs text-slate-400 font-medium group-hover:text-blue-600 transition-colors">
                  Total Tagihan
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-slate-800">
                    {formatIDR(total)}
                  </span>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 md:hidden">
                    Detail
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr] gap-3">
              <button
                disabled={cart.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2 text-sm">
                  <ChefHat size={18} />
                  <span>Simpan</span>
                </div>
                <span className="text-[10px] opacity-80 font-normal">
                  Ke Dapur
                </span>
              </button>
              <button
                disabled={cart.length === 0}
                className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-3.5 rounded-xl font-bold flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Banknote size={18} />
                  <span>Bayar</span>
                </div>
                <span className="text-[10px] opacity-80 font-normal">
                  Tutup Bill
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]">
        <button className="flex flex-col items-center gap-0.5 text-blue-600">
          <LayoutGrid size={20} />
          <span className="text-[10px]">Menu</span>
        </button>
        <button
          onClick={onGoToTables}
          className="flex flex-col items-center gap-0.5 text-slate-400"
        >
          <Square size={20} />
          <span className="text-[10px]">Meja</span>
        </button>
        <div className="relative -top-5">
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 border-4 border-slate-50 transition-transform"
          >
            <ShoppingBag size={24} />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-800">
                {totalItems}
              </span>
            )}
          </button>
        </div>
        <button className="flex flex-col items-center gap-0.5 text-slate-400">
          <CreditCard size={20} />
          <span className="text-[10px]">Bill</span>
        </button>
        <button
          onClick={onGoToSettings}
          className="flex flex-col items-center gap-0.5 text-slate-400"
        >
          <Settings size={20} />
          <span className="text-[10px]">Set</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 5. TABLE VIEW (FIXED - TIDAK DIUBAH)
// ==========================================
const TableView = ({ onContinueOrder, onGoToPOS, onGoToSettings }) => {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchTable, setSearchTable] = useState("");
  const availableCount = TABLES.filter((t) => t.status === "available").length;
  const occupiedCount = TABLES.filter((t) => t.status === "occupied").length;
  const filteredTables = TABLES.filter((t) => {
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesSearch = t.name
      .toLowerCase()
      .includes(searchTable.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-blue-600 text-white shadow-blue-200";
      case "occupied":
        return "bg-slate-200 text-slate-600";
      case "reserved":
        return "bg-orange-100 text-orange-600 border-orange-200 border";
      case "maintenance":
        return "bg-red-600 text-white shadow-red-200";
      default:
        return "bg-slate-100 text-slate-400";
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 relative">
      <div className="flex-1 flex flex-col min-w-0 h-full relative pb-[60px] md:pb-0">
        <div className="bg-white border-b border-slate-200 p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Tables</h1>
              <p className="text-slate-500 text-sm">
                Manage restaurant tables layout
              </p>
            </div>
            <div className="flex gap-2 text-xs font-bold">
              <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                {availableCount} Avail
              </div>
              <div className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">
                {occupiedCount} Occu
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tables..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {["all", "available", "occupied", "reserved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    filterStatus === status
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {status}{" "}
                  {status !== "all" &&
                    `(${TABLES.filter((t) => t.status === status).length})`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTables.map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`relative aspect-video md:aspect-[4/3] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group border border-transparent ${
                  selectedTable?.id === table.id
                    ? "ring-4 ring-blue-500/20 border-blue-500 z-10"
                    : ""
                } ${
                  table.status === "available"
                    ? "bg-white border-slate-200 hover:border-blue-300"
                    : table.status === "occupied"
                    ? "bg-slate-100 border-slate-200"
                    : table.status === "maintenance"
                    ? "bg-red-50 border-red-100"
                    : "bg-orange-50 border-orange-100"
                }`}
              >
                <div
                  className={`absolute top-3 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(
                    table.status
                  )}`}
                >
                  {table.status}
                </div>
                <span className="text-3xl font-black text-slate-800 mt-4">
                  {table.name.replace("Meja ", "")}
                </span>
                <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                  <Users size={14} />
                  <span>{table.capacity}</span>
                </div>
                {table.orders.length > 0 && (
                  <div className="absolute bottom-3 flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-slate-100">
                    <Clock size={12} className="text-orange-500" />
                    <span className="text-[10px] font-bold text-slate-600">
                      25m
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {selectedTable && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[55] md:hidden"
          onClick={() => setSelectedTable(null)}
        />
      )}
      <div
        className={`fixed md:relative inset-x-0 bottom-0 md:inset-auto md:w-[400px] md:h-full z-[60] bg-white border-l border-slate-200 shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-out ${
          selectedTable
            ? "translate-y-0"
            : "translate-y-full md:translate-x-full md:translate-y-0 md:w-0 md:border-none"
        } rounded-t-3xl md:rounded-none h-[85vh] md:h-auto`}
      >
        {selectedTable ? (
          <>
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                  Table Details
                </h2>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="font-bold text-slate-800 text-lg">
                    {selectedTable.name}
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Users size={14} /> {selectedTable.capacity} people
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Status
                </h3>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold capitalize ${getStatusColor(
                    selectedTable.status
                  )}`}
                >
                  {selectedTable.status === "maintenance" ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {selectedTable.status}
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShoppingBag size={16} /> Active Orders (
                {selectedTable.orders.length})
              </h3>
              {selectedTable.orders.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center gap-2 text-slate-400">
                  <UtensilsCrossed size={32} className="opacity-50" />
                  <p className="text-sm">No active orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTable.orders.map((order, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit mb-1">
                            {order.id}
                          </div>
                          <div className="font-bold text-slate-700 text-sm">
                            {order.customer}
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">
                          UNPAID
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Classic Beef Burger x2</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Cappuccino x1</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-600">
                          Total
                        </span>
                        <span className="text-lg font-black text-slate-800">
                          {formatIDR(order.total)}
                        </span>
                      </div>
                      <button
                        onClick={() => onContinueOrder(selectedTable)}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Edit2 size={14} /> Continue Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 bg-white">
              {selectedTable.status === "available" ? (
                <button
                  onClick={() => onContinueOrder(selectedTable)}
                  className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900"
                >
                  Check In / New Order
                </button>
              ) : (
                <button className="w-full bg-green-50 text-green-700 border border-green-200 py-3 rounded-xl font-bold hover:bg-green-100 flex items-center justify-center gap-2">
                  <Banknote size={18} /> Checkout & Payment
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Select a table
          </div>
        )}
      </div>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]">
        <button
          onClick={onGoToPOS}
          className="flex flex-col items-center gap-0.5 text-slate-400"
        >
          <LayoutGrid size={20} />
          <span className="text-[10px]">Menu</span>
        </button>
        <button
          onClick={() => {}}
          className="flex flex-col items-center gap-0.5 text-blue-600"
        >
          <Square size={20} />
          <span className="text-[10px]">Meja</span>
        </button>
        <div className="w-14"></div>
        <button className="flex flex-col items-center gap-0.5 text-slate-400">
          <CreditCard size={20} />
          <span className="text-[10px]">Bill</span>
        </button>
        <button
          onClick={onGoToSettings}
          className="flex flex-col items-center gap-0.5 text-slate-400"
        >
          <Settings size={20} />
          <span className="text-[10px]">Set</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 6. MANAGEMENT HUB (GATEWAY)
// ==========================================
const ManagementHub = ({ onBack, onNavigate }) => {
  const [internalRoute, setInternalRoute] = useState("menu");

  const MENU_ITEMS = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: BarChart3,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "products",
      title: "Produk",
      icon: Box,
      color: "bg-orange-100 text-orange-600",
      action: () => setInternalRoute("products"),
    },
    {
      id: "features",
      title: "App Store",
      icon: Package,
      color: "bg-purple-100 text-purple-600",
      action: () => setInternalRoute("features"),
    },
    {
      id: "stock",
      title: "Stok",
      icon: Package,
      color: "bg-yellow-100 text-yellow-600",
      action: () => setInternalRoute("stock"),
    },
    {
      id: "employees",
      title: "Karyawan",
      icon: Users2,
      color: "bg-green-100 text-green-600",
      action: () => setInternalRoute("employees"),
    },
    {
      id: "reports",
      title: "Laporan",
      icon: FileText,
      color: "bg-pink-100 text-pink-600",
      action: () => setInternalRoute("reports"),
    }, // NEW ACTION
    {
      id: "store",
      title: "Profil Toko",
      icon: Store,
      color: "bg-slate-100 text-slate-600",
      action: () => setInternalRoute("store"),
    },
  ];

  if (internalRoute === "products")
    return <ProductManager onBack={() => setInternalRoute("menu")} />;
  if (internalRoute === "features")
    return <FeatureMarketplace onBack={() => setInternalRoute("menu")} />;
  if (internalRoute === "stock")
    return <StockManager onBack={() => setInternalRoute("menu")} />;
  if (internalRoute === "employees")
    return <EmployeeManager onBack={() => setInternalRoute("menu")} />;
  if (internalRoute === "store")
    return <StoreProfile onBack={() => setInternalRoute("menu")} />;
  if (internalRoute === "reports")
    return <ReportView onBack={() => setInternalRoute("menu")} />; // NEW ROUTE

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto pb-20">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-slate-800">Manajemen</h1>
        <p className="text-xs text-slate-500">Pengaturan toko & laporan</p>
      </header>

      <div className="p-4">
        <div className="bg-slate-800 text-white p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-slate-300">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
            AP
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Aura Pos Resto</h3>
            <p className="text-xs text-slate-300">Cabang Pusat • Owner</p>
          </div>
          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => (item.action ? item.action() : onNavigate(item.id))}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-start gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}
            >
              <item.icon size={20} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-slate-700">{item.title}</h4>
              <p className="text-[10px] text-slate-400">
                Kelola {item.title.toLowerCase()}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4">
        <button className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
          <LogOut size={18} />
          Keluar Aplikasi
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-4">
          AuraPOS v1.0.2 • Build 20231122
        </p>
      </div>
    </div>
  );
};

// ==========================================
// 7. APP ROOT
// ==========================================
export default function App() {
  const [activeView, setActiveView] = useState("pos");
  const [currentTable, setCurrentTable] = useState(null);

  const handleContinueOrder = (table) => {
    setCurrentTable(table);
    setActiveView("pos");
    alert(`Membuka pesanan untuk ${table.name}`);
  };

  const renderContent = () => {
    switch (activeView) {
      case "pos":
        return (
          <POSView
            onGoToTables={() => setActiveView("tables")}
            onGoToSettings={() => setActiveView("management")}
          />
        );
      case "tables":
        return (
          <TableView
            onContinueOrder={handleContinueOrder}
            onGoToPOS={() => setActiveView("pos")}
            onGoToSettings={() => setActiveView("management")}
          />
        );
      case "management":
        return (
          <ManagementHub
            onBack={() => setActiveView("pos")}
            onNavigate={(route) =>
              setActiveView(route === "dashboard" ? "dashboard" : "management")
            }
          />
        );
      case "dashboard":
        return <DashboardView onBack={() => setActiveView("management")} />;
      default:
        return <POSView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-20 bg-white border-r border-slate-200 flex-col items-center py-6 flex-shrink-0 z-30">
        <div className="mb-8 p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
          <ShoppingBag className="text-white w-6 h-6" />
        </div>
        <nav className="flex-1 w-full flex flex-col gap-4 px-2">
          <button
            onClick={() => setActiveView("pos")}
            className={`p-3 rounded-xl transition-all flex justify-center group relative ${
              activeView === "pos"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid size={22} />
            <span className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              POS Menu
            </span>
          </button>
          <button
            onClick={() => setActiveView("tables")}
            className={`p-3 rounded-xl transition-all flex justify-center group relative ${
              activeView === "tables"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <Square size={22} />
            <span className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Tables
            </span>
          </button>
          <button
            onClick={() => setActiveView("management")}
            className={`p-3 rounded-xl transition-all flex justify-center group relative ${
              ["management", "dashboard"].includes(activeView)
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <Settings size={22} />
            <span className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Management
            </span>
          </button>
        </nav>
        <button className="p-3 text-slate-400 hover:text-red-500">
          <LogOut size={22} />
        </button>
      </aside>

      {/* Konten Utama */}
      <div className="flex-1 min-w-0 h-full relative flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
}