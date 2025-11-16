import { useState } from "react";
import { nanoid } from "nanoid";
import type { Product, ProductVariant } from "@/../../packages/domain/catalog/types";
import type { SelectedOption } from "@/../../packages/domain/orders/types";

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  selectedOptions: SelectedOption[];
  quantity: number;
  itemTotal: number;
  note?: string;
}

function serializeOptions(options: SelectedOption[]): string {
  if (!options || options.length === 0) return "";
  
  const sorted = [...options].sort((a, b) => {
    const groupCompare = a.group_id.localeCompare(b.group_id);
    if (groupCompare !== 0) return groupCompare;
    return a.option_id.localeCompare(b.option_id);
  });
  
  return sorted
    .map((opt) => `${opt.group_id}:${opt.option_id}`)
    .join("|");
}

function compareOptions(opt1: SelectedOption[], opt2: SelectedOption[]): boolean {
  return serializeOptions(opt1) === serializeOptions(opt2);
}

function calculateItemTotal(
  product: Product,
  variant: ProductVariant | undefined,
  selectedOptions: SelectedOption[],
  quantity: number
): number {
  const basePrice = product.base_price;
  const variantDelta = variant?.price_delta || 0;
  const optionsDelta = selectedOptions.reduce((sum, opt) => sum + opt.price_delta, 0);
  
  return (basePrice + variantDelta + optionsDelta) * quantity;
}

function createItemKey(
  product: Product,
  variant: ProductVariant | undefined,
  selectedOptions: SelectedOption[]
): string {
  const variantPart = variant?.id || "no-variant";
  const optionsPart = serializeOptions(selectedOptions);
  return `${product.id}:${variantPart}:${optionsPart}`;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (
    product: Product,
    variant?: ProductVariant,
    selectedOptions: SelectedOption[] = [],
    qty: number = 1
  ) => {
    const itemKey = createItemKey(product, variant, selectedOptions);
    
    const existingIndex = items.findIndex((item) => {
      const existingKey = createItemKey(item.product, item.variant, item.selectedOptions);
      return existingKey === itemKey;
    });

    if (existingIndex >= 0) {
      const newItems = [...items];
      const newQty = newItems[existingIndex].quantity + qty;
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newQty,
        itemTotal: calculateItemTotal(product, variant, selectedOptions, newQty),
      };
      setItems(newItems);
    } else {
      const itemTotal = calculateItemTotal(product, variant, selectedOptions, qty);
      setItems([
        ...items,
        {
          id: nanoid(),
          product,
          variant,
          selectedOptions,
          quantity: qty,
          itemTotal,
          note: "",
        },
      ]);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            quantity: qty,
            itemTotal: calculateItemTotal(
              item.product,
              item.variant,
              item.selectedOptions,
              qty
            ),
          };
        }
        return item;
      })
    );
  };

  const updateNote = (id: string, note: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemPrice = (item: CartItem): number => {
    const basePrice = item.product.base_price;
    const variantDelta = item.variant?.price_delta || 0;
    const optionsDelta = item.selectedOptions.reduce(
      (sum, opt) => sum + opt.price_delta,
      0
    );
    return basePrice + variantDelta + optionsDelta;
  };

  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const tax = subtotal * 0.1; // 10% tax
  const serviceCharge = subtotal * 0.05; // 5% service
  const total = subtotal + tax + serviceCharge;

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateNote,
    clearCart,
    getItemPrice,
    subtotal,
    tax,
    serviceCharge,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
