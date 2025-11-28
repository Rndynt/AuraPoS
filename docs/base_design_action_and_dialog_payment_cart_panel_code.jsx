import React, {
  useState,
  useMemo,
  useEffect,
  createContext,
  useContext,
} from "react";
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
  Info,
  ChevronRight,
  QrCode,
  Receipt,
  Coins
} from "lucide-react";

// ==========================================
// 0. SYSTEM TOAST
// ==========================================

const ToastContext = createContext();
const useToast = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed z-[100] top-4 left-4 right-4 md:top-auto md:bottom-8 md:left-auto md:right-8 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-white border border-slate-100 p-4 rounded-xl shadow-xl shadow-slate-200/50 animate-in slide-in-from-top-2 md:slide-in-from-bottom-2 fade-in duration-300 max-w-sm w-full ml-auto"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                toast.type === "success"
                  ? "bg-green-50 text-green-600"
                  : toast.type === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle size={16} strokeWidth={3} />
              ) : toast.type === "error" ? (
                <AlertTriangle size={16} strokeWidth={3} />
              ) : (
                <Info size={16} strokeWidth={3} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight mb-0.5">
                {toast.type === "success" ? "Berhasil" : toast.type === "error" ? "Gagal" : "Info"}
              </p>
              <p className="text-xs text-slate-500 truncate">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ==========================================
// 1. DATA & UTILS
// ==========================================

const CATEGORIES = [
  { id: "all", name: "Semua", icon: LayoutGrid },
  { id: "burger", name: "Burger", icon: UtensilsCrossed },
  { id: "coffee", name: "Kopi", icon: Coffee },
  { id: "pizza", name: "Pizza", icon: UtensilsCrossed },
];

const PRODUCTS = [
  { id: 1, name: "Classic Beef Burger", price: 45000, category: "burger", stock: 15, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60" },
  { id: 2, name: "Cappuccino Art", price: 25000, category: "coffee", stock: 50, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60" },
  { id: 3, name: "French Fries", price: 18000, category: "snack", stock: 5, image: "https://images.unsplash.com/photo-1541592103048-4e22ecc25e67?auto=format&fit=crop&w=500&q=60" },
  { id: 4, name: "Supreme Pizza", price: 85000, category: "pizza", stock: 8, image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=60" },
];

const formatIDR = (price) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

// ==========================================
// 2. COMPONENT: PAYMENT MODAL (FIXED MOBILE)
// ==========================================

const PaymentModal = ({ isOpen, onClose, total, onComplete }) => {
  const [method, setMethod] = useState("cash"); // cash, qris, card
  const [cashAmount, setCashAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMethod("cash");
      setCashAmount("");
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const change = (parseInt(cashAmount) || 0) - total;
  const isEnough = change >= 0;

  const handleQuickMoney = (amount) => {
    setCashAmount(amount.toString());
  };

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete({ method, total, cashReceived: parseInt(cashAmount) || total, change: method === 'cash' ? change : 0 });
    }, 1500);
  };

  const renderMethodButton = (id, label, Icon) => (
    <button 
        onClick={() => setMethod(id)}
        className={`flex-1 p-2 md:p-3 rounded-xl flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 transition-all border ${
            method === id 
            ? "bg-blue-50 border-blue-600 text-blue-600 shadow-sm" 
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500"
        }`}
    >
        <Icon size={18} /> <span className="font-bold text-[10px] md:text-sm">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-auto md:max-h-[90vh]">
        
        {/* Sidebar (Desktop Only) - Hidden on Mobile */}
        <div className="hidden md:flex w-1/3 bg-slate-50 border-r border-slate-200 p-4 flex-col gap-2">
          <h3 className="font-bold text-slate-700 mb-2 px-1">Metode</h3>
          <button onClick={() => setMethod("cash")} className={`p-3 rounded-xl flex items-center gap-3 transition-all ${method === "cash" ? "bg-white border-2 border-blue-600 text-blue-600 shadow-md" : "hover:bg-white border border-transparent text-slate-600"}`}><Banknote size={20} /> <span className="font-bold text-sm">Tunai</span></button>
          <button onClick={() => setMethod("qris")} className={`p-3 rounded-xl flex items-center gap-3 transition-all ${method === "qris" ? "bg-white border-2 border-blue-600 text-blue-600 shadow-md" : "hover:bg-white border border-transparent text-slate-600"}`}><QrCode size={20} /> <span className="font-bold text-sm">QRIS</span></button>
          <button onClick={() => setMethod("card")} className={`p-3 rounded-xl flex items-center gap-3 transition-all ${method === "card" ? "bg-white border-2 border-blue-600 text-blue-600 shadow-md" : "hover:bg-white border border-transparent text-slate-600"}`}><CreditCard size={20} /> <span className="font-bold text-sm">Kartu</span></button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full relative">
          
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Tagihan</p>
              <h2 className="text-2xl font-black text-slate-800">{formatIDR(total)}</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20}/></button>
          </div>

          {/* Mobile Method Tabs (Horizontal) - Visible only on mobile */}
          <div className="md:hidden flex gap-2 p-3 border-b border-slate-100 bg-slate-50 overflow-x-auto no-scrollbar shrink-0">
             {renderMethodButton("cash", "Tunai", Banknote)}
             {renderMethodButton("qris", "QRIS", QrCode)}
             {renderMethodButton("card", "Kartu", CreditCard)}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
            {method === "cash" && (
              <div className="space-y-4 animate-in slide-in-from-right-2 pb-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Uang Diterima</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                    <input 
                      type="number" 
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="0"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Quick Money Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleQuickMoney(total)} className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-200">Uang Pas</button>
                  <button onClick={() => handleQuickMoney(50000)} className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-200">50.000</button>
                  <button onClick={() => handleQuickMoney(100000)} className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-200">100.000</button>
                  <button onClick={() => handleQuickMoney(200000)} className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-200">200.000</button>
                </div>

                <div className={`p-4 rounded-xl border ${isEnough ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} flex justify-between items-center transition-colors duration-300`}>
                  <span className={`text-sm font-bold ${isEnough ? "text-green-700" : "text-red-700"}`}>
                    {isEnough ? "Kembalian" : "Kurang"}
                  </span>
                  <span className={`text-xl font-black ${isEnough ? "text-green-700" : "text-red-700"}`}>
                    {formatIDR(Math.abs(change))}
                  </span>
                </div>
              </div>
            )}

            {method === "qris" && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in slide-in-from-right-2 py-4">
                <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-sm">
                  <QrCode size={120} className="text-slate-800" />
                </div>
                <div><p className="font-bold text-slate-800">Scan QRIS</p><p className="text-sm text-slate-500">Menunggu pembayaran...</p></div>
              </div>
            )}

            {method === "card" && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in slide-in-from-right-2 py-4">
                <div className="bg-blue-50 p-6 rounded-full">
                    <CreditCard size={48} className="text-blue-600" />
                </div>
                <p className="text-sm text-slate-500 max-w-[200px]">Silakan gesek kartu pada mesin EDC terpisah.</p>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0">
            <button 
              onClick={handleProcess}
              disabled={isProcessing || (method === 'cash' && !isEnough)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            >
              {isProcessing ? "Memproses..." : (method === "cash" ? "Bayar & Cetak Struk" : "Konfirmasi Pembayaran")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. POS VIEW (FIXED MOBILE LAYOUT)
// ==========================================

const POSView = ({ onGoToTables, onGoToSettings }) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("dine-in");
  const [customerName, setCustomerName] = useState("Walk-in Guest");
  const [tableNumber, setTableNumber] = useState("12");
  
  // Modal & Sidebar State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false); // Controls mobile sidebar visibility
  
  const { addToast } = useToast();

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter((item) => item.qty > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // -- ACTION HANDLERS --

  const handleSaveOrder = () => {
    if (cart.length === 0) return;
    if (orderType === "dine-in" && !tableNumber) {
        addToast("Mohon isi nomor meja untuk Dine-in", "error");
        return;
    }
    addToast(`Order disimpan! ${orderType === 'dine-in' ? 'Kirim ke Dapur.' : 'Disimpan sebagai Draft.'}`, "success");
    setCart([]);
    setIsCartOpen(false); // Close cart sidebar on mobile
  };

  const handlePayNow = () => {
    if (cart.length === 0) return;
    setIsPaymentOpen(true);
  };

  const handlePaymentComplete = (result) => {
    setIsPaymentOpen(false);
    setIsCartOpen(false); // Close cart sidebar on mobile
    addToast(`Pembayaran Berhasil via ${result.method.toUpperCase()}! Kembalian: ${formatIDR(result.change)}`, "success");
    setCart([]);
  };

  return (
    <>
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} total={total} onComplete={handlePaymentComplete} />

      <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
        
        {/* LEFT: Product Grid */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
          <header className="px-4 md:px-8 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-10">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">Resto POS Pro</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1"><MapPin size={12} /> Pusat</span>
                <span className="text-green-600 font-bold">• Online</span>
              </div>
            </div>
            <div className="w-1/3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Cari..." className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </header>
          
          <div className="px-4 md:px-8 py-4">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                  <cat.icon size={16} /> {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} onClick={() => addToCart(product)} className="group bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 active:scale-95 hover:shadow-md cursor-pointer relative h-full flex flex-col transition-all">
                  <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg mb-2 bg-slate-100">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur text-white text-[10px] font-medium px-2 py-0.5 rounded">{product.stock} Stok</div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                    <div className="mt-auto"><span className="text-blue-600 font-bold text-base">{formatIDR(product.price).replace(",00", "")}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* RIGHT: Cart Sidebar (Fixed Mobile Layout) */}
        {/* -- OVERLAY FOR MOBILE -- */}
        {isCartOpen && <div className="fixed inset-0 bg-black/40 z-[55] md:hidden" onClick={() => setIsCartOpen(false)} />}
        
        {/* -- SIDEBAR PANEL -- */}
        <aside 
            className={`fixed md:relative top-0 bottom-0 right-0 z-[60] bg-white border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 w-full md:w-[400px] h-[95vh] mt-[5vh] md:mt-0 md:h-auto rounded-t-[2rem] md:rounded-none ${
                isCartOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"
            }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white rounded-t-[2rem] md:rounded-none relative z-40">
            <div className="flex items-center gap-3">
              {/* Close Button for Mobile */}
              <button onClick={() => setIsCartOpen(false)} className="md:hidden p-1 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
                <ChevronDown size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-800">Detail Pesanan</h2>
            </div>
            <div className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">#ORD-NEW</div>
          </div>

          <div className="p-4 bg-white border-b border-slate-100 shadow-sm z-10">
            <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1 mb-4">
              {["dine-in", "take-away", "delivery"].map((type) => (
                <button key={type} onClick={() => setOrderType(type)} className={`text-[11px] font-bold py-2 rounded-lg capitalize flex items-center justify-center gap-1 transition-all ${orderType === type ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                  {type.replace("-", " ")}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm"><User size={16} /></div>
                <div className="flex-1 overflow-hidden"><p className="text-[10px] text-slate-400 uppercase font-bold">Pelanggan</p><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none" /></div>
              </div>
              {orderType === "dine-in" && (
                <div className="w-20 bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold text-center">Meja</p>
                  <input type="text" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="bg-transparent w-full text-center text-lg font-black text-slate-700 focus:outline-none" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <ShoppingBag size={64} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Keranjang kosong</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-700 text-sm truncate">{item.name}</h4>
                      <span className="text-blue-600 font-bold text-sm whitespace-nowrap">{formatIDR(item.price * item.qty)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <button onClick={() => setCart(c => c.filter(x => x.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center hover:bg-slate-50"><Minus size={12} /></button>
                            <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center hover:bg-slate-50"><Plus size={12} /></button>
                        </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-white border-t border-slate-200 p-5 shadow-[0_-5px_25px_rgba(0,0,0,0.05)] z-20 pb-safe">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-500"><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
              <div className="flex justify-between text-xs text-slate-500"><span>Pajak (11%)</span><span>{formatIDR(tax)}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
                <span className="font-bold text-slate-800">Total Tagihan</span>
                <span className="text-xl font-black text-blue-600">{formatIDR(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-safe-offset-4">
              <button disabled={cart.length === 0} onClick={handleSaveOrder} className="col-span-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 py-3.5 rounded-xl font-bold flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <div className="flex items-center gap-2 text-sm"><Save size={18} /><span>Simpan</span></div>
                <span className="text-[9px] font-normal opacity-70">{orderType === 'dine-in' ? 'Kirim ke Dapur' : 'Simpan Draft'}</span>
              </button>
              <button disabled={cart.length === 0} onClick={handlePayNow} className="col-span-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <div className="flex items-center gap-2 text-sm"><Banknote size={18} /><span>Bayar</span></div>
                <span className="text-[9px] font-normal opacity-80">{orderType === 'dine-in' ? 'Tutup Bill' : 'Langsung Lunas'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE BOTTOM NAVIGATION BAR (RESTORED) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]">
            <button className="flex flex-col items-center gap-0.5 text-blue-600"><LayoutGrid size={20} /><span className="text-[10px]">Menu</span></button>
            <button onClick={onGoToTables} className="flex flex-col items-center gap-0.5 text-slate-400"><Square size={20} /><span className="text-[10px]">Meja</span></button>
            <div className="relative -top-5">
                <button onClick={() => setIsCartOpen(true)} className="bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 border-4 border-slate-50 transition-transform">
                    <ShoppingBag size={24} />
                    {totalItems > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-800">{totalItems}</span>}
                </button>
            </div>
            <button className="flex flex-col items-center gap-0.5 text-slate-400"><CreditCard size={20} /><span className="text-[10px]">Bill</span></button>
            <button onClick={onGoToSettings} className="flex flex-col items-center gap-0.5 text-slate-400"><Settings size={20} /><span className="text-[10px]">Set</span></button>
        </div>
      </div>
    </>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState("pos");

  const renderContent = () => {
    switch (activeView) {
      case "pos": return <POSView onGoToTables={() => setActiveView("tables")} onGoToSettings={() => setActiveView("management")} />;
      default: return <div className="p-10 text-center text-slate-400">View Placeholder (Focus on POS Logic)</div>;
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
        <aside className="hidden md:flex w-20 bg-white border-r border-slate-200 flex-col items-center py-6 flex-shrink-0 z-30">
          <div className="mb-8 p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200"><ShoppingBag className="text-white w-6 h-6" /></div>
          <nav className="flex-1 w-full flex flex-col gap-4 px-2">
            <button onClick={() => setActiveView("pos")} className={`p-3 rounded-xl transition-all flex justify-center ${activeView === "pos" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50"}`}><LayoutGrid size={22} /></button>
            <button onClick={() => setActiveView("management")} className={`p-3 rounded-xl transition-all flex justify-center ${activeView === "management" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50"}`}><Settings size={22} /></button>
          </nav>
        </aside>
        <div className="flex-1 min-w-0 h-full relative flex flex-col">{renderContent()}</div>
      </div>
    </ToastProvider>
  );
}

