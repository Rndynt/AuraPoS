import { useState } from "react";
import { mockupProducts, mockupCartItems, mockupSubtotal, mockupTax, mockupTotal, mockupCategories, formatRp } from "../fixtures";

const NAV_ITEMS = [
  { icon: "⊞", label: "POS", active: true },
  { icon: "📋", label: "Pesanan", active: false },
  { icon: "🪑", label: "Meja", active: false },
  { icon: "🍳", label: "Dapur", active: false },
  { icon: "📊", label: "Laporan", active: false },
  { icon: "📦", label: "Produk", active: false },
  { icon: "🏪", label: "Inventori", active: false },
];

export default function MockupPOSDesktopPage() {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const filtered = activeCategory === "Semua" ? mockupProducts : mockupProducts.filter(p => p.category === activeCategory);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-slate-50 font-sans select-none">
      {/* Sidebar */}
      <div className="w-[200px] flex-shrink-0 bg-slate-900 flex flex-col h-full">
        <div className="px-4 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">A</div>
            <div>
              <div className="text-white text-sm font-bold leading-tight">AuraPoS</div>
              <div className="text-slate-400 text-[10px]">Aura Coffee</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <div key={item.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${item.active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
              <span className="text-base leading-none">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">A</div>
            <div>
              <div className="text-slate-200 text-xs font-medium">Ayu Lestari</div>
              <div className="text-slate-500 text-[10px]">Kasir</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-base font-bold text-slate-800">Kasir POS</div>
            <div className="text-xs text-slate-400">Selasa, 24 Juni 2026 · 19:29</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">● Online</div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 font-medium">Dine In</div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-slate-400 text-sm">🔍</span>
            <span className="text-slate-400 text-sm">Cari produk...</span>
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-hidden">
            {mockupCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeCategory === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(product => (
              <div key={product.id} className={`bg-white rounded-xl border border-slate-100 p-3.5 cursor-pointer transition-all hover:shadow-md hover:border-blue-100 ${!product.available ? "opacity-50" : ""}`}>
                <div className="w-full aspect-square rounded-lg bg-slate-50 flex items-center justify-center text-3xl mb-3">{product.emoji}</div>
                <div className="text-xs text-slate-400 mb-0.5">{product.category}</div>
                <div className="text-sm font-semibold text-slate-800 leading-tight mb-1">{product.name}</div>
                <div className="text-sm font-bold text-blue-600">{formatRp(product.price)}</div>
                {!product.available && <div className="text-[10px] text-red-500 mt-1 font-medium">Habis</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-[300px] flex-shrink-0 bg-white border-l border-slate-100 flex flex-col h-full">
        <div className="px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="font-bold text-slate-800 text-sm">Keranjang</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dine In · Meja 03</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {mockupCartItems.map((ci, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-xl flex-shrink-0">{ci.product.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 leading-tight truncate">{ci.product.name}</div>
                <div className="text-[11px] text-slate-400">{formatRp(ci.product.price)} × {ci.qty}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">−</button>
                <span className="text-xs font-bold text-slate-800 w-4 text-center">{ci.qty}</span>
                <button className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pt-3 pb-4 border-t border-slate-100 flex-shrink-0 space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span><span className="font-medium text-slate-700">{formatRp(mockupSubtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Pajak (11%)</span><span className="font-medium text-slate-700">{formatRp(mockupTax)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-800">Total</span>
            <span className="text-base font-black text-blue-600">{formatRp(mockupTotal)}</span>
          </div>
          <button className="w-full mt-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold">Bayar Sekarang</button>
          <button className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">Simpan Draft</button>
        </div>
      </div>
    </div>
  );
}
