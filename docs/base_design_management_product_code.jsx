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
  CheckSquare,
  Copy,
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
                {toast.type === "success"
                  ? "Berhasil"
                  : toast.type === "error"
                  ? "Gagal"
                  : "Info"}
              </p>
              <p className="text-xs text-slate-500 truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ==========================================
// 1. MOCK DATA
// ==========================================

const CATEGORIES = [
  { id: "all", name: "Semua", icon: LayoutGrid },
  { id: "burger", name: "Burger", icon: UtensilsCrossed },
  { id: "coffee", name: "Kopi", icon: Coffee },
  { id: "pizza", name: "Pizza", icon: UtensilsCrossed },
];

const INITIAL_VARIANTS = [
  {
    id: "var_size",
    name: "Size",
    type: "radio",
    required: true,
    options: [
      { name: "Regular", price: 0 },
      { name: "Large", price: 5000 },
    ],
  },
  {
    id: "var_temp",
    name: "Temperature",
    type: "radio",
    required: true,
    options: [
      { name: "Hot", price: 0 },
      { name: "Iced", price: 3000 },
    ],
  },
];

const INITIAL_PRODUCTS = [
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
        id: "var_matang",
        name: "Tingkat Kematangan",
        type: "radio",
        required: true,
        options: [
          { name: "Medium Well", price: 0 },
          { name: "Well Done", price: 0 },
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
        id: "var_temp",
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
// 3. PRODUCT MANAGER (UPDATED)
// ==========================================

const ProductManager = ({ onBack }) => {
  const { addToast } = useToast();

  // -- STATES --
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [variantsLibrary, setVariantsLibrary] = useState(INITIAL_VARIANTS);

  const [activeTab, setActiveTab] = useState("products"); // 'products' | 'variants'
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [viewState, setViewState] = useState("list"); // 'list' | 'form_product' | 'form_variant'

  // -- EDITING STATES --
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);

  // -- FORMS DATA --
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Makanan",
    price: "",
    stockTracking: false,
    stockQty: 0,
    sku: "",
    variants: [],
  });

  const [variantForm, setVariantForm] = useState({
    id: "",
    name: "",
    type: "single",
    required: true,
    options: [],
    linkedProducts: [],
  });

  // -- HELPERS --
  const toggleCategory = (catName) => {
    setCollapsedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const getGroupedProducts = () => {
    const grouped = {};
    products.forEach((p) => {
      const cat = p.category || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return grouped;
  };

  const groupedProducts = getGroupedProducts();

  // -- HANDLERS: PRODUCT --

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category || "Makanan",
      price: product.price,
      stockTracking: product.stock !== undefined,
      stockQty: product.stock || 0,
      sku: product.sku || "",
      variants: product.variants || [],
    });
    setViewState("form_product");
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      category: "Makanan",
      price: "",
      stockTracking: false,
      stockQty: 0,
      sku: "",
      variants: [],
    });
    setViewState("form_product");
  };

  const handleSaveProduct = () => {
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                ...productForm,
                stock: productForm.stockTracking
                  ? parseInt(productForm.stockQty)
                  : 100,
              }
            : p
        )
      );
      addToast("Produk berhasil diperbarui");
    } else {
      const newId = Math.max(...products.map((p) => p.id)) + 1;
      setProducts((prev) => [
        ...prev,
        {
          ...productForm,
          id: newId,
          image:
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60",
          stock: productForm.stockTracking
            ? parseInt(productForm.stockQty)
            : 100,
        },
      ]);
      addToast("Produk baru ditambahkan");
    }
    setViewState("list");
  };

  // -- HANDLERS: VARIANTS --

  const handleEditVariant = (variant) => {
    setEditingVariant(variant);
    // Safety check: ensure variants is array
    const linkedIds = products
      .filter(
        (p) => p.variants && p.variants.some((v) => v.name === variant.name)
      )
      .map((p) => p.id);

    setVariantForm({
      id: variant.id,
      name: variant.name,
      type: variant.type === "radio" ? "single" : "multiple",
      required: variant.required,
      options: variant.options,
      linkedProducts: linkedIds,
    });
    setViewState("form_variant");
  };

  const handleCreateVariant = () => {
    setEditingVariant(null);
    setVariantForm({
      id: `var_${Date.now()}`,
      name: "",
      type: "single",
      required: true,
      options: [{ name: "", price: 0 }],
      linkedProducts: [],
    });
    setViewState("form_variant");
  };

  const handleAddVariantOption = () => {
    setVariantForm((prev) => ({
      ...prev,
      options: [...prev.options, { name: "", price: 0 }],
    }));
  };

  const handleRemoveVariantOption = (idx) => {
    setVariantForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  const handleVariantOptionChange = (idx, field, val) => {
    const newOpts = [...variantForm.options];
    newOpts[idx][field] = val;
    setVariantForm((prev) => ({ ...prev, options: newOpts }));
  };

  const toggleProductLink = (productId) => {
    setVariantForm((prev) => {
      const isLinked = prev.linkedProducts.includes(productId);
      if (isLinked)
        return {
          ...prev,
          linkedProducts: prev.linkedProducts.filter((id) => id !== productId),
        };
      return { ...prev, linkedProducts: [...prev.linkedProducts, productId] };
    });
  };

  const handleSaveVariant = () => {
    const variantData = {
      id: variantForm.id,
      name: variantForm.name,
      type: variantForm.type === "single" ? "radio" : "checkbox",
      required: variantForm.required,
      options: variantForm.options,
    };

    // 1. Update Library
    if (editingVariant) {
      setVariantsLibrary((prev) =>
        prev.map((v) => (v.id === editingVariant.id ? variantData : v))
      );
    } else {
      setVariantsLibrary((prev) => [...prev, variantData]);
    }

    // 2. Bulk Assign to Products
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const shouldHave = variantForm.linkedProducts.includes(p.id);
        // Safety check for p.variants
        const pVariants = p.variants || [];
        const hasVariant = pVariants.some((v) => v.name === variantData.name);

        if (shouldHave) {
          // Add or Update
          let newVariants = [...pVariants];
          const existingIdx = newVariants.findIndex(
            (v) => v.name === variantData.name
          );

          if (existingIdx >= 0) {
            newVariants[existingIdx] = variantData;
          } else {
            newVariants.push(variantData);
          }
          return { ...p, variants: newVariants };
        } else {
          // Remove if exists
          if (hasVariant) {
            return {
              ...p,
              variants: pVariants.filter((v) => v.name !== variantData.name),
            };
          }
          return p;
        }
      })
    );

    addToast(
      editingVariant
        ? "Varian diperbarui & disinkronkan"
        : "Varian dibuat & dihubungkan",
      "success"
    );
    setViewState("list");
  };

  // -- RENDERERS --

  if (viewState === "form_product") {
    // FORM PRODUK
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewState("list")}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800">
              {editingProduct ? "Edit Produk" : "Tambah Produk"}
            </h2>
          </div>
          <button
            onClick={handleSaveProduct}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
          >
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
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
              />
              <InputField
                label="Harga (Rp)"
                type="number"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
              />
              <InputField
                label="SKU"
                value={productForm.sku}
                onChange={(e) =>
                  setProductForm({ ...productForm, sku: e.target.value })
                }
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">
                  Kategori
                </label>
                <CustomSelect
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                  options={[
                    { value: "burger", label: "Burger" },
                    { value: "coffee", label: "Kopi" },
                    { value: "pizza", label: "Pizza" },
                    { value: "snack", label: "Snack" },
                  ]}
                />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Lacak Stok?</p>
              </div>
              <div className="flex items-center gap-3">
                {productForm.stockTracking && (
                  <input
                    type="number"
                    className="w-24 border border-slate-200 rounded-lg p-2 text-sm text-center"
                    placeholder="Qty"
                    value={productForm.stockQty}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        stockQty: e.target.value,
                      })
                    }
                  />
                )}
                <button
                  onClick={() =>
                    setProductForm({
                      ...productForm,
                      stockTracking: !productForm.stockTracking,
                    })
                  }
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    productForm.stockTracking ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      productForm.stockTracking ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          {/* Variant Readonly View */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Layers size={18} /> Varian Aktif
              </h3>
              <button
                onClick={() => {
                  setViewState("list");
                  setActiveTab("variants");
                }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Kelola di Tab Varian
              </button>
            </div>
            {!productForm.variants || productForm.variants.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Tidak ada varian terhubung.
              </p>
            ) : (
              <div className="space-y-2">
                {productForm.variants.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <span className="font-bold text-sm text-slate-700">
                      {v.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {v.options.length} Opsi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewState === "form_variant") {
    // FORM VARIAN (Dengan Bulk Assign)
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewState("list")}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800">
              {editingVariant ? "Edit Varian" : "Buat Varian Baru"}
            </h2>
          </div>
          <button
            onClick={handleSaveVariant}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
          >
            <Save size={16} /> Simpan
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full grid md:grid-cols-[1.2fr_1fr] gap-6">
          {/* Kolom Kiri: Definisi Varian */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <SlidersHorizontal size={18} /> Konfigurasi
              </h3>
              <div className="space-y-4">
                <InputField
                  label="Nama Grup Varian (mis: Size, Level Pedas)"
                  value={variantForm.name}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, name: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">
                      Tipe Pilihan
                    </label>
                    <CustomSelect
                      value={variantForm.type}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, type: e.target.value })
                      }
                      options={[
                        { value: "single", label: "Pilih Satu (Radio)" },
                        { value: "multiple", label: "Pilih Banyak (Checkbox)" },
                      ]}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">
                      Wajib Diisi?
                    </label>
                    <CustomSelect
                      value={variantForm.required}
                      onChange={(e) =>
                        setVariantForm({
                          ...variantForm,
                          required: e.target.value === "true",
                        })
                      }
                      options={[
                        { value: true, label: "Ya, Wajib" },
                        { value: false, label: "Opsional" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700">Daftar Opsi</h3>
                <button
                  onClick={handleAddVariantOption}
                  className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                >
                  + Opsi
                </button>
              </div>
              <div className="space-y-3">
                {variantForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Nama (mis: Small)"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                        value={opt.name}
                        onChange={(e) =>
                          handleVariantOptionChange(idx, "name", e.target.value)
                        }
                      />
                    </div>
                    <div className="w-32 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-right focus:border-blue-500 outline-none"
                        value={opt.price}
                        onChange={(e) =>
                          handleVariantOptionChange(
                            idx,
                            "price",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveVariantOption(idx)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Bulk Assign Produk */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[600px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle size={18} /> Hubungkan ke Produk
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Centang produk yang menggunakan varian ini.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Group checkboxes by category also for better UX */}
              {Object.entries(groupedProducts).map(([cat, prods]) => (
                <div key={cat} className="mb-2">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-50 sticky top-0">
                    {cat}
                  </div>
                  {prods.map((p) => {
                    const isChecked = variantForm.linkedProducts.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductLink(p.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isChecked
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <CheckCircle size={14} />}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-bold ${
                              isChecked ? "text-blue-900" : "text-slate-700"
                            }`}
                          >
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatIDR(p.price)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
              <p className="text-xs font-bold text-blue-600">
                {variantForm.linkedProducts.length} Produk Dipilih
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW (Main)
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-extrabold text-slate-800">
              Produk & Varian
            </h1>
          </div>
          {activeTab === "products" ? (
            <button
              onClick={handleCreateProduct}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700"
            >
              <Plus size={18} /> Produk
            </button>
          ) : (
            <button
              onClick={handleCreateVariant}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700"
            >
              <Plus size={18} /> Grup Varian
            </button>
          )}
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex gap-6 border-b border-slate-100 -mb-4">
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === "products"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Daftar Produk
          </button>
          <button
            onClick={() => setActiveTab("variants")}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === "variants"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Perpustakaan Varian
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: DAFTAR PRODUK (Collapsible Categories) */}
        {activeTab === "products" && (
          <div className="space-y-4">
            {Object.entries(groupedProducts).map(([category, items]) => {
              const isCollapsed = collapsedCategories[category];
              return (
                <div
                  key={category}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div
                    onClick={() => toggleCategory(category)}
                    className="p-4 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-700 capitalize">
                        {category}
                      </h3>
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <div
                      className={`text-slate-400 transition-transform duration-300 ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    >
                      <ChevronDown size={20} />
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 animate-in slide-in-from-top-2">
                      {items.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleEditProduct(product)}
                          className="p-3 flex items-center gap-4 hover:bg-blue-50 cursor-pointer transition-colors group"
                        >
                          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={product.image}
                              className="w-full h-full object-cover"
                              alt=""
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
                            <div className="flex items-center gap-3 mt-1">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  product.stock < 10
                                    ? "bg-red-100 text-red-600"
                                    : "bg-green-100 text-green-600"
                                }`}
                              >
                                Stok: {product.stock}
                              </span>
                              {product.variants &&
                                product.variants.length > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    <Layers size={10} />{" "}
                                    {product.variants.length} Varian
                                  </span>
                                )}
                            </div>
                          </div>
                          <ChevronRight
                            className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            size={16}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: PERPUSTAKAAN VARIAN */}
        {activeTab === "variants" && (
          <div className="grid md:grid-cols-2 gap-4">
            {variantsLibrary.map((variant) => {
              // Check with optional chaining
              const linkedCount = products.filter(
                (p) =>
                  p.variants && p.variants.some((v) => v.name === variant.name)
              ).length;
              return (
                <div
                  key={variant.id}
                  onClick={() => handleEditVariant(variant)}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <SlidersHorizontal size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {variant.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {variant.type === "radio"
                            ? "Pilih Satu"
                            : "Pilih Banyak"}{" "}
                          • {variant.required ? "Wajib" : "Opsional"}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Box size={12} /> {linkedCount} Produk
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      Opsi ({variant.options.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((opt, i) => (
                        <span
                          key={i}
                          className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600"
                        >
                          {opt.name} {opt.price > 0 && `(+${opt.price})`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-right">
                    <span className="text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit & Hubungkan Produk →
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty State Helper */}
            <button
              onClick={handleCreateVariant}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all min-h-[180px]"
            >
              <Plus size={32} className="mb-2 opacity-50" />
              <span className="font-bold text-sm">Buat Grup Varian Baru</span>
              <span className="text-xs mt-1">
                Misal: Topping, Level Gula, Ukuran
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. MANAGEMENT HUB (Router)
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
      title: "Produk & Varian",
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
    },
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
  // Simple placeholders for untouched modules
  if (internalRoute === "stock")
    return (
      <div className="p-6 bg-white m-4 rounded-xl shadow-sm">
        <button
          className="mb-4 text-blue-600 font-bold flex items-center gap-2"
          onClick={() => setInternalRoute("menu")}
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        <h1 className="text-2xl font-black text-slate-800">Modul Stok</h1>
        <p className="text-slate-500">
          Fitur ini tidak berubah dari versi v1.03 (Placeholder).
        </p>
      </div>
    );
  if (internalRoute === "employees")
    return (
      <div className="p-6 bg-white m-4 rounded-xl shadow-sm">
        <button
          className="mb-4 text-blue-600 font-bold flex items-center gap-2"
          onClick={() => setInternalRoute("menu")}
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        <h1 className="text-2xl font-black text-slate-800">Modul Karyawan</h1>
        <p className="text-slate-500">
          Fitur ini tidak berubah dari versi v1.03 (Placeholder).
        </p>
      </div>
    );
  if (internalRoute === "features")
    return (
      <div className="p-6 bg-white m-4 rounded-xl shadow-sm">
        <button
          className="mb-4 text-blue-600 font-bold flex items-center gap-2"
          onClick={() => setInternalRoute("menu")}
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        <h1 className="text-2xl font-black text-slate-800">App Store</h1>
        <p className="text-slate-500">
          Fitur ini tidak berubah dari versi v1.03 (Placeholder).
        </p>
      </div>
    );
  if (internalRoute === "reports")
    return (
      <div className="p-6 bg-white m-4 rounded-xl shadow-sm">
        <button
          className="mb-4 text-blue-600 font-bold flex items-center gap-2"
          onClick={() => setInternalRoute("menu")}
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        <h1 className="text-2xl font-black text-slate-800">Laporan</h1>
        <p className="text-slate-500">
          Fitur ini tidak berubah dari versi v1.03 (Placeholder).
        </p>
      </div>
    );
  if (internalRoute === "store")
    return (
      <div className="p-6 bg-white m-4 rounded-xl shadow-sm">
        <button
          className="mb-4 text-blue-600 font-bold flex items-center gap-2"
          onClick={() => setInternalRoute("menu")}
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        <h1 className="text-2xl font-black text-slate-800">Profil Toko</h1>
        <p className="text-slate-500">
          Fitur ini tidak berubah dari versi v1.03 (Placeholder).
        </p>
      </div>
    );

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto pb-20">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-slate-800">Manajemen</h1>
        <p className="text-xs text-slate-500">Pengaturan toko & laporan</p>
      </header>
      <div className="p-4 pt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 5. MAIN LAYOUT
// ==========================================

const DashboardView = ({ onBack }) => (
  <div className="p-4 h-full bg-slate-50">
    <button
      onClick={onBack}
      className="flex items-center gap-2 mb-4 font-bold text-slate-500 hover:text-slate-800"
    >
      <ChevronLeft size={20} /> Kembali
    </button>
    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center h-[80vh] flex flex-col items-center justify-center">
      <BarChart3 size={64} className="mx-auto mb-4 text-blue-100" />
      <h2 className="text-2xl font-black text-slate-800">Dashboard View</h2>
      <p className="text-slate-500 mt-2 max-w-sm mx-auto">
        Tampilan ini menggunakan placeholder agar fokus pada perbaikan Product
        Manager. Fungsionalitas v1.03 tetap ada pada implementasi penuh.
      </p>
    </div>
  </div>
);

const POSView = ({ onGoToSettings }) => (
  <div className="flex flex-col h-full bg-slate-50">
    <header className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          AP
        </div>
        <h1 className="font-extrabold text-lg text-slate-800">AuraPOS v1.04</h1>
      </div>
      <button
        onClick={onGoToSettings}
        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
      >
        <Settings size={20} className="text-slate-600" />
      </button>
    </header>
    <div className="flex-1 flex items-center justify-center flex-col gap-6 p-8 text-center">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg shadow-blue-100">
        <LayoutGrid size={48} className="text-blue-600" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">
          Point of Sale
        </h2>
        <p className="text-slate-500 font-medium max-w-md mx-auto">
          Tampilan kasir (POS) tidak berubah. Silakan akses menu Manajemen untuk
          melihat pembaruan fitur Produk & Varian.
        </p>
      </div>
      <button
        onClick={onGoToSettings}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-transform active:scale-95 flex items-center gap-2"
      >
        <Settings size={20} />
        Buka Manajemen Produk
      </button>
    </div>
  </div>
);

export default function App() {
  const [activeView, setActiveView] = useState("pos"); // pos, management, dashboard

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
        {/* Sidebar Simplified */}
        <aside className="hidden md:flex w-20 bg-white border-r border-slate-200 flex-col items-center py-6 flex-shrink-0 z-30">
          <div className="mb-8 p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
            <ShoppingBag className="text-white w-6 h-6" />
          </div>
          <nav className="flex-1 w-full flex flex-col gap-4 px-2">
            <button
              onClick={() => setActiveView("pos")}
              className={`p-3 rounded-xl transition-colors ${
                activeView === "pos"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid size={22} />
            </button>
            <button
              onClick={() => setActiveView("management")}
              className={`p-3 rounded-xl transition-colors ${
                activeView === "management"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              <Settings size={22} />
            </button>
          </nav>
        </aside>

        <div className="flex-1 min-w-0 h-full relative flex flex-col">
          {activeView === "pos" && (
            <POSView onGoToSettings={() => setActiveView("management")} />
          )}
          {activeView === "management" && (
            <ManagementHub
              onBack={() => setActiveView("pos")}
              onNavigate={(r) => setActiveView(r)}
            />
          )}
          {activeView === "dashboard" && (
            <DashboardView onBack={() => setActiveView("management")} />
          )}
        </div>
      </div>
    </ToastProvider>
  );
}