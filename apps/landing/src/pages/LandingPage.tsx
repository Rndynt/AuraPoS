import { useState, useEffect } from "react";
import { DeviceMockup } from "@/components/DeviceMockup";
import { WifiOff, Wifi, Check, Clock3 } from "lucide-react";

const POS_APP_URL = import.meta.env.VITE_POS_APP_URL ?? "";
const appHref = (path: string) => `${POS_APP_URL}${path}`;

const FEATURES = [
  {
    key: "pos",
    label: "Kasir",
    title: "Layar kasir yang gak bikin antre",
    desc: "Cari produk, susun pesanan, dan terima pembayaran dari satu layar — dirancang untuk kecepatan tangan kasir, bukan tatapan admin.",
    bullets: ["Pencarian produk instan", "Kategori & varian rapi", "Simpan pesanan jadi draft", "Bayar cepat satu sentuhan"],
    device: "tablet" as const,
    src: "/mockup-assets/pos-desktop",
    dw: 540,
  },
  {
    key: "payment",
    label: "Pembayaran",
    title: "Satu tagihan, segala cara bayar",
    desc: "Tunai, QRIS, transfer bank — termasuk DP, cicilan, dan tagihan yang dipisah per pelanggan, tanpa kalkulator tambahan.",
    bullets: ["Tunai, QRIS, transfer bank", "DP & pembayaran bertahap", "Tagihan bisa dipisah per orang", "Riwayat pembayaran tercatat rapi"],
    device: "tablet" as const,
    src: "/mockup-assets/payment-dialog",
    dw: 540,
  },
  {
    key: "orders",
    label: "Pesanan",
    title: "Semua pesanan, satu papan",
    desc: "Dine in, take away, delivery — terlihat sekaligus dengan status yang ter-update sendiri dari dapur sampai meja pelanggan.",
    bullets: ["Papan pesanan real-time", "Pisahkan per jenis layanan", "Status berjalan otomatis", "Histori lengkap, gampang dicari"],
    device: "tablet" as const,
    src: "/mockup-assets/active-orders",
    dw: 540,
  },
  {
    key: "tables",
    label: "Meja",
    title: "Denah meja yang langsung kebaca",
    desc: "Sekali lihat, tahu meja mana yang kosong, terisi, atau sudah dipesan — tanpa harus tanya pelayan.",
    bullets: ["Denah visual per area", "Status meja real-time", "Reservasi meja", "Cocok untuk banyak lantai"],
    device: "tablet" as const,
    src: "/mockup-assets/restaurant-tables",
    dw: 540,
  },
  {
    key: "reports",
    label: "Laporan",
    title: "Omzet hari ini, di saku kamu",
    desc: "Buka dari ponsel pribadi kapan saja — tanpa harus duduk di depan kasir untuk tahu performa toko.",
    bullets: ["Ringkasan omzet harian", "Produk paling laku", "Rekap per metode bayar", "Ekspor ke PDF & Excel"],
    device: "phone" as const,
    src: "/mockup-assets/reports-mobile",
    dw: 190,
  },
];

const STATS = [
  { val: "50rb+", label: "Transaksi diproses" },
  { val: "500+", label: "Outlet aktif" },
  { val: "4.9", label: "Rating pengguna" },
  { val: "99.9%", label: "Uptime" },
];

const PLANS = [
  {
    name: "Starter", price: "Gratis", period: "", popular: false,
    features: ["1 Outlet", "1 Kasir", "Kasir Digital", "50 Produk", "Laporan Dasar"],
  },
  {
    name: "Growth", price: "Rp 149.000", period: "/bulan", popular: true,
    features: ["5 Outlet", "10 Kasir", "Kasir + Meja + Dapur", "Produk Tak Terbatas", "Semua Metode Bayar", "Inventori", "Laporan Lengkap"],
  },
  {
    name: "Pro", price: "Rp 349.000", period: "/bulan", popular: false,
    features: ["Outlet Tak Terbatas", "Kasir Tak Terbatas", "Semua Fitur Growth", "Akses API", "Prioritas Support", "White Label"],
  },
];

const OFFLINE_POINTS = [
  {
    icon: "🧾",
    title: "Transaksi gak pernah macet",
    desc: "WiFi mati, listrik kedip, sinyal hilang — kasir tetap mencatat setiap pesanan dan pembayaran seperti biasa.",
  },
  {
    icon: "🔄",
    title: "Sinkron sendiri pas online lagi",
    desc: "Begitu koneksi kembali, semua transaksi yang tertunda naik ke cloud otomatis. Gak perlu input ulang.",
  },
  {
    icon: "🔒",
    title: "Data aman di perangkat",
    desc: "Setiap kasir punya salinan data sendiri di perangkatnya — restart atau mati mendadak gak bikin data hilang.",
  },
];

/* ── Interactive signature element ───────────────────────────────────────
   Demonstrates the offline-first promise with one click instead of just
   claiming it in a bullet point. Ticket rows use a dashed perforation edge
   as a nod to a physical receipt — the literal output of a POS. */
function OfflineSyncDemo() {
  const [online, setOnline] = useState(true);
  const [justSynced, setJustSynced] = useState(false);

  function toggle() {
    if (online) {
      setOnline(false);
      setJustSynced(false);
    } else {
      setOnline(true);
      setJustSynced(true);
      window.setTimeout(() => setJustSynced(false), 2200);
    }
  }

  const tickets = [
    { id: "#A-041", label: "2× Americano, 1× Nasi Goreng", amount: "Rp 76.000" },
    { id: "#A-042", label: "1× Cappuccino, 1× Croissant", amount: "Rp 44.000" },
    { id: "#A-043", label: "3× Es Kopi Susu", amount: "Rp 72.000" },
  ];

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-dashed border-slate-200 transition-colors hover:bg-slate-50"
        aria-pressed={!online}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {online
            ? <Wifi size={16} className="text-emerald-500" />
            : <WifiOff size={16} className="text-amber-500" />}
          {online ? "Internet tersambung" : "Internet terputus"}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${online ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
          Coba klik
        </span>
      </button>

      <div className="px-4 py-3 space-y-2.5">
        {tickets.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-dashed border-slate-100 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-data text-[11px] font-bold text-slate-400">{t.id}</span>
                <span className="font-data text-[11px] font-semibold text-slate-700">{t.amount}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">{t.label}</div>
            </div>
            <span
              className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full transition-colors duration-300 ${
                online
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {online ? <Check size={11} /> : <Clock3 size={11} />}
              {online ? "Tersinkron" : "Menunggu"}
            </span>
          </div>
        ))}
      </div>

      <div className={`px-4 py-2.5 text-[11px] font-medium text-center transition-colors duration-300 ${online ? "bg-emerald-50/60 text-emerald-700" : "bg-amber-50/60 text-amber-700"}`}>
        {justSynced
          ? "✓ 3 transaksi baru saja tersinkron ke cloud"
          : online
            ? "Setiap transaksi otomatis naik ke cloud"
            : "Kasir tetap mencatat — gak ada transaksi yang hilang"}
      </div>
    </div>
  );
}

/* Inline CSS for the cross-fade animation */
const ANIM_STYLE = `
  @keyframes landingFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .feat-text-enter { animation: landingFadeUp 0.25s ease forwards; }
  .device-slot { transition: opacity 0.3s ease; }
  .device-slot[data-active="false"] { opacity: 0; pointer-events: none; }
  .device-slot[data-active="true"]  { opacity: 1; pointer-events: auto; }
`;

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [textKey, setTextKey] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function switchFeature(i: number) {
    if (i === activeFeature) return;
    setActiveFeature(i);
    setTextKey(k => k + 1); // triggers re-mount → triggers animation
  }

  const feat = FEATURES[activeFeature];

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden text-slate-900">
      <style>{ANIM_STYLE}</style>

      {/* ── Navbar ──────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${scrolled ? "bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-black font-display">A</div>
            <span className={`font-display text-sm font-bold ${scrolled ? "text-slate-900" : "text-white"}`}>AuraPoS</span>
          </div>
          <div className="hidden md:flex items-center gap-5">
            {["Fitur", "Offline", "Harga"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <a href={appHref("/login")} className={`hidden sm:block text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>Masuk</a>
            <a href={appHref("/register")} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">Mulai Gratis</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative bg-slate-950 overflow-hidden pt-14">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 lg:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">

            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-blue-300 text-xs font-medium mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Offline-First — tetap jalan walau internet mati
              </div>

              <h1 className="font-display text-[2rem] sm:text-5xl lg:text-[3.25rem] font-extrabold text-white leading-[1.1] tracking-tight mb-4">
                Kasir digital yang<br />
                <span className="text-blue-400">gak pernah berhenti</span>
              </h1>

              <p className="text-sm sm:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-7">
                Internet di toko sering putus-putus? AuraPoS tetap mencatat setiap transaksi, lalu sinkron sendiri begitu koneksi kembali.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 max-w-xs sm:max-w-none mx-auto lg:mx-0">
                <a href={appHref("/register")} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm text-center transition-colors shadow-lg shadow-blue-900/40">
                  Mulai Gratis Sekarang →
                </a>
                <a href="#offline" className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-sm text-center transition-colors">
                  Lihat Cara Kerjanya
                </a>
              </div>
            </div>

            {/* Signature interactive element — works at every breakpoint */}
            <div className="flex justify-center lg:justify-end">
              <OfflineSyncDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────  */}
      <section className="border-y border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="font-data text-2xl sm:text-3xl font-bold text-slate-900">{s.val}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Offline-First ───────────────────────────────  */}
      <section id="offline" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Offline-First</p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">Dibangun untuk koneksi yang gak ideal</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Banyak POS berbasis cloud berhenti total saat internet putus. AuraPoS dirancang sebaliknya — internet itu bonus, bukan syarat.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {OFFLINE_POINTS.map(p => (
              <div key={p.title} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-2xl mb-3">{p.icon}</div>
                <h3 className="font-display text-sm font-bold text-slate-900 mb-1.5">{p.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────  */}
      <section id="fitur" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Fitur</p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">Semua yang kamu butuhkan</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Dari transaksi sederhana hingga manajemen restoran kompleks — dalam satu platform.</p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {FEATURES.map((f, i) => (
              <button key={f.key} onClick={() => switchFeature(i)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border ${i === activeFeature
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Content: text left, device right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Text — re-mounts on tab change, triggers CSS enter animation */}
            <div key={textKey} className="order-2 lg:order-1 feat-text-enter">
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">{feat.title}</h3>
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
              <a href={appHref("/register")} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                Coba Gratis →
              </a>
            </div>

            {/* Device mockups — ALL pre-rendered in DOM, toggled via opacity only */}
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative flex items-center justify-center" style={{ width: 580, height: 440 }}>
                {FEATURES.map((f, i) => (
                  <div
                    key={f.key}
                    className="device-slot absolute inset-0 flex items-center justify-center"
                    data-active={String(i === activeFeature)}
                    aria-hidden={i !== activeFeature}
                  >
                    <DeviceMockup type={f.device} src={f.src} displayWidth={f.dw} />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── For whom ────────────────────────────────────  */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Cocok untuk</p>
            <h2 className="font-display text-3xl font-extrabold text-slate-900">Untuk semua jenis bisnis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "☕", type: "Kafe & Restoran", desc: "Kasir cepat, denah meja, layar dapur, dan menu digital dalam satu sistem.", tags: ["Layanan Meja", "Layar Dapur", "Split Bill"] },
              { icon: "🏪", type: "Retail & Minimarket", desc: "Stok real-time, pemindai barcode, dan laporan produk terlaris.", tags: ["Barcode", "Multi-Kasir", "Inventori"] },
              { icon: "🧺", type: "Laundry & Jasa", desc: "Pesanan per layanan, pelacakan status, dan loyalti pelanggan.", tags: ["Layanan", "Loyalti", "Pickup"] },
            ].map(b => (
              <div key={b.type} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-blue-100 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{b.icon}</div>
                <h3 className="font-display text-sm font-bold text-slate-900 mb-1.5">{b.type}</h3>
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

      {/* ── Pricing ─────────────────────────────────────  */}
      <section id="harga" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Harga</p>
            <h2 className="font-display text-3xl font-extrabold text-slate-900 mb-2">Transparan, tanpa biaya tersembunyi</h2>
            <p className="text-slate-500 text-sm">Batalkan kapan saja. Tidak perlu kartu kredit.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl border p-5 flex flex-col ${plan.popular
                ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-200"
                : "bg-white border-slate-200"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-black tracking-wide whitespace-nowrap">
                    PALING POPULER
                  </div>
                )}
                <div className={`text-xs font-bold mb-1 ${plan.popular ? "text-blue-200" : "text-slate-500"}`}>{plan.name}</div>
                <div className={`font-data text-2xl font-bold mb-0.5 ${plan.popular ? "text-white" : "text-slate-900"}`}>{plan.price}</div>
                <div className={`text-xs mb-5 ${plan.popular ? "text-blue-300" : "text-slate-400"}`}>{plan.period || "selamanya"}</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-xs ${plan.popular ? "text-blue-100" : "text-slate-600"}`}>
                      <span className={`mt-0.5 flex-shrink-0 ${plan.popular ? "text-blue-300" : "text-blue-500"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={appHref("/register")} className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${plan.popular
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

      {/* ── CTA ─────────────────────────────────────────  */}
      <section className="bg-slate-950 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-3">Siap mulai sekarang?</h2>
          <p className="text-slate-400 mb-8 text-sm sm:text-base">Bergabung dengan ratusan outlet yang sudah menggunakan AuraPoS.</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto">
            <a href={appHref("/register")} className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm text-center transition-colors">
              Daftar Gratis →
            </a>
            <a href={appHref("/login")} className="px-7 py-3 rounded-xl border border-white/10 text-white/80 hover:text-white font-semibold text-sm text-center transition-colors">
              Sudah punya akun
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────  */}
      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-black font-display">A</div>
            <span className="font-display text-sm font-bold text-slate-700">AuraPoS</span>
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
