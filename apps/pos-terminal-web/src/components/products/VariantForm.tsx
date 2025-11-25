import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Save,
  SlidersHorizontal,
  Trash2,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { type Variant } from "@/hooks/useVariants";

interface VariantFormProps {
  variant?: Variant | null;
  products: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onDelete?: () => void;
}

const CustomSelect = ({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string | boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | boolean; label: string }[];
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <select
      value={String(value)}
      onChange={onChange}
      className="appearance-none w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
    >
      {options.map((opt, idx) => (
        <option key={idx} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      <ChevronDown size={16} />
    </div>
  </div>
);

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

const formatIDR = (price: number | string) => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
};

export default function VariantForm({
  variant,
  products,
  onSave,
  onCancel,
  isLoading,
  onDelete,
}: VariantFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "single" as "single" | "multiple",
    required: true,
    options: [{ name: "", price_delta: 0 }],
    linkedProducts: [] as string[],
  });

  useEffect(() => {
    if (variant) {
      const linkedIds = products
        .filter((p) =>
          (p.option_groups || []).some((g: any) => g.name === variant.name)
        )
        .map((p) => p.id);

      setFormData({
        name: variant.name,
        type: variant.type === "radio" ? "single" : "multiple",
        required: variant.required,
        options: variant.options.map((opt) => ({
          name: opt.name,
          price_delta: opt.price,
        })),
        linkedProducts: linkedIds,
      });
    }
  }, [variant, products]);

  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { name: "", price_delta: 0 }],
    }));
  };

  const handleRemoveOption = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  const handleOptionChange = (
    idx: number,
    field: "name" | "price_delta",
    value: string | number
  ) => {
    const newOptions = [...formData.options];
    if (field === "price_delta") {
      newOptions[idx][field] = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      newOptions[idx][field] = value as string;
    }
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const toggleProductLink = (productId: string) => {
    setFormData((prev) => {
      const isLinked = prev.linkedProducts.includes(productId);
      if (isLinked) {
        return {
          ...prev,
          linkedProducts: prev.linkedProducts.filter((id) => id !== productId),
        };
      }
      return { ...prev, linkedProducts: [...prev.linkedProducts, productId] };
    });
  };

  const handleSubmit = () => {
    onSave({
      ...formData,
      isEditing: !!variant,
      oldName: variant?.name,
    });
  };

  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="button-back-variant"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {variant ? "Edit Varian" : "Buat Varian Baru"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {variant && onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
              data-testid="button-delete-variant"
              type="button"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50"
            data-testid="button-save-variant"
          >
            <Save size={16} /> {isLoading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full grid md:grid-cols-[1.2fr_1fr] gap-6 pb-20">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <SlidersHorizontal size={18} /> Konfigurasi
            </h3>
            <div className="space-y-4">
              <InputField
                label="Nama Grup Varian (mis: Size, Level Pedas)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama varian"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Tipe Pilihan</label>
                  <CustomSelect
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "single" | "multiple",
                      })
                    }
                    options={[
                      { value: "single", label: "Pilih Satu (Radio)" },
                      { value: "multiple", label: "Pilih Banyak (Checkbox)" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Wajib Diisi?</label>
                  <CustomSelect
                    value={formData.required}
                    onChange={(e) =>
                      setFormData({ ...formData, required: e.target.value === "true" })
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
                onClick={handleAddOption}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                data-testid="button-add-option"
              >
                + Opsi
              </button>
            </div>
            <div className="space-y-3">
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Nama (mis: Small)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                      value={opt.name}
                      onChange={(e) => handleOptionChange(idx, "name", e.target.value)}
                      data-testid={`input-option-name-${idx}`}
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
                      value={opt.price_delta}
                      onChange={(e) =>
                        handleOptionChange(idx, "price_delta", e.target.value)
                      }
                      data-testid={`input-option-price-${idx}`}
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className="text-slate-300 hover:text-red-500"
                    data-testid={`button-remove-option-${idx}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

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
                {(prods as any[]).map((p: any) => {
                  const isChecked = formData.linkedProducts.includes(p.id);
                  const price = p.base_price || p.basePrice || 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProductLink(p.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                      data-testid={`product-checkbox-${p.id}`}
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
                        <p className="text-[10px] text-slate-400">{formatIDR(price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-center">
            <p className="text-xs font-bold text-blue-600">
              {formData.linkedProducts.length} Produk Dipilih
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
