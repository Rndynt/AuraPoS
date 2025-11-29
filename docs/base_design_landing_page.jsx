import React, { useState } from "react";
import {
  ArrowRight,
  Coffee,
  ShoppingBag,
  Shirt,
  Scissors,
  Smartphone,
  CheckCircle2,
  BarChart3,
  Globe,
  ShieldCheck,
  Zap,
  Menu,
  X,
  ChevronRight,
  Package,
  LayoutGrid,
  CreditCard,
  ChefHat,
  Truck,
  Users
} from "lucide-react";

// ==========================================
// 1. BRAND IDENTITY (NEW ABSTRACT LOGO - NO BOX)
// ==========================================

const AuraLogo = ({ size = "md", color = "blue" }) => {
  // Ukuran Logo
  const iconSize = size === "lg" ? 48 : 32;
  const textSize = size === "lg" ? "text-3xl" : "text-xl";
  
  // Warna Logo
  // Jika mode 'white', icon putih. Jika mode 'blue', icon menggunakan gradasi biru.
  const iconClass = color === "white" ? "text-white" : "text-blue-600";
  const textClass = color === "white" ? "text-white" : "text-slate-900";

  return (
    <div className="flex items-center gap-2 font-black tracking-tighter select-none group cursor-pointer">
      {/* Logo Abstrak Tanpa Kotak */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconClass} transition-transform group-hover:scale-110 duration-300`}
      >
        {/* Pilar 1 (Kiri - Kecil) */}
        <path d="M8 20L12 12V28L8 32V20Z" fill="currentColor" fillOpacity="0.6" />
        {/* Pilar 2 (Tengah - Sedang) */}
        <path d="M18 14L22 4V30L18 36V14Z" fill="currentColor" fillOpacity="0.8" />
        {/* Pilar 3 (Kanan - Besar/Utama) */}
        <path d="M28 8L32 0V34L28 40V8Z" fill="currentColor" />
      </svg>
      
      <span className={`${textSize} ${textClass}`}>
        Aura<span className={color === "white" ? "text-blue-200" : "text-blue-600"}>POS</span>
      </span>
    </div>
  );
};

// ==========================================
// 2. DATA CONTENT
// ==========================================

const BUSINESS_SOLUTIONS = [
  {
    id: "fnb",
    title: "Food & Beverage",
    tagline: "Cafe, Restoran, & Food Court",
    desc: "Kelola meja, pesanan dapur, dan menu variatif.",
    icon: Coffee,
    color: "text-orange-600 bg-orange-50",
  },
  {
    id: "retail",
    title: "Retail Store",
    tagline: "Minimarket & Toko Kelontong",
    desc: "Scan barcode cepat dan pantau stok otomatis.",
    icon: ShoppingBag,
    color: "text-blue-600 bg-blue-50",
  },
  {
    id: "laundry",
    title: "Jasa Laundry",
    tagline: "Laundry Kiloan & Satuan",
    desc: "Catat cucian, estimasi selesai, dan notifikasi WA.",
    icon: Shirt,
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    id: "service",
    title: "Jasa & Salon",
    tagline: "Barbershop, Salon & Bengkel",
    desc: "Booking jadwal dan hitung komisi karyawan.",
    icon: Scissors,
    color: "text-pink-600 bg-pink-50",
  },
  {
    id: "digital",
    title: "Digital PPOB",
    tagline: "Konter Pulsa & Loket Bayar",
    desc: "Jual pulsa & bayar tagihan tanpa stok fisik.",
    icon: Smartphone,
    color: "text-purple-600 bg-purple-50",
  }
];

const MARKETPLACE_FEATURES = [
  {
    title: "Kitchen Display",
    category: "F&B",
    desc: "Layar pesanan dapur digital pengganti printer kertas.",
    price: "Berlangganan",
    icon: ChefHat
  },
  {
    title: "Manajemen Meja",
    category: "F&B",
    desc: "Atur denah meja dan status (kosong/terisi) real-time.",
    price: "Sekali Beli",
    icon: LayoutGrid
  },
  {
    title: "Integrasi QRIS",
    category: "Payment",
    desc: "Terima pembayaran QRIS otomatis langsung di aplikasi.",
    price: "Gratis",
    icon: CreditCard
  },
  {
    title: "Manajemen Kurir",
    category: "Retail",
    desc: "Lacak pengiriman barang kurir toko sendiri.",
    price: "Sekali Beli",
    icon: Truck
  },
  {
    title: "Membership",
    category: "Marketing",
    desc: "Sistem poin dan level member untuk retensi pelanggan.",
    price: "Sekali Beli",
    icon: Users
  },
  {
    title: "Self Order Menu",
    category: "F&B",
    desc: "Pelanggan pesan sendiri lewat scan QR di meja.",
    price: "Berlangganan",
    icon: Smartphone
  }
];

// ==========================================
// 3. PAGE COMPONENTS
// ==========================================

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        <AuraLogo />
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
          <a href="#solusi" className="hover:text-blue-600 transition-colors">Solusi</a>
          <a href="#marketplace" className="hover:text-blue-600 transition-colors">App Market</a>
          <a href="#harga" className="hover:text-blue-600 transition-colors">Harga</a>
          <div className="h-5 w-px bg-slate-200 mx-2"></div>
          <button className="text-slate-600 hover:text-blue-600 font-bold px-4 py-2">Masuk</button>
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-full hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95">
            Daftar Gratis
          </button>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-50">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 p-4 flex flex-col gap-2 shadow-xl absolute w-full animate-in slide-in-from-top-2">
          <a href="#solusi" className="text-slate-600 font-bold py-3 px-4 rounded-lg hover:bg-slate-50" onClick={() => setIsOpen(false)}>Solusi</a>
          <a href="#marketplace" className="text-slate-600 font-bold py-3 px-4 rounded-lg hover:bg-slate-50" onClick={() => setIsOpen(false)}>App Market</a>
          <a href="#harga" className="text-slate-600 font-bold py-3 px-4 rounded-lg hover:bg-slate-50" onClick={() => setIsOpen(false)}>Harga</a>
          <hr className="border-slate-100 my-2" />
          <button className="text-blue-600 font-bold py-3 px-4 rounded-lg hover:bg-blue-50 text-left">Masuk Akun</button>
          <button className="bg-blue-600 text-white px-5 py-3.5 rounded-xl font-bold w-full shadow-lg shadow-blue-200">
            Daftar Sekarang
          </button>
        </div>
      )}
    </nav>
  );
};

// --- CSS DASHBOARD MOCKUP (Built with code, no image needed) ---
const DashboardMockup = () => (
  <div className="relative mx-auto w-full max-w-4xl transform rotate-x-12 hover:rotate-0 transition-transform duration-700 perspective-1000">
    <div className="bg-slate-900 rounded-t-2xl p-2 pb-0 shadow-2xl border border-slate-700">
        <div className="flex gap-1.5 px-2 py-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
        </div>
        <div className="bg-slate-50 rounded-t-lg overflow-hidden flex h-[350px] md:h-[450px]">
            {/* Sidebar Mockup */}
            <div className="w-16 md:w-48 bg-white border-r border-slate-200 hidden md:flex flex-col p-4 gap-3">
                <div className="h-8 w-24 bg-blue-100 rounded-lg mb-4"></div>
                <div className="h-4 w-full bg-slate-100 rounded mb-2"></div>
                <div className="h-4 w-3/4 bg-slate-100 rounded mb-2"></div>
                <div className="h-4 w-5/6 bg-slate-100 rounded mb-2"></div>
            </div>
            
            {/* Main Content Mockup */}
            <div className="flex-1 p-4 md:p-6 bg-slate-50 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between mb-6">
                    <div className="h-8 w-32 bg-slate-200 rounded-lg"></div>
                    <div className="h-8 w-8 bg-blue-600 rounded-full"></div>
                </div>
                
                {/* Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="h-3 w-8 bg-blue-100 rounded mb-2"></div>
                            <div className="h-6 w-16 bg-slate-800 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Chart Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-end justify-between h-32 md:h-48 gap-2">
                            {[40, 60, 45, 80, 55, 90, 70, 60].map((h, i) => (
                                <div key={i} className="w-full bg-blue-500 rounded-t-md opacity-80" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hidden md:block">
                        <div className="h-4 w-full bg-slate-100 rounded mb-3"></div>
                        <div className="h-4 w-full bg-slate-100 rounded mb-3"></div>
                        <div className="h-4 w-full bg-slate-100 rounded mb-3"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    {/* Floating Element 1 */}
    <div className="absolute -right-4 top-20 bg-white p-3 rounded-xl shadow-xl border border-slate-100 animate-bounce duration-[3000ms] hidden md:block">
        <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle2 size={20} /></div>
            <div>
                <div className="h-2 w-12 bg-slate-200 rounded mb-1"></div>
                <div className="h-3 w-8 bg-slate-800 rounded"></div>
            </div>
        </div>
    </div>
  </div>
);

const HeroSection = () => (
  <header className="pt-32 pb-20 md:pt-40 md:pb-24 px-4 md:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white overflow-hidden relative">
    <div className="max-w-7xl mx-auto text-center relative z-10">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm hover:border-blue-300 transition-colors cursor-default">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Sistem Kasir Pintar Indonesia
      </div>
      
      <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
        Bisnis Lebih Rapi,<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Untung Lebih Pasti.</span>
      </h1>
      
      <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        Satu aplikasi kasir untuk semua jenis usaha. Kelola penjualan, stok, hingga laporan keuangan otomatis. <b>Tanpa ribet, langsung pakai.</b>
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
        <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group">
          Coba Gratis Sekarang <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-1">
          Lihat Demo
        </button>
      </div>

      {/* Dashboard Preview Section */}
      <div className="relative z-10 px-4">
        <DashboardMockup />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
      </div>
    </div>
  </header>
);

const BusinessTypesSection = () => (
  <section id="solusi" className="py-24 px-4 md:px-8 bg-white">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Pilih Kategori Bisnis Anda</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Setiap bisnis punya kebutuhan berbeda. AuraPOS menyesuaikan fitur secara otomatis saat Anda mendaftar.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {BUSINESS_SOLUTIONS.map((sol) => (
          <div key={sol.id} className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all text-center group cursor-pointer h-full flex flex-col items-center">
            <div className={`w-14 h-14 ${sol.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <sol.icon size={28} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">{sol.title}</h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">{sol.tagline}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{sol.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const MarketplaceSection = () => (
  <section id="marketplace" className="py-24 px-4 md:px-8 bg-slate-50 border-y border-slate-200 overflow-hidden relative">
    {/* Decor */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

    <div className="max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div className="max-w-2xl">
            <span className="text-blue-600 font-bold text-sm tracking-widest uppercase mb-2 block">Aura App Market</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
                Bayar Hanya yang Anda Pakai.<br />
                <span className="text-slate-400">Atau Beli Sekali untuk Selamanya.</span>
            </h2>
            <p className="text-slate-500 text-lg">
                Tidak semua bisnis butuh fitur kompleks. Di AuraPOS, Anda bisa menambah fitur khusus (Add-ons) sesuai kebutuhan unik usaha Anda.
            </p>
        </div>
        <button className="flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all">
            Lihat Semua Fitur <ArrowRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MARKETPLACE_FEATURES.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex gap-4 items-start">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 text-slate-600">
                    <item.icon size={24} />
                </div>
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-slate-800">{item.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.price === 'Gratis' ? 'bg-green-50 text-green-700 border-green-100' : item.price === 'Sekali Beli' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            {item.price}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">{item.category}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
            </div>
        ))}
      </div>
      
      <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                <Package size={24} />
            </div>
            <div>
                <h4 className="font-bold text-lg">Butuh Fitur Khusus?</h4>
                <p className="text-slate-400 text-sm">Kami bisa buatkan modul khusus untuk bisnis Anda.</p>
            </div>
        </div>
        <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors w-full md:w-auto">
            Konsultasi Developer
        </button>
      </div>
    </div>
  </section>
);

const PricingSection = () => (
  <section id="harga" className="py-24 px-4 md:px-8 bg-white">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Paket Langganan Dasar</h2>
      <p className="text-slate-500 mb-12 max-w-xl mx-auto">Mulai gratis, upgrade kapan saja. Fitur tambahan tersedia di App Market.</p>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
        {/* Starter */}
        <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
          <h3 className="font-bold text-xl text-slate-800 mb-2">Starter</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-slate-900">Rp 0</span>
            <span className="text-sm font-medium text-slate-400">/bulan</span>
          </div>
          <p className="text-sm text-slate-500 mb-8 min-h-[40px]">Untuk usaha rintisan mikro.</p>
          <button className="w-full py-3.5 border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all mb-8">Daftar Gratis</button>
          <ul className="text-left space-y-3 text-sm text-slate-600">
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-500 shrink-0" /> 1 Outlet</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-500 shrink-0" /> Transaksi Unlimited</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-500 shrink-0" /> Laporan Dasar</li>
          </ul>
        </div>

        {/* Pro */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-2xl relative transform md:-translate-y-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-b-xl text-[10px] font-bold uppercase tracking-widest">Growth</div>
          <h3 className="font-bold text-2xl mb-2 mt-4">Pro</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-5xl font-black">Rp 149rb</span>
            <span className="text-sm font-medium text-slate-400">/bulan</span>
          </div>
          <p className="text-sm text-slate-400 mb-8 min-h-[40px]">Untuk bisnis yang berkembang.</p>
          <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all mb-8 shadow-lg shadow-blue-900/50">Coba Gratis 14 Hari</button>
          <ul className="text-left space-y-3 text-sm text-slate-300">
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-blue-400 shrink-0" /> Hingga 3 Outlet</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-blue-400 shrink-0" /> Manajemen Stok Lengkap</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-blue-400 shrink-0" /> Laporan Laba Rugi</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-blue-400 shrink-0" /> Akses Penuh App Market</li>
          </ul>
        </div>

        {/* Enterprise */}
        <div className="p-8 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
          <h3 className="font-bold text-xl text-slate-800 mb-2">Enterprise</h3>
          <div className="text-4xl font-black text-slate-800 mb-6">Custom</div>
          <p className="text-sm text-slate-500 mb-8 min-h-[40px]">Solusi untuk franchise besar.</p>
          <button className="w-full py-3.5 border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all mb-8">Hubungi Sales</button>
          <ul className="text-left space-y-3 text-sm text-slate-600">
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-500 shrink-0" /> Outlet Tak Terbatas</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-500 shrink-0" /> API Access</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-500 shrink-0" /> Dedicated Support</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-slate-50 pt-24 pb-12 px-4 md:px-8 border-t border-slate-200">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
        <div className="col-span-1 md:col-span-1">
            <AuraLogo size="lg" />
            <p className="mt-6 text-sm text-slate-500 leading-relaxed">
            Platform kasir digital yang fleksibel, modern, dan tumbuh bersama bisnis Anda.
            </p>
        </div>
        {[
            { title: "Produk", links: ["Fitur Kasir", "App Market", "AuraPay", "Hardware"] },
            { title: "Dukungan", links: ["Pusat Bantuan", "Video Tutorial", "Status Server", "Kontak"] },
            { title: "Legal", links: ["Tentang Kami", "Syarat & Ketentuan", "Kebijakan Privasi"] }
        ].map((col, idx) => (
            <div key={idx}>
                <h4 className="font-bold text-slate-900 mb-6">{col.title}</h4>
                <ul className="space-y-3">
                    {col.links.map((link, i) => (
                        <li key={i}><a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">{link}</a></li>
                    ))}
                </ul>
            </div>
        ))}
    </div>
    <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 text-center text-xs font-bold text-slate-400">
      &copy; 2024 AuraPOS Indonesia.
    </div>
  </footer>
);

// ==========================================
// 4. MAIN LANDING PAGE
// ==========================================

export default function LandingPage() {
  return (
    <div className="font-sans text-slate-800 bg-white selection:bg-blue-100">
      <Navbar />
      <HeroSection />
      <BusinessTypesSection />
      <MarketplaceSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
