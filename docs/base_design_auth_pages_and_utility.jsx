import React, { useState } from "react";
import {
  User,
  Lock,
  Mail,
  Store,
  ArrowRight,
  AlertTriangle,
  Ghost,
  ChevronLeft,
  RefreshCcw,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  Briefcase
} from "lucide-react";

// ==========================================
// 1. BRAND IDENTITY (NEW LOGO)
// ==========================================

const AuraLogo = ({ size = "md", color = "blue" }) => {
  // Size Configurations
  const dims = size === "lg" ? "w-12 h-12" : size === "xl" ? "w-16 h-16" : "w-8 h-8";
  const textSize = size === "lg" ? "text-3xl" : size === "xl" ? "text-4xl" : "text-xl";
  
  // Color Configurations
  const bgClass = color === "white" ? "bg-white text-blue-600" : "bg-blue-600 text-white";
  const textClass = color === "white" ? "text-white" : "text-slate-800";

  return (
    <div className="flex items-center gap-2.5 font-black tracking-tight select-none">
      <div className={`${dims} ${bgClass} rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 relative overflow-hidden`}>
        {/* Abstract 'A' / Spark Shape */}
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-2/3 h-2/3">
          <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {/* Shine Effect */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/20 to-transparent opacity-50"></div>
      </div>
      <span className={`${textSize} ${textClass}`}>
        Aura<span className="text-blue-600">POS</span>
      </span>
    </div>
  );
};

// ==========================================
// 2. SHARED UI COMPONENTS
// ==========================================

const InputField = ({ label, type = "text", placeholder, icon: Icon, value, onChange, options = null, helperText = null }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
          {Icon && <Icon size={18} />}
        </div>
        
        {type === "select" ? (
          <div className="relative">
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
              value={value}
              onChange={onChange}
            >
              <option value="" disabled>{placeholder}</option>
              {options && options.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        ) : (
          <>
            <input
              type={isPassword ? (showPassword ? "text" : "password") : type}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 hover:bg-white focus:bg-white"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </>
        )}
      </div>
      {helperText && <p className="text-xs text-slate-400 ml-1">{helperText}</p>}
    </div>
  );
};

const PrimaryButton = ({ children, onClick, isLoading }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all"
  >
    {isLoading ? (
      <RefreshCcw size={18} className="animate-spin" />
    ) : (
      children
    )}
  </button>
);

// ==========================================
// 3. PAGE: LOGIN
// ==========================================

const LoginPage = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600"></div>
        
        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6"><AuraLogo size="lg" /></div>
            <h2 className="text-2xl font-black text-slate-800">Selamat Datang</h2>
            <p className="text-slate-500 text-sm mt-2">Masuk untuk mengelola bisnis Anda.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <InputField label="Email" type="email" placeholder="nama@bisnis.com" icon={Mail} />
            <div>
              <InputField label="Password" type="password" placeholder="••••••••" icon={Lock} />
              <div className="flex justify-end mt-2">
                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">Lupa Password?</button>
              </div>
            </div>

            <PrimaryButton isLoading={isLoading}>Masuk Dashboard <ArrowRight size={18} /></PrimaryButton>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Belum punya akun?{" "}
              <button onClick={() => onNavigate("register")} className="font-bold text-blue-600 hover:underline">
                Daftar Sekarang
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. PAGE: REGISTER (UPDATED)
// ==========================================

const BUSINESS_TYPES = [
  { id: "fnb", label: "F&B (Makanan & Minuman)", description: "Cocok untuk Cafe, Restoran, Rumah Makan, Food Court, dan Kedai Kopi." },
  { id: "retail", label: "Retail (Toko Eceran)", description: "Cocok untuk Minimarket, Toko Baju, Toko Kelontong, dan Toko Buah." },
  { id: "laundry", label: "Laundry & Cleaning", description: "Cocok untuk Laundry Kiloan, Dry Cleaning, Cuci Sepatu/Tas." },
  { id: "service", label: "Jasa & Appointment", description: "Cocok untuk Salon, Barbershop, Spa, Bengkel, dan Klinik Kecantikan." },
  { id: "digital", label: "Produk Digital & PPOB", description: "Cocok untuk Konter Pulsa, Topup Game, Pembayaran Tagihan, dan Toko Online." },
];

const RegisterPage = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    businessType: "",
    email: "",
    password: ""
  });

  const handleRegister = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Find description based on selection
  const selectedBusinessDesc = BUSINESS_TYPES.find(t => t.id === formData.businessType)?.description;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden relative animate-in fade-in slide-in-from-bottom-4">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600"></div>

        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5"><AuraLogo size="md" /></div>
            <h2 className="text-2xl font-black text-slate-800">Mulai Kelola Bisnis</h2>
            <p className="text-slate-500 text-sm mt-2">Daftar gratis dan rasakan kemudahannya.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <InputField 
                    label="Nama Lengkap" 
                    placeholder="Budi Santoso" 
                    icon={User} 
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
                <InputField 
                    label="Nama Bisnis" 
                    placeholder="Kopi Senja" 
                    icon={Store} 
                    value={formData.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                />
            </div>

            {/* Business Type Selection */}
            <div>
                <InputField 
                    label="Kategori Bisnis" 
                    type="select" 
                    placeholder="Pilih tipe bisnis..." 
                    icon={Briefcase}
                    options={BUSINESS_TYPES}
                    value={formData.businessType}
                    onChange={(e) => handleChange("businessType", e.target.value)}
                />
                
                {/* Description Box (Separate from Select) */}
                <div className={`mt-3 p-3 rounded-xl flex gap-3 transition-all duration-300 ${formData.businessType ? "bg-blue-50 border border-blue-100 opacity-100" : "bg-slate-50 border border-slate-100 opacity-50"}`}>
                    <div className={`mt-0.5 ${formData.businessType ? "text-blue-600" : "text-slate-400"}`}>
                        <Info size={18} />
                    </div>
                    <div>
                        <p className={`text-xs font-bold mb-0.5 ${formData.businessType ? "text-blue-800" : "text-slate-500"}`}>
                            {formData.businessType ? "Deskripsi Kategori:" : "Info Kategori"}
                        </p>
                        <p className={`text-xs leading-relaxed ${formData.businessType ? "text-blue-600" : "text-slate-400"}`}>
                            {selectedBusinessDesc || "Pilih kategori di atas untuk melihat detail rekomendasi fitur yang sesuai dengan bisnis Anda."}
                        </p>
                    </div>
                </div>
            </div>

            <InputField 
                label="Email" 
                type="email" 
                placeholder="nama@bisnis.com" 
                icon={Mail} 
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
            />
            <InputField 
                label="Password" 
                type="password" 
                placeholder="Buat password kuat" 
                icon={Lock} 
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
            />

            <div className="pt-2">
              <PrimaryButton isLoading={isLoading}>Buat Akun Gratis</PrimaryButton>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Sudah punya akun?{" "}
              <button onClick={() => onNavigate("login")} className="font-bold text-blue-600 hover:underline">
                Masuk Disini
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. PAGE: 404 NOT FOUND
// ==========================================

const NotFoundPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 opacity-50 blur-3xl"></div>
        <div className="relative bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 transform -rotate-6 transition-transform hover:rotate-0 duration-500">
          <Ghost size={80} className="text-blue-600" strokeWidth={1.5} />
        </div>
      </div>
      
      <h1 className="text-9xl font-black text-slate-200 mb-2 leading-none select-none">404</h1>
      <h2 className="text-3xl font-bold text-slate-800 mb-4">Halaman Hilang</h2>
      <p className="text-slate-500 max-w-sm mb-10 leading-relaxed mx-auto">
        Sepertinya Anda tersesat di antah berantah digital. Halaman yang Anda cari tidak dapat ditemukan.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-xs sm:max-w-none mx-auto">
        <button onClick={() => onNavigate("login")} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3.5 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
          <ChevronLeft size={20} /> Kembali
        </button>
        <button onClick={() => onNavigate("login")} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
          Ke Beranda <CheckCircle2 size={20} />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 6. PAGE: 500 SERVER ERROR
// ==========================================

const ServerErrorPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-100 rounded-full scale-150 opacity-50 blur-3xl"></div>
        <div className="relative bg-white p-8 rounded-[2rem] shadow-xl border border-red-100 transform rotate-6 transition-transform hover:rotate-0 duration-500">
          <AlertTriangle size={80} className="text-red-500" strokeWidth={1.5} />
        </div>
      </div>
      
      <h1 className="text-9xl font-black text-slate-200 mb-2 leading-none select-none">500</h1>
      <h2 className="text-3xl font-bold text-slate-800 mb-4">Terjadi Kesalahan</h2>
      <p className="text-slate-500 max-w-sm mb-10 leading-relaxed mx-auto">
        Server kami sedang mengalami masalah teknis. Tim kami sedang bekerja memperbaikinya.
      </p>

      <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mx-auto">
        <RefreshCcw size={20} /> Coba Muat Ulang
      </button>
      
      <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        <span className="text-xs text-slate-500 font-mono font-bold">Error ID: ERR-500-AF</span>
      </div>
    </div>
  );
};

// ==========================================
// 7. MAIN PREVIEW CONTROLLER
// ==========================================

export default function App() {
  const [currentView, setCurrentView] = useState("login");

  // Komponen Navigasi Sementara untuk Preview
  const PreviewNav = () => (
    <div className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur text-white p-3 flex items-center justify-center gap-2 z-50 overflow-x-auto shadow-lg">
      <span className="opacity-50 text-[10px] font-bold tracking-widest mr-2 uppercase">Preview Pages:</span>
      <button onClick={() => setCurrentView("login")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentView === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Login</button>
      <button onClick={() => setCurrentView("register")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentView === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Register</button>
      <button onClick={() => setCurrentView("404")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentView === '404' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>404</button>
      <button onClick={() => setCurrentView("500")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentView === '500' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>500</button>
    </div>
  );

  return (
    <>
      <PreviewNav />
      <div className="pt-14 bg-slate-50 min-h-screen"> 
        {currentView === "login" && <LoginPage onNavigate={setCurrentView} />}
        {currentView === "register" && <RegisterPage onNavigate={setCurrentView} />}
        {currentView === "404" && <NotFoundPage onNavigate={setCurrentView} />}
        {currentView === "500" && <ServerErrorPage onNavigate={setCurrentView} />}
      </div>
    </>
  );
}
