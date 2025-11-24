import { Box, SlidersHorizontal, Plus } from "lucide-react";
import { type Variant } from "@/hooks/useVariants";

interface VariantLibraryProps {
  variants: Variant[];
  products: any[];
  onVariantClick: (variant: Variant) => void;
  onCreateNew: () => void;
}

export default function VariantLibrary({
  variants,
  products,
  onVariantClick,
  onCreateNew,
}: VariantLibraryProps) {
  const getLinkedProductsCount = (variantName: string) => {
    return products.filter((p) =>
      (p.option_groups || []).some((g: any) => g.name === variantName)
    ).length;
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {variants.map((variant) => {
        const linkedCount = getLinkedProductsCount(variant.name);
        return (
          <div
            key={variant.id}
            onClick={() => onVariantClick(variant)}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
            data-testid={`variant-card-${variant.id}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{variant.name}</h3>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {variant.type === "radio" ? "Pilih Satu" : "Pilih Banyak"} •{" "}
                    {variant.required ? "Wajib" : "Opsional"}
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

      <button
        onClick={onCreateNew}
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all min-h-[180px]"
        data-testid="button-create-variant"
      >
        <Plus size={32} className="mb-2 opacity-50" />
        <span className="font-bold text-sm">Buat Grup Varian Baru</span>
        <span className="text-xs mt-1">Misal: Topping, Level Gula, Ukuran</span>
      </button>
    </div>
  );
}
