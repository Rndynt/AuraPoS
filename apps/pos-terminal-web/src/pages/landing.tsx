import { useState, useEffect, useRef } from "react";
import { DeviceMockup } from "@/components/landing/DeviceMockup";

const FEATURES = [
  {
    key: "pos",
    label: "POS Terminal",
    title: "Kasir digital yang cepat",
    desc: "Pilih produk, kelola cart, proses pembayaran — semua dari satu layar yang responsif.",
    bullets: ["Pencarian produk instan", "Filter kategori dinamis", "Draft order tanpa batas", "Quick charge 1 klik"],
    device: "laptop" as const,
    src: "/mockup-assets/pos-desktop",
  },
  {
    key: "payment",
    label: "Pembayaran",
    title: "Semua metode pembayaran",
    desc: "Cash, QRIS, Transfer Bank. Dukung DP, multi-payment, dan split bill dalam satu transaksi.",
    bullets: ["Tunai, QRIS Manual, Transfer", "Down Payment & Angsuran", "Multi Payment & Split Bill", "Riwayat pembayaran lengkap"],
    device: "laptop" as const,
    src: "/mockup-assets/payment-dialog",
  },
  {
    key: "orders",
    label: "Pesanan",
    title: "Semua pesanan aktif",
    desc: "Dine In, Take Away, Delivery — dalam satu tampilan. Status real-time dari draft hingga selesai.",
    bullets: ["Board pesanan aktif", "Filter per jenis layanan", "Update status real-time", "Histori pesanan lengkap"],
    device: "laptop" as const,
    src: "/mockup-assets/active-orders",
  },
  {
    key: "tables",
    label: "Manajemen Meja",
    title: "Denah meja yang visual",
    desc: "Lihat status setiap meja sekaligus — tersedia, terisi, atau reservasi.",
    bullets: ["Floor plan visual", "Status real-time per meja", "Reservasi meja", "Multi-lantai support"],
    device: "laptop" as const,
    src: "/mockup-assets/restaurant-tables",
  },
  {
    key: "reports",
    label: "Laporan",
    title: "Data bisnis di genggaman",
    desc: "Omzet, transaksi, produk terlaris, dan breakdown pembayaran — kapan saja.",
    bullets: ["Dashboard penjualan harian", "Laporan per produk", "Breakdown metode bayar", "Ekspor PDF & Excel"],
    device: "phone" as const,
    src: "/mockup-assets/reports-mobile",
  },
];

const STATS = [
  { val: "50rb+", label: "Transaksi diproses" },
  { val: "500+", label: "Outlet aktif" },
  { val: "4.9★", label: "Rating pengguna" },
  { val: "99.9%", label: "Uptime" },
];

const PLANS = [
  {
    name: "Starter", price: "Gratis", period: "", popular: false,
    features: ["1 Outlet", "1 Kasir", "POS Terminal", "50 Produk", "Laporan Dasar"],
  },
  {
    name: "Growth", price: "Rp 149.000", period: "/bulan", popular: true,
    features: ["5 Outlet", "10 Kasir", "POS + Meja + Dapur", "Produk Tak Terbatas", "Multi Payment & Split Bill", "Inventori", "Laporan Lengkap"],
  },
  {
    name: "Pro", price: "Rp 349.000", period: "/bulan", popular: false,
    features: ["Outlet Tak Terbatas", "Kasir Tak Terbatas", "Semua Fitur Growth", "API Access", "Prioritas Support", "White Label"],
  },
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const feat = FEATURES[activeFeature];

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden text-slate-900">

      {/* ── Navbar ─────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${scrolled ? "bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-black">A</div>
            <span className={`text-sm font-bold ${scrolled ? "text-slate-900" : "text-white"}`}>AuraPoS</span>
          </div>
          <div className="hidden md:flex items-center gap-5">
            {["Fitur", "Harga"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <a href="/login" className={`hidden sm:block text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>Masuk</a>
            <a href="/register" className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">Mulai Gratis</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative bg-slate-950 overflow-hidden pt-14">
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-0 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-blue-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistem POS Modern untuk Bisnis Indonesia
          </div>

          <h1 className="text-[2rem] sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-4">
            Kasir Digital untuk<br />
            <span className="text-blue-400">Bisnis Modern</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-7 px-2 sm:px-0">
            Kelola transaksi, produk, pesanan, dan laporan dari satu platform yang cepat dan mudah.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 mb-12 max-w-xs sm:max-w-none mx-auto">
            <a href="/register"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm text-center transition-colors shadow-lg shadow-blue-900/40">
              Mulai Gratis Sekarang →
            </a>
            <a href="#fitur"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-sm text-center transition-colors">
              Lihat Fitur
            </a>
          </div>

          {/* Hero mockup — laptop frame, hide on tiny screens */}
          <div className="relative justify-center hidden sm:flex">
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent z-10" />
            <DeviceMockup type="laptop" src="/mockup-assets/pos-desktop" displayWidth={760} />
          </div>
          {/* Mobile: smaller phone mockup instead of laptop */}
          <div className="flex sm:hidden justify-center pb-4">
            <DeviceMockup type="phone" src="/mockup-assets/pos-desktop" displayWidth={180} />
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────── */}
      <section className="border-y border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{s.val}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section id="fitur" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Fitur</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Semua yang kamu butuhkan</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Dari transaksi sederhana hingga manajemen restoran kompleks — dalam satu platform.</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {FEATURES.map((f, i) => (
              <button key={f.key} onClick={() => setActiveFeature(i)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border ${i === activeFeature
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text */}
            <div className="order-2 lg:order-1">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">{feat.title}</h3>
              <p className="text-slate-500 mb-6 leading-relaxed">{feat.desc}</p>
              <ul className="space-y-2.5 mb-8">
                {feat.bullets.map(b => (
                  <li key={b} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                        <path d="M1 3.5L3 5.5L7 1" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-slate-700 text-sm font-medium">{b}</span>
                  </li>
                ))}
              </ul>
              <a href="/register" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                Coba Gratis →
              </a>
            </div>

            {/* Device */}
            <div className="order-1 lg:order-2 flex justify-center">
              {feat.device === "phone"
                ? <DeviceMockup type="phone" src={feat.src} displayWidth={200} />
                : <DeviceMockup type="laptop" src={feat.src} displayWidth={500} />
              }
            </div>
          </div>
        </div>
      </section>

      {/* ── For whom ────────────────────────────────── */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Cocok untuk</p>
            <h2 className="text-3xl font-black text-slate-900">Untuk semua jenis bisnis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "☕", type: "Kafe & Restoran", desc: "POS cepat, manajemen meja, kitchen display, dan menu digital.", tags: ["Table Service", "KDS", "Split Bill"] },
              { icon: "🏪", type: "Retail & Minimarket", desc: "Stok real-time, barcode scanner, laporan produk terlaris.", tags: ["Barcode", "Multi-Kasir", "Inventori"] },
              { icon: "🧺", type: "Laundry & Jasa", desc: "Order per layanan, tracking status, sistem loyalti pelanggan.", tags: ["Layanan", "Loyalti", "Pickup"] },
            ].map(b => (
              <div key={b.type} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-blue-100 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{b.icon}</div>
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{b.type}</h3>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{b.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {b.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────── */}
      <section id="harga" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Harga</p>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Transparan, tanpa hidden fee</h2>
            <p className="text-slate-500 text-sm">Batalkan kapan saja. Tidak perlu kartu kredit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl border p-5 flex flex-col ${plan.popular
                ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-200"
                : "bg-white border-slate-200"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-black tracking-wide">
                    POPULER
                  </div>
                )}
                <div className={`text-xs font-bold mb-1 ${plan.popular ? "text-blue-200" : "text-slate-500"}`}>{plan.name}</div>
                <div className={`text-2xl font-black mb-0.5 ${plan.popular ? "text-white" : "text-slate-900"}`}>{plan.price}</div>
                <div className={`text-xs mb-5 ${plan.popular ? "text-blue-300" : "text-slate-400"}`}>{plan.period || "selamanya"}</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-xs ${plan.popular ? "text-blue-100" : "text-slate-600"}`}>
                      <span className={`mt-0.5 flex-shrink-0 ${plan.popular ? "text-blue-300" : "text-blue-500"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/register" className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${plan.popular
                  ? "bg-white text-blue-700 hover:bg-blue-50"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                }`}>
                  {plan.name === "Starter" ? "Mulai Gratis" : "Coba 14 Hari"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="bg-slate-950 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Siap mulai sekarang?</h2>
          <p className="text-slate-400 mb-8 text-sm sm:text-base">Bergabung dengan ratusan outlet yang sudah menggunakan AuraPoS.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/register" className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors">
              Daftar Gratis →
            </a>
            <a href="/login" className="w-full sm:w-auto px-7 py-3 rounded-xl border border-white/10 text-white/80 hover:text-white font-semibold text-sm transition-colors">
              Sudah punya akun
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">A</div>
            <span className="text-sm font-bold text-slate-700">AuraPoS</span>
          </div>
          <div className="text-xs text-slate-400">© 2026 AuraPoS · Dibuat di Indonesia</div>
          <div className="flex gap-4">
            {["Privasi", "Syarat", "Dukungan"].map(l => (
              <a key={l} href="#" className="text-xs text-slate-400 hover:text-slate-700">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
