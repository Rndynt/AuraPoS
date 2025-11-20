import { useState, useEffect } from "react";
import type { Product, ProductVariant, ProductOptionGroup } from "@pos/domain/catalog/types";
import type { SelectedOption } from "@pos/domain/orders/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, AlertCircle } from "lucide-react";

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
  // State for legacy variant selection
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  
  // State for modern option groups - Map<group_id, SelectedOption[]>
  const [selectedOptionsByGroup, setSelectedOptionsByGroup] = useState<Map<string, SelectedOption[]>>(new Map());
  
  // Quantity state
  const [qty, setQty] = useState(1);
  
  // Validation errors - Map<group_id, error_message>
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());
  const [selectionWarnings, setSelectionWarnings] = useState<Map<string, string>>(new Map());

  // Reset state when dialog opens or product changes
  useEffect(() => {
    if (open && product) {
      setSelectedVariant(product.variants?.[0]);
      setSelectedOptionsByGroup(new Map());
      setQty(1);
      setValidationErrors(new Map());
      setSelectionWarnings(new Map());
    }
  }, [open, product]);

  // Early return if no product
  if (!product) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const updateGroupWarning = (groupId: string, message?: string) => {
    setSelectionWarnings((prev) => {
      const next = new Map(prev);
      if (message) {
        next.set(groupId, message);
      } else {
        next.delete(groupId);
      }
      return next;
    });
  };

  /**
   * Handle option selection for multi-select groups
   */
  const handleOptionToggle = (group: ProductOptionGroup, optionId: string, optionName: string, priceDelta: number) => {
    const currentSelections = selectedOptionsByGroup.get(group.id) || [];
    const isSelected = currentSelections.some(opt => opt.option_id === optionId);

    let newSelections: SelectedOption[];

    if (group.selection_type === "single") {
      // Radio behavior - replace selection
      newSelections = [{
        group_id: group.id,
        group_name: group.name,
        option_id: optionId,
        option_name: optionName,
        price_delta: priceDelta,
      }];
    } else {
      // Checkbox behavior - toggle
      if (isSelected) {
        newSelections = currentSelections.filter(opt => opt.option_id !== optionId);
      } else {
        // Check max_selections
        if (group.max_selections > 0 && currentSelections.length >= group.max_selections) {
          updateGroupWarning(group.id, `You can select up to ${group.max_selections} options`);
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
    updateGroupWarning(group.id);
  };

  /**
   * Validate all option groups
   */
  const validateSelections = (): boolean => {
    const errors = new Map<string, string>();
    
    if (!product.option_groups) return true;

    for (const group of product.option_groups) {
      const selections = selectedOptionsByGroup.get(group.id) || [];
      const count = selections.length;

      if (group.is_required && count < group.min_selections) {
        if (group.min_selections === 1) {
          errors.set(group.id, `Please select an option`);
        } else {
          errors.set(group.id, `Please select at least ${group.min_selections} options`);
        }
      } else if (count < group.min_selections) {
        errors.set(group.id, `Select at least ${group.min_selections}`);
      }
    }

    setValidationErrors(errors);
    return errors.size === 0;
  };

  /**
   * Calculate total price including all deltas
   */
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

  /**
   * Get all selected options as a flat array
   */
  const getAllSelectedOptions = (): SelectedOption[] => {
    const allOptions: SelectedOption[] = [];
    selectedOptionsByGroup.forEach((selections) => {
      allOptions.push(...selections);
    });
    return allOptions;
  };

  /**
   * Handle Add to Cart
   */
  const handleAdd = () => {
    if (!validateSelections()) {
      return;
    }

    const selectedOptions = getAllSelectedOptions();
    onAdd(product, selectedVariant, selectedOptions, qty);
    onClose();
    
    // Reset state
    setSelectedVariant(product.variants?.[0]);
    setSelectedOptionsByGroup(new Map());
    setQty(1);
    setValidationErrors(new Map());
    setSelectionWarnings(new Map());
  };

  /**
   * Check if Add to Cart should be disabled
   */
  const isAddDisabled = () => {
    // Run validation without setting errors (silent check)
    if (!product.option_groups) return false;

    for (const group of product.option_groups) {
      const selections = selectedOptionsByGroup.get(group.id) || [];
      const count = selections.length;

      if (group.is_required && count < group.min_selections) {
        return true;
      }
    }

    return false;
  };

  /**
   * Get group requirement label
   */
  const getGroupRequirementLabel = (group: ProductOptionGroup): string => {
    const parts: string[] = [];
    
    if (group.is_required) {
      parts.push("Required");
    } else {
      parts.push("Optional");
    }

    const min = group.min_selections ?? 0;
    const max = group.max_selections ?? 999;

    if (group.selection_type === "single") {
      parts.push("Select 1");
    } else {
      if (min === max) {
        parts.push(`Select ${min}`);
      } else if (min > 0 && max < 999) {
        parts.push(`Select ${min}-${max}`);
      } else if (min > 0) {
        parts.push(`Select at least ${min}`);
      } else if (max < 999) {
        parts.push(`Select up to ${max}`);
      }
    }

    return parts.join(" • ");
  };

  // Sort option groups by display_order
  const sortedOptionGroups = product.option_groups
    ? [...product.option_groups].sort((a, b) => a.display_order - b.display_order)
    : [];

  const total = calculateTotal();
  const basePrice = product.base_price;
  const variantDelta = selectedVariant?.price_delta || 0;
  let optionsDelta = 0;
  selectedOptionsByGroup.forEach((selections) => {
    selections.forEach((opt) => {
      optionsDelta += opt.price_delta;
    });
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-[96vw] max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col gap-0 p-0" 
        data-testid="dialog-product-options"
      >
        <DialogHeader className="p-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 pb-32 space-y-4">
            {/* Product Image */}
          {/* {product.image_url && (
             <div className="hidden sm:block sm:max-h-32 overflow-hidden rounded-md bg-muted">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )} */}

            {/* Legacy Variants Section */}
            {product.has_variants && product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <Label className="text-sm font-semibold">Variant</Label>
                  <Badge variant="outline" className="text-[10px]">Required • Select 1</Badge>
                </div>
                <RadioGroup
                  value={selectedVariant?.id}
                  onValueChange={(id) =>
                    setSelectedVariant(product.variants?.find((v) => v.id === id))
                  }
                >
                  <div className="space-y-1.5">
                    {product.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center gap-2 p-2.5 rounded-md border hover-elevate"
                        data-testid={`option-variant-${variant.id}`}
                      >
                        <RadioGroupItem value={variant.id} id={variant.id} />
                        <Label
                          htmlFor={variant.id}
                          className="flex-1 flex items-center justify-between cursor-pointer text-sm"
                        >
                          <span className="flex items-center gap-2">
                            {variant.name}
                            {variant.color && (
                              <Badge
                                style={{ backgroundColor: variant.color }}
                                className="w-3 h-3 p-0 rounded-full"
                              />
                            )}
                          </span>
                          {variant.price_delta !== 0 && (
                            <span className="text-xs font-medium">
                              {variant.price_delta && variant.price_delta > 0 ? "+" : ""}
                              {formatPrice(variant.price_delta || 0)}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Option Groups Section */}
            {sortedOptionGroups.map((group, index) => {
              const selections = selectedOptionsByGroup.get(group.id) || [];
              const error = validationErrors.get(group.id);
              const warning = selectionWarnings.get(group.id);
              const availableOptions = group.options.filter(opt => opt.is_available !== false);

              return (
                <div key={group.id}>
                  {(index > 0 || (product.has_variants && product.variants && product.variants.length > 0)) && (
                    <Separator className="mb-3" />
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <Label className="text-sm font-semibold">{group.name}</Label>
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        {getGroupRequirementLabel(group)}
                      </Badge>
                    </div>

                    {/* Validation Error */}
                    {error && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive" data-testid={`error-${group.id}`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {warning && !error && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600" data-testid={`warning-${group.id}`}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    )}

                    {/* Single Selection (Radio) */}
                    {group.selection_type === "single" && (
                      <RadioGroup
                        value={selections[0]?.option_id || ""}
                        onValueChange={(optionId) => {
                          const option = group.options.find(opt => opt.id === optionId);
                          if (option) {
                            handleOptionToggle(group, option.id, option.name, option.price_delta);
                          }
                        }}
                      >
                        <div className="space-y-1.5">
                          {availableOptions.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center gap-2 p-2.5 rounded-md border hover-elevate"
                              data-testid={`option-${group.id}-${option.id}`}
                            >
                              <RadioGroupItem value={option.id} id={`${group.id}-${option.id}`} />
                              <Label
                                htmlFor={`${group.id}-${option.id}`}
                                className="flex-1 flex items-center justify-between cursor-pointer text-sm"
                              >
                                <span>{option.name}</span>
                                {option.price_delta !== 0 && (
                                  <span className="text-xs font-medium">
                                    {option.price_delta > 0 ? "+" : ""}
                                    {formatPrice(option.price_delta)}
                                  </span>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}

                    {/* Multiple Selection (Checkbox) */}
                    {group.selection_type === "multiple" && (
                      <div className="space-y-1.5">
                        {availableOptions.map((option) => {
                          const isSelected = selections.some(sel => sel.option_id === option.id);
                          const isMaxReached = selections.length >= group.max_selections && !isSelected;

                          return (
                            <div
                              key={option.id}
                              className={`flex items-center gap-2 p-2.5 rounded-md border hover-elevate ${
                                isSelected ? "bg-accent/50" : ""
                              }`}
                              data-testid={`option-${group.id}-${option.id}`}
                            >
                              <Checkbox
                                id={`${group.id}-${option.id}`}
                                checked={isSelected}
                                disabled={isMaxReached}
                                onCheckedChange={() => {
                                  handleOptionToggle(group, option.id, option.name, option.price_delta);
                                }}
                              />
                              <Label
                                htmlFor={`${group.id}-${option.id}`}
                                className="flex-1 flex items-center justify-between cursor-pointer text-sm"
                              >
                                <span>{option.name}</span>
                                {option.price_delta !== 0 && (
                                  <span className="text-xs font-medium">
                                    {option.price_delta > 0 ? "+" : ""}
                                    {formatPrice(option.price_delta)}
                                  </span>
                                )}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quantity Selector */}
            <div>
              <Separator className="mb-3" />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Quantity</Label>
                <div className="flex items-center gap-3 justify-center sm:justify-start">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    data-testid="button-qty-minus"
                    className="h-9 w-9"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="w-14 text-center text-base font-semibold tabular-nums" data-testid="text-qty">
                    {qty}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setQty(qty + 1)}
                    data-testid="button-qty-plus"
                    className="h-9 w-9"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-3 bg-muted rounded-md space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Base Price</span>
                <span className="tabular-nums">{formatPrice(basePrice)}</span>
              </div>
              
              {variantDelta !== 0 && (
                <div className="flex justify-between text-xs">
                  <span>Variant</span>
                  <span className="tabular-nums">
                    {variantDelta > 0 ? "+" : ""}
                    {formatPrice(variantDelta)}
                  </span>
                </div>
              )}
              
              {optionsDelta !== 0 && (
                <div className="flex justify-between text-xs">
                  <span>Options</span>
                  <span className="tabular-nums">
                    {optionsDelta > 0 ? "+" : ""}
                    {formatPrice(optionsDelta)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-xs">
                <span>Quantity</span>
                <span className="tabular-nums">×{qty}</span>
              </div>
              
              <Separator className="my-1.5" />
              
              <div className="flex justify-between font-semibold text-sm">
                <span>Total</span>
                <span className="tabular-nums" data-testid="text-options-total">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
        </div>

        <DialogFooter 
          className="flex-shrink-0 border-t p-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Button 
            variant="outline" 
            onClick={onClose} 
            data-testid="button-cancel-options"
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={isAddDisabled()}
            data-testid="button-add-to-cart"
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
