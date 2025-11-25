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
} from "lucide-react";

// ==========================================
// 0. SYSTEM TOAST & UI COMPONENTS
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

// -- CUSTOM TOGGLE SWITCH COMPONENT --
const ToggleSwitch = ({ checked, onChange, size = "md" }) => {
  const isSmall = size === "sm";
  const containerClass = isSmall ? "w-8 h-4" : "w-11 h-6";
  const circleClass = isSmall ? "w-3 h-3" : "w-4 h-4";
  const startPos = isSmall ? "left-0.5" : "left-1";
  const translateClass = isSmall ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`
        ${containerClass} 
        rounded-full transition-colors duration-200 ease-in-out focus:outline-none flex-shrink-0 relative
        ${checked ? "bg-blue-600" : "bg-slate-300"}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          ${circleClass}
          pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out absolute top-1/2 -translate-y-1/2
          ${startPos}
          ${checked ? translateClass : "translate-x-0"}
        `}
      />
    </button>
  );
};

// ==========================================
// 1. DATA (MOCK)
// ==========================================

const INITIAL_VARIANTS = [
  {
    id: "var_size",
    name: "Size",
    type: "radio",
    required: true,
    options: [
      { name: "Regular", price: 0, available: true },
      { name: "Large", price: 5000, available: true },
      { name: "Extra Large", price: 10000, available: false },
    ],
  },
  {
    id: "var_temp",
    name: "Temperature",
    type: "radio",
    required: true,
    options: [
      { name: "Hot", price: 0, available: true },
      { name: "Iced", price: 3000, available: true },
    ],
  },
  {
    id: "var_sugar",
    name: "Sugar Level",
    type: "radio",
    required: true,
    options: [
      { name: "Normal", price: 0, available: true },
      { name: "Less Sugar", price: 0, available: true },
      { name: "No Sugar", price: 0, available: true },
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
    available: true,
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
          { name: "Medium Well", price: 0, available: true },
          { name: "Well Done", price: 0, available: true },
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
    available: true,
    stockTracking: false,
    sku: "CP-002",
    image:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60",
    variants: [],
  },
  {
    id: 3,
    name: "French Fries",
    price: 18000,
    category: "snack",
    stock: 5,
    available: false,
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
    available: true,
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
// 2. UI HELPERS
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
// 3. PRODUCT MANAGER (WITH DELETE ACTIONS)
// ==========================================

const ProductManager = ({ onBack }) => {
  const { addToast } = useToast();

  // Data
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [variantsLibrary, setVariantsLibrary] = useState(INITIAL_VARIANTS);

  // Navigation State
  const [activeTab, setActiveTab] = useState("products");
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [viewState, setViewState] = useState("list");

  // Edit State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);

  // Forms
  const [productForm, setProductForm] = useState({
    name: "",
    category: "burger",
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

  // Helpers
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

  // -- TOGGLE ACTIONS --

  const handleToggleProductAvailability = (productId, newStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, available: newStatus } : p))
    );
    addToast(
      newStatus ? "Produk diaktifkan" : "Produk dinonaktifkan",
      newStatus ? "success" : "info"
    );
  };

  const handleToggleVariantOptionAvailability = (
    variantId,
    optionIndex,
    newStatus
  ) => {
    setVariantsLibrary((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const newOptions = [...v.options];
        newOptions[optionIndex] = {
          ...newOptions[optionIndex],
          available: newStatus,
        };
        return { ...v, options: newOptions };
      })
    );
  };

  // -- PRODUCT ACTIONS --

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category || "burger",
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
      category: "burger",
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
      addToast("Produk diperbarui");
    } else {
      const newId = Math.max(...products.map((p) => p.id), 0) + 1;
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
          available: true,
        },
      ]);
      addToast("Produk ditambahkan");
    }
    setViewState("list");
  };

  const handleDeleteProduct = () => {
    if (!editingProduct) return;
    if (confirm(`Hapus produk "${editingProduct.name}"?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== editingProduct.id));
      addToast("Produk telah dihapus", "info");
      setViewState("list");
    }
  };

  // -- VARIANT ACTIONS --

  const handleEditVariant = (variant) => {
    setEditingVariant(variant);
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
      options: [{ name: "", price: 0, available: true }],
      linkedProducts: [],
    });
    setViewState("form_variant");
  };

  const handleAddVariantOption = () => {
    setVariantForm((prev) => ({
      ...prev,
      options: [...prev.options, { name: "", price: 0, available: true }],
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

    if (editingVariant) {
      setVariantsLibrary((prev) =>
        prev.map((v) => (v.id === editingVariant.id ? variantData : v))
      );
    } else {
      setVariantsLibrary((prev) => [...prev, variantData]);
    }

    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const shouldHave = variantForm.linkedProducts.includes(p.id);
        const hasVariant = p.variants?.some((v) => v.name === variantData.name);

        if (shouldHave) {
          let newVariants = p.variants ? [...p.variants] : [];
          const existingIdx = newVariants.findIndex(
            (v) => v.name === variantData.name
          );
          if (existingIdx >= 0) newVariants[existingIdx] = variantData;
          else newVariants.push(variantData);
          return { ...p, variants: newVariants };
        } else {
          if (hasVariant)
            return {
              ...p,
              variants: p.variants.filter((v) => v.name !== variantData.name),
            };
          return p;
        }
      })
    );

    addToast(editingVariant ? "Varian diperbarui" : "Varian dibuat", "success");
    setViewState("list");
  };

  const handleDeleteVariant = () => {
    if (!editingVariant) return;
    if (
      confirm(
        `Hapus varian "${editingVariant.name}"? Varian ini akan dihapus dari semua produk.`
      )
    ) {
      // 1. Remove from library
      setVariantsLibrary((prev) =>
        prev.filter((v) => v.id !== editingVariant.id)
      );

      // 2. Remove from all products
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants
            ? p.variants.filter((v) => v.name !== editingVariant.name)
            : [],
        }))
      );

      addToast("Varian telah dihapus", "info");
      setViewState("list");
    }
  };

  // -- RENDER PRODUCT FORM --
  if (viewState === "form_product") {
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
          <div className="flex items-center gap-2">
            {editingProduct && (
              <button
                onClick={handleDeleteProduct}
                className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              onClick={handleSaveProduct}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              <Save size={16} /> Simpan
            </button>
          </div>
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-80 pointer-events-none">
            {/* Read-only view for variants in product form */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Layers size={18} /> Varian Terhubung
              </h3>
              <span className="text-[10px] text-slate-400">
                Dikelola via Tab Varian
              </span>
            </div>
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
              {productForm.variants.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                  Tidak ada varian.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- RENDER VARIANT FORM --
  if (viewState === "form_variant") {
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
          <div className="flex items-center gap-2">
            {editingVariant && (
              <button
                onClick={handleDeleteVariant}
                className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              onClick={handleSaveVariant}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              <Save size={16} /> Simpan
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full grid md:grid-cols-[1.2fr_1fr] gap-6">
          {/* Configuration */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <SlidersHorizontal size={18} /> Konfigurasi
              </h3>
              <div className="space-y-4">
                <InputField
                  label="Nama Grup (mis: Size)"
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
                        placeholder="Nama"
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

          {/* Bulk Assign */}
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

  // -- LIST VIEW (MAIN) --
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

        {/* TABS */}
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
        {/* TAB 1: PRODUCT LIST WITH TOGGLE SHORTCUT */}
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
                          className={`p-3 flex items-center gap-4 transition-colors group ${
                            !product.available
                              ? "bg-slate-50 opacity-70"
                              : "hover:bg-blue-50"
                          }`}
                        >
                          <div
                            onClick={() => handleEditProduct(product)}
                            className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
                          >
                            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                              <img
                                src={product.image}
                                className={`w-full h-full object-cover transition-all ${
                                  !product.available ? "grayscale" : ""
                                }`}
                                alt=""
                              />
                              {!product.available && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                  <span className="bg-slate-800 text-white text-[8px] font-bold px-1 rounded">
                                    OFF
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-800 truncate">
                                  {product.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="font-bold text-blue-600 text-xs">
                                  {formatIDR(product.price)}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                    product.stock < 10
                                      ? "bg-red-100 text-red-600"
                                      : "bg-green-100 text-green-600"
                                  }`}
                                >
                                  Stok: {product.stock}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Shortcut Toggle for Product Availability */}
                          <div className="pl-4 border-l border-slate-100 flex flex-col items-center gap-1">
                            <ToggleSwitch
                              checked={product.available}
                              onChange={(val) =>
                                handleToggleProductAvailability(product.id, val)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: VARIANT LIST WITH OPTION TOGGLES */}
        {activeTab === "variants" && (
          <div className="grid md:grid-cols-2 gap-4">
            {variantsLibrary.map((variant) => {
              const linkedCount = products.filter(
                (p) =>
                  p.variants && p.variants.some((v) => v.name === variant.name)
              ).length;
              return (
                <div
                  key={variant.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div
                    onClick={() => handleEditVariant(variant)}
                    className="p-5 flex justify-between items-start cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50"
                  >
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

                  {/* Option List with Shortcut Toggles */}
                  <div className="p-4 bg-slate-50 flex-1">
                    <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                      <span>Opsi ({variant.options.length})</span>
                      <span className="text-[10px] font-normal normal-case">
                        Klik toggle untuk on/off
                      </span>
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {variant.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between bg-white border px-3 py-2 rounded-lg transition-all ${
                            !opt.available
                              ? "border-slate-100 opacity-60"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-xs font-bold ${
                                !opt.available
                                  ? "text-slate-400 decoration-slate-400"
                                  : "text-slate-700"
                              }`}
                            >
                              {opt.name}
                            </span>
                            {opt.price > 0 && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">
                                +{opt.price}
                              </span>
                            )}
                          </div>
                          <ToggleSwitch
                            size="sm"
                            checked={opt.available !== false}
                            onChange={(val) =>
                              handleToggleVariantOptionAvailability(
                                variant.id,
                                i,
                                val
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={handleCreateVariant}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all min-h-[250px]"
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

// ... (DashboardView & POSView tetap sama, hanya ManagementHub yang dipanggil) ...

const ManagementHub = ({ onBack, onNavigate }) => {
  const [internalRoute, setInternalRoute] = useState("menu");

  if (internalRoute === "products")
    return <ProductManager onBack={() => setInternalRoute("menu")} />;

  // Placeholder component for other routes
  const Placeholder = ({ title }) => (
    <div className="p-4">
      <button
        onClick={() => setInternalRoute("menu")}
        className="flex items-center gap-2 mb-4 text-sm font-bold"
      >
        <ChevronLeft size={16} /> Kembali
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );

  if (internalRoute === "stock")
    return <Placeholder title="Modul Stok (v1.03)" />;
  if (internalRoute === "employees")
    return <Placeholder title="Modul Karyawan (v1.03)" />;
  if (internalRoute === "features")
    return <Placeholder title="Modul App Store (v1.03)" />;
  if (internalRoute === "reports")
    return <Placeholder title="Modul Laporan (v1.03)" />;
  if (internalRoute === "store")
    return <Placeholder title="Modul Toko (v1.03)" />;

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

const DashboardView = ({ onBack }) => (
  <div className="p-4">
    <button onClick={onBack} className="flex items-center gap-2 mb-4 font-bold">
      <ChevronLeft size={20} /> Kembali
    </button>
    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
      <BarChart3 size={48} className="mx-auto mb-4 text-blue-600" />
      <h2 className="text-2xl font-bold text-slate-800">Dashboard View</h2>
      <p className="text-slate-500">Fitur ini sama dengan versi v1.03.</p>
    </div>
  </div>
);

const POSView = ({ onGoToSettings }) => (
  <div className="flex flex-col h-full">
    <header className="bg-white p-4 border-b flex justify-between items-center">
      <h1 className="font-extrabold text-lg">AuraPOS v1.06</h1>
      <button
        onClick={onGoToSettings}
        className="p-2 bg-slate-100 rounded-full"
      >
        <Settings size={20} />
      </button>
    </header>
    <div className="flex-1 flex items-center justify-center bg-slate-50 flex-col gap-4 text-center p-8">
      <LayoutGrid size={64} className="text-slate-300" />
      <h2 className="text-xl font-bold text-slate-700">
        Selamat Datang di v1.06
      </h2>
      <p className="text-slate-500 font-medium">
        Tampilan Kasir (POS) tidak berubah.
      </p>
      <p className="text-sm text-slate-400 max-w-xs">
        Silakan masuk ke menu <b>Management -&gt; Produk</b> untuk melihat
        perbaikan tombol hapus.
      </p>
      <button
        onClick={onGoToSettings}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 mt-4"
      >
        Buka Manajemen Produk
      </button>
    </div>
  </div>
);

export default function App() {
  const [activeView, setActiveView] = useState("pos");

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-20 bg-white border-r border-slate-200 flex-col items-center py-6 flex-shrink-0 z-30">
          <div className="mb-8 p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
            <ShoppingBag className="text-white w-6 h-6" />
          </div>
          <nav className="flex-1 w-full flex flex-col gap-4 px-2">
            <button
              onClick={() => setActiveView("pos")}
              className={`p-3 rounded-xl ${
                activeView === "pos"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400"
              }`}
            >
              <LayoutGrid size={22} />
            </button>
            <button
              onClick={() => setActiveView("management")}
              className={`p-3 rounded-xl ${
                activeView === "management"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400"
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