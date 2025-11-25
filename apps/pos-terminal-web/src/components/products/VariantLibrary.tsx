import { Box, SlidersHorizontal, Plus, Trash2 } from "lucide-react";
import { type Variant } from "@/hooks/useVariants";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";

interface VariantLibraryProps {
  variants: Variant[];
  products: any[];
  onVariantClick: (variant: Variant) => void;
  onCreateNew: () => void;
  onToggleVariantOption?: (variantId: string, optionIndex: number, newStatus: boolean) => void;
  loadingVariantToggles?: Set<string>;
}

export default function VariantLibrary({
  variants,
  products,
  onVariantClick,
  onCreateNew,
  onToggleVariantOption,
  loadingVariantToggles = new Set(),
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
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            data-testid={`variant-card-${variant.id}`}
          >
            <div
              onClick={() => onVariantClick(variant)}
              className="p-5 flex justify-between items-start cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 group"
            >
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

            <div className="p-4 bg-slate-50 flex-1">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>Opsi ({variant.options.length})</span>
                <span className="text-[10px] font-normal normal-case">
                  Klik toggle untuk on/off
                </span>
              </p>
              <div className="grid grid-cols-1 gap-2">
                {variant.options.map((opt, i) => {
                  const isAvailable = opt.available !== false;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between bg-white border px-3 py-2 rounded-lg transition-all ${
                        !isAvailable
                          ? "border-slate-100 opacity-60"
                          : "border-slate-200"
                      }`}
                      data-testid={`variant-option-${variant.id}-${i}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-bold ${
                            !isAvailable
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
                        checked={isAvailable}
                        onChange={(val) => {
                          if (onToggleVariantOption) {
                            onToggleVariantOption(variant.id, i, val);
                          }
                        }}
                        isLoading={loadingVariantToggles.has(`${variant.id}-${i}`)}
                        data-testid={`toggle-option-${variant.id}-${i}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={onCreateNew}
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all min-h-[250px]"
        data-testid="button-create-variant"
      >
        <Plus size={32} className="mb-2 opacity-50" />
        <span className="font-bold text-sm">Buat Grup Varian Baru</span>
        <span className="text-xs mt-1">Misal: Topping, Level Gula, Ukuran</span>
      </button>
    </div>
  );
}
