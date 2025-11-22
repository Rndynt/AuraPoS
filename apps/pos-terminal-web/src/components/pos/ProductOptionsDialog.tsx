import { useState, useEffect } from "react";
import type { Product, ProductVariant, ProductOptionGroup } from "@pos/domain/catalog/types";
import type { SelectedOption } from "@pos/domain/orders/types";
import { X, Minus, Plus } from "lucide-react";

interface ProductOptionsDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAdd: (product: Product, variant: ProductVariant | undefined, selectedOptions: SelectedOption[], qty: number) => void;
}

export function ProductOptionsDialog({
  product,
  open,
  onClose,
  onAdd,
}: ProductOptionsDialogProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<Map<string, SelectedOption[]>>(new Map());
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (open && product) {
      setSelectedVariant(product.variants?.[0]);
      setSelectedOptionsByGroup(new Map());
      setQty(1);
    }
  }, [open, product]);

  if (!product || !open) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleOptionToggle = (group: ProductOptionGroup, optionId: string, optionName: string, priceDelta: number) => {
    const currentSelections = selectedOptionsByGroup.get(group.id) || [];
    const isSelected = currentSelections.some(opt => opt.option_id === optionId);

    let newSelections: SelectedOption[];

    if (group.selection_type === "single") {
      newSelections = [{
        group_id: group.id,
        group_name: group.name,
        option_id: optionId,
        option_name: optionName,
        price_delta: priceDelta,
      }];
    } else {
      if (isSelected) {
        newSelections = currentSelections.filter(opt => opt.option_id !== optionId);
      } else {
        if (group.max_selections > 0 && currentSelections.length >= group.max_selections) {
          return;
        }
        newSelections = [
          ...currentSelections,
          {
            group_id: group.id,
            group_name: group.name,
            option_id: optionId,
            option_name: optionName,
            price_delta: priceDelta,
          },
        ];
      }
    }

    const newMap = new Map(selectedOptionsByGroup);
    if (newSelections.length === 0) {
      newMap.delete(group.id);
    } else {
      newMap.set(group.id, newSelections);
    }
    setSelectedOptionsByGroup(newMap);
  };

  const calculateTotal = () => {
    const basePrice = product.base_price;
    const variantDelta = selectedVariant?.price_delta || 0;
    
    let optionsDelta = 0;
    selectedOptionsByGroup.forEach((selections) => {
      selections.forEach((opt) => {
        optionsDelta += opt.price_delta;
      });
    });

    return (basePrice + variantDelta + optionsDelta) * qty;
  };

  const getAllSelectedOptions = (): SelectedOption[] => {
    const allOptions: SelectedOption[] = [];
    selectedOptionsByGroup.forEach((selections) => {
      allOptions.push(...selections);
    });
    return allOptions;
  };

  const handleAdd = () => {
    const selectedOptions = getAllSelectedOptions();
    onAdd(product, selectedVariant, selectedOptions, qty);
    onClose();
    
    setSelectedVariant(product.variants?.[0]);
    setSelectedOptionsByGroup(new Map());
    setQty(1);
  };

  const sortedOptionGroups = product.option_groups
    ? [...product.option_groups].sort((a, b) => a.display_order - b.display_order)
    : [];

  const total = calculateTotal();

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      data-testid="dialog-product-options"
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {product.name}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
            data-testid="button-close-options"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {product.has_variants && product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <h4 className="font-bold text-slate-700 text-sm">
                  Variant
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  Wajib
                </span>
              </div>
              {product.variants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                return (
                  <label
                    key={variant.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                    data-testid={`option-variant-${variant.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isSelected
                            ? 'font-semibold text-blue-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {variant.name}
                      </span>
                    </div>
                    {variant.price_delta !== 0 && variant.price_delta !== undefined && (
                      <span className="text-xs font-medium text-slate-500">
                        {variant.price_delta > 0 ? '+' : ''}
                        {formatPrice(variant.price_delta)}
                      </span>
                    )}
                    <input
                      type="radio"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => setSelectedVariant(variant)}
                    />
                  </label>
                );
              })}
            </div>
          )}

          {sortedOptionGroups.map((group, idx) => {
            const selections = selectedOptionsByGroup.get(group.id) || [];
            const availableOptions = group.options.filter(opt => opt.is_available !== false);

            return (
              <div key={group.id} className="space-y-2">
                <div className="flex justify-between">
                  <h4 className="font-bold text-slate-700 text-sm">
                    {group.name}
                  </h4>
                  {group.is_required && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      Wajib
                    </span>
                  )}
                </div>
                {availableOptions.map((option) => {
                  const isSelected = group.selection_type === "single"
                    ? selections[0]?.option_id === option.id
                    : selections.some(sel => sel.option_id === option.id);

                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      data-testid={`option-${group.id}-${option.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isSelected
                              ? 'font-semibold text-blue-900'
                              : 'text-slate-600'
                          }`}
                        >
                          {option.name}
                        </span>
                      </div>
                      {option.price_delta !== 0 && option.price_delta > 0 && (
                        <span className="text-xs font-medium text-slate-500">
                          +{formatPrice(option.price_delta)}
                        </span>
                      )}
                      <input
                        type={group.selection_type === 'single' ? 'radio' : 'checkbox'}
                        className="hidden"
                        checked={isSelected}
                        onChange={() => {
                          handleOptionToggle(group, option.id, option.name, option.price_delta);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            );
          })}

          <div className="pt-4 border-t border-dashed border-slate-200">
            <p className="font-bold text-sm text-slate-700 mb-3">Jumlah</p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 rounded-full border hover:bg-slate-50 flex items-center justify-center"
                data-testid="button-qty-minus"
              >
                <Minus size={18} />
              </button>
              <span className="text-xl font-bold w-8 text-center" data-testid="text-qty">
                {qty}
              </span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 rounded-full border hover:bg-slate-50 flex items-center justify-center"
                data-testid="button-qty-plus"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-between px-6 hover:bg-blue-700"
            data-testid="button-add-to-cart"
          >
            <span>Tambah</span>
            <span>{formatPrice(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
