import { useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  Plus,
  Save,
  Box,
  Layers,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data for products
const MOCK_PRODUCTS = [
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

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

// Custom Select Component
const CustomSelect = ({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
}) => (
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

// Input Field Component
const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) => (
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

type Product = typeof MOCK_PRODUCTS[0];
type VariantOption = { name: string; price: number };
type OptionGroup = {
  id: number;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  options: VariantOption[];
};

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const [viewState, setViewState] = useState<"list" | "form">("list");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Makanan",
    price: "",
    stockTracking: false,
    stockQty: 0,
    sku: "",
    imageUrl: "",
  });
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "Makanan",
      price: product.price.toString(),
      stockTracking: product.stock !== undefined && product.stock < 999,
      stockQty: product.stock || 0,
      sku: product.sku || "",
      imageUrl: product.image || "",
    });
    if (product.variants) {
      const mappedGroups = product.variants.map((v, idx) => ({
        id: idx,
        name: v.name,
        type: (v.type === "radio" ? "single" : "multiple") as "single" | "multiple",
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

  const handleAddOption = (groupId: number) => {
    setOptionGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: [...g.options, { name: "", price: 0 }] }
          : g
      )
    );
  };

  const handleRemoveGroup = (groupId: number) => {
    setOptionGroups((groups) => groups.filter((g) => g.id !== groupId));
  };

  const handleRemoveOption = (groupId: number, optionIndex: number) => {
    setOptionGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((_, idx) => idx !== optionIndex) }
          : g
      )
    );
  };

  const handleUpdateGroupName = (groupId: number, name: string) => {
    setOptionGroups((groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, name } : g))
    );
  };

  const handleUpdateGroupType = (groupId: number, type: "single" | "multiple") => {
    setOptionGroups((groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, type } : g))
    );
  };

  const handleUpdateOptionName = (groupId: number, optionIndex: number, name: string) => {
    setOptionGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((opt, idx) =>
                idx === optionIndex ? { ...opt, name } : opt
              ),
            }
          : g
      )
    );
  };

  const handleUpdateOptionPrice = (groupId: number, optionIndex: number, price: number) => {
    setOptionGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((opt, idx) =>
                idx === optionIndex ? { ...opt, price } : opt
              ),
            }
          : g
      )
    );
  };

  const handleBackToList = () => {
    setViewState("list");
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "Makanan",
      price: "",
      stockTracking: false,
      stockQty: 0,
      sku: "",
      imageUrl: "",
    });
    setOptionGroups([]);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "Makanan",
      price: "",
      stockTracking: false,
      stockQty: 0,
      sku: "",
      imageUrl: "",
    });
    setOptionGroups([]);
    setViewState("form");
  };

  if (viewState === "form") {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
        <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-800" data-testid="text-form-title">
              {editingProduct ? "Edit Produk" : "Tambah Produk"}
            </h2>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
            data-testid="button-save-product"
          >
            <Save size={16} /> Simpan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 pb-20">
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
                data-testid="input-product-name"
              />
              <InputField
                label="Harga (Rp)"
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                data-testid="input-product-price"
              />
              <InputField
                label="SKU"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                data-testid="input-product-sku"
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

            <div className="mt-4">
              <InputField
                label="URL Gambar"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
                data-testid="input-product-image"
              />
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
                      setFormData({ ...formData, stockQty: Number(e.target.value) })
                    }
                    data-testid="input-stock-quantity"
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
                  data-testid="toggle-stock-tracking"
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
                data-testid="button-add-group"
              >
                + Tambah Grup
              </button>
            </div>
            <div className="space-y-6">
              {optionGroups.map((group, idx) => (
                <div
                  key={group.id}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                  data-testid={`option-group-${idx}`}
                >
                  <div className="bg-slate-50 p-4 flex flex-col md:flex-row gap-3 md:items-center border-b border-slate-200">
                    <input
                      type="text"
                      placeholder="Nama Grup (mis: Ukuran)"
                      className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold w-full md:w-64 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={group.name}
                      onChange={(e) => handleUpdateGroupName(group.id, e.target.value)}
                      data-testid={`input-group-name-${idx}`}
                    />
                    <div className="w-full md:w-48">
                      <CustomSelect
                        value={group.type}
                        onChange={(e) =>
                          handleUpdateGroupType(group.id, e.target.value as "single" | "multiple")
                        }
                        options={[
                          { value: "single", label: "Pilih Satu (Radio)" },
                          { value: "multiple", label: "Pilih Banyak (Check)" },
                        ]}
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(group.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg ml-auto transition-colors"
                      data-testid={`button-remove-group-${idx}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    {group.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-3" data-testid={`option-${idx}-${optIdx}`}>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Nama Opsi (mis: Pedas)"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={opt.name}
                            onChange={(e) => handleUpdateOptionName(group.id, optIdx, e.target.value)}
                            data-testid={`input-option-name-${idx}-${optIdx}`}
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
                            onChange={(e) => handleUpdateOptionPrice(group.id, optIdx, Number(e.target.value))}
                            data-testid={`input-option-price-${idx}-${optIdx}`}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveOption(group.id, optIdx)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          data-testid={`button-remove-option-${idx}-${optIdx}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddOption(group.id)}
                      className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                      data-testid={`button-add-option-${idx}`}
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
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-100 rounded-full"
            data-testid="button-back-home"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold text-slate-800" data-testid="text-page-title">
            Produk
          </h1>
        </div>
        <button
          onClick={handleNewProduct}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200"
          data-testid="button-add-product"
        >
          <Plus size={18} /> Tambah
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {MOCK_PRODUCTS.map((product) => (
          <div
            key={product.id}
            onClick={() => handleEdit(product)}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 cursor-pointer transition-all group"
            data-testid={`card-product-${product.id}`}
          >
            <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
              <img
                src={product.image}
                className="w-full h-full object-cover"
                alt={product.name}
                data-testid={`img-product-${product.id}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 truncate" data-testid={`text-product-name-${product.id}`}>
                  {product.name}
                </h4>
                <span className="font-bold text-blue-600 text-sm" data-testid={`text-product-price-${product.id}`}>
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
                  data-testid={`text-product-stock-${product.id}`}
                >
                  Stok: {product.stock}
                </span>
                <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 rounded" data-testid={`text-product-sku-${product.id}`}>
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
}
