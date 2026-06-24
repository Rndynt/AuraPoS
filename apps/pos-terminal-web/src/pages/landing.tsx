import { useState, useEffect, useRef } from "react";
import { DeviceMockup } from "@/components/landing/DeviceMockup";

const FEATURES = [
  {
    key: "pos",
    icon: "⊞",
    label: "POS Terminal",
    title: "Kasir digital yang cepat dan intuitif",
    desc: "Pilih produk, kelola cart, proses pembayaran. Semua dari satu layar yang responsif — desktop, tablet, maupun mobile.",
    bullets: ["Pencarian produk instan", "Kategori produk dinamis", "Draft order tanpa batas", "Shortcut kasir cepat"],
    device: "laptop" as const,
    src: "/mockup-assets/pos-desktop",
    color: "blue",
  },
  {
    key: "payment",
    icon: "💳",
    label: "Pembayaran",
    title: "Fleksibel di setiap transaksi",
    desc: "Cash, QRIS Manual, Transfer Bank. Dukung DP, multi-payment, dan split bill. Tidak ada transaksi yang tidak bisa ditangani.",
    bullets: ["Tunai, QRIS, Transfer Bank", "Down Payment & Angsuran", "Multi Payment & Split Bill", "Riwayat pembayaran lengkap"],
    device: "laptop" as const,
    src: "/mockup-assets/payment-dialog",
    color: "emerald",
  },
  {
    key: "orders",
    icon: "📋",
    label: "Manajemen Pesanan",
    title: "Pantau semua pesanan aktif",
    desc: "Dine In, Take Away, Delivery — dalam satu tampilan. Status real-time dari draft hingga selesai.",
    bullets: ["Board pesanan aktif", "Filter per jenis layanan", "Status update real-time", "Histori pesanan lengkap"],
    device: "laptop" as const,
    src: "/mockup-assets/active-orders",
    color: "amber",
  },
  {
    key: "restaurant",
    icon: "🪑",
    label: "Manajemen Meja",
    title: "Denah meja restoran yang visual",
    desc: "Lihat status setiap meja sekaligus — tersedia, terisi, atau reservasi. Kelola order per meja dengan mudah.",
    bullets: ["Floor plan visual interaktif", "Status real-time per meja", "Multi-lantai support", "Reservasi meja"],
    device: "laptop" as const,
    src: "/mockup-assets/restaurant-tables",
    color: "purple",
  },
  {
    key: "inventory",
    icon: "📦",
    label: "Inventori",
    title: "Kontrol stok tanpa spreadsheet",
    desc: "Monitor stok bahan baku, packaging, dan produk jadi. Peringatan otomatis saat stok mendekati batas minimum.",
    bullets: ["Stok real-time per item", "Alert stok rendah otomatis", "Opname & penyesuaian stok", "Riwayat pergerakan stok"],
    device: "laptop" as const,
    src: "/mockup-assets/inventory",
    color: "orange",
  },
  {
    key: "reports",
    icon: "📊",
    label: "Laporan",
    title: "Data bisnis di genggaman tangan",
    desc: "Lihat omzet, transaksi, produk terlaris, dan metode pembayaran — kapan saja, dari perangkat apa saja.",
    bullets: ["Dashboard penjualan harian", "Laporan per produk & kasir", "Breakdown metode pembayaran", "Ekspor laporan PDF/Excel"],
    device: "phone" as const,
    src: "/mockup-assets/reports-mobile",
    color: "rose",
  },
];

const COLOR = {
  blue: { tab: "bg-blue-600 text-white", dot: "bg-blue-600", border: "border-blue-500", glow: "shadow-blue-500/20", text: "text-blue-600", bullet: "bg-blue-100 text-blue-700" },
  emerald: { tab: "bg-emerald-600 text-white", dot: "bg-emerald-600", border: "border-emerald-500", glow: "shadow-emerald-500/20", text: "text-emerald-600", bullet: "bg-emerald-100 text-emerald-700" },
  amber: { tab: "bg-amber-500 text-white", dot: "bg-amber-500", border: "border-amber-500", glow: "shadow-amber-500/20", text: "text-amber-600", bullet: "bg-amber-100 text-amber-700" },
  purple: { tab: "bg-purple-600 text-white", dot: "bg-purple-600", border: "border-purple-500", glow: "shadow-purple-500/20", text: "text-purple-600", bullet: "bg-purple-100 text-purple-700" },
  orange: { tab: "bg-orange-500 text-white", dot: "bg-orange-500", border: "border-orange-500", glow: "shadow-orange-500/20", text: "text-orange-600", bullet: "bg-orange-100 text-orange-700" },
  rose: { tab: "bg-rose-500 text-white", dot: "bg-rose-500", border: "border-rose-500", glow: "shadow-rose-500/20", text: "text-rose-600", bullet: "bg-rose-100 text-rose-700" },
};

const STATS = [
  { val: "50.000+", label: "Transaksi diproses" },
  { val: "500+", label: "Outlet aktif" },
  { val: "4.9★", label: "Rating pengguna" },
  { val: "99.9%", label: "Uptime SLA" },
];

const PLANS = [
  {
    name: "Starter", price: "Gratis", period: "", popular: false, color: "bg-slate-50 border-slate-200",
    features: ["1 Outlet", "1 Kasir", "POS Terminal", "Laporan Dasar", "50 Produk"],
  },
  {
    name: "Growth", price: "Rp 149.000", period: "/bulan", popular: true, color: "bg-blue-600 border-blue-700",
    features: ["5 Outlet", "10 Kasir", "POS + Meja + Dapur", "Laporan Lengkap", "Produk Tak Terbatas", "Multi Payment & Split Bill", "Inventori"],
  },
  {
    name: "Pro", price: "Rp 349.000", period: "/bulan", popular: false, color: "bg-slate-50 border-slate-200",
    features: ["Outlet Tak Terbatas", "Kasir Tak Terbatas", "Semua Fitur Growth", "API Access", "Prioritas Support", "Custom Domain", "White Label"],
  },
];

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const feat = FEATURES[activeFeature];
  const col = COLOR[feat.color as keyof typeof COLOR];
  const { ref: statsRef, inView: statsInView } = useInView();
  const { ref: featRef, inView: featInView } = useInView();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-black">A</div>
            <span className={`text-base font-black ${scrolled ? "text-slate-800" : "text-white"}`}>AuraPoS</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {["Fitur", "Harga", "Demo"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className={`text-sm font-medium transition-colors ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"}`}>Masuk</a>
            <a href="/register" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/30">Mulai Gratis</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #1e3a5f 100%)" }}>
        {/* Grid bg */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem POS Modern untuk Bisnis Indonesia
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
              Kasir Digital{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                untuk Bisnis
              </span>
              {" "}Modern
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
              Kelola transaksi, produk, pesanan, dan laporan dari satu platform yang cepat, handal, dan mudah digunakan. Untuk kafe, restoran, dan retail Indonesia.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/register" className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all shadow-2xl shadow-blue-600/40 hover:shadow-blue-500/50 hover:-translate-y-0.5 transform">
                Mulai Gratis Sekarang →
              </a>
              <a href="#fitur" className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-lg transition-all">
                Lihat Fitur
              </a>
            </div>
          </div>

          {/* Hero device mockup */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl" />
              <DeviceMockup
                type="laptop"
                src="/mockup-assets/pos-desktop"
                displayWidth={680}
              />
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 80" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div key={s.label}
                className={`text-center transition-all duration-700 ${statsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-3xl md:text-4xl font-black text-slate-900 mb-1">{s.val}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* Features */}
      <section id="fitur" ref={featRef} className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-14 transition-all duration-700 ${featInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Fitur Lengkap</div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Semua yang kamu butuhkan,<br />dalam satu platform</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Dari transaksi sederhana hingga manajemen restoran kompleks — AuraPoS siap mengakomodasi bisnis kamu.</p>
          </div>

          {/* Feature tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {FEATURES.map((f, i) => {
              const c = COLOR[f.color as keyof typeof COLOR];
              const active = activeFeature === i;
              return (
                <button key={f.key} onClick={() => setActiveFeature(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? `${c.tab} shadow-lg` : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Feature content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-500 ${featInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 ${col.bullet}`}>
                <span>{feat.icon}</span>
                <span>{feat.label}</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 leading-tight">{feat.title}</h3>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">{feat.desc}</p>
              <ul className="space-y-3">
                {feat.bullets.map(b => (
                  <li key={b} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${col.bullet}`}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-slate-700 font-medium">{b}</span>
                  </li>
                ))}
              </ul>
              <a href="/register" className={`inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all ${col.tab} hover:opacity-90 shadow-lg`}>
                Coba Gratis <span>→</span>
              </a>
            </div>

            <div className={`flex justify-center lg:justify-end transition-all duration-500 delay-100 ${featInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
              <div className="relative">
                <div className={`absolute -inset-6 rounded-3xl blur-2xl opacity-20 ${col.dot}`} />
                {feat.device === "phone" ? (
                  <DeviceMockup type="phone" src={feat.src} displayWidth={220} />
                ) : (
                  <DeviceMockup type="laptop" src={feat.src} displayWidth={540} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* Business types */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Cocok untuk</div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Untuk semua jenis bisnis</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "☕", type: "Kafe & Restoran", desc: "POS cepat, manajemen meja, kitchen display, dan menu digital.", tags: ["Table Service", "KDS", "Split Bill"] },
              { icon: "🏪", type: "Retail & Minimarket", desc: "Barcode scanner, stok real-time, laporan produk terlaris.", tags: ["Barcode", "Multi-Kasir", "Inventori"] },
              { icon: "🧺", type: "Laundry & Jasa", desc: "Order per layanan, tracking status, dan sistem loyalti pelanggan.", tags: ["Layanan", "Loyalti", "Jadwal Pickup"] },
            ].map(b => (
              <div key={b.type} className="group bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-100 rounded-2xl p-6 transition-all hover:shadow-lg cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mb-4">{b.icon}</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{b.type}</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">{b.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {b.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Harga Transparan</div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Mulai gratis, upgrade sesuai kebutuhan</h2>
            <p className="text-slate-500">Tanpa hidden fee. Batalkan kapan saja.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl border p-6 ${plan.popular ? "bg-blue-600 border-blue-700 shadow-2xl shadow-blue-600/30 scale-105" : "bg-white border-slate-200"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                    Paling Populer
                  </div>
                )}
                <div className={`text-sm font-bold mb-2 ${plan.popular ? "text-blue-200" : "text-slate-500"}`}>{plan.name}</div>
                <div className={`text-3xl font-black mb-0.5 ${plan.popular ? "text-white" : "text-slate-900"}`}>{plan.price}</div>
                <div className={`text-xs mb-6 ${plan.popular ? "text-blue-300" : "text-slate-400"}`}>{plan.period || "selamanya"}</div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.popular ? "text-blue-100" : "text-slate-600"}`}>
                      <span className={`text-xs ${plan.popular ? "text-blue-300" : "text-emerald-500"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/register" className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                  {plan.name === "Starter" ? "Mulai Gratis" : "Coba 14 Hari Gratis"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Siap transformasikan bisnis kamu?</h2>
          <p className="text-lg text-slate-500 mb-10">Bergabung dengan ratusan outlet yang sudah menggunakan AuraPoS. Gratis, tanpa kartu kredit.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/register" className="px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-all shadow-2xl shadow-blue-600/30 hover:-translate-y-0.5 transform">
              Daftar Sekarang — Gratis
            </a>
            <a href="/login" className="px-10 py-4 rounded-2xl border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-lg transition-all">
              Sudah punya akun? Masuk
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black">A</div>
              <span className="text-sm font-bold text-slate-700">AuraPoS</span>
            </div>
            <div className="text-xs text-slate-400">© 2026 AuraPoS. Dibuat dengan ❤️ di Indonesia.</div>
            <div className="flex items-center gap-4">
              {["Privasi", "Syarat", "Dukungan"].map(l => (
                <a key={l} href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
