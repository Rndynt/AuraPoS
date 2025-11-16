import { useState } from "react";
import { nanoid } from "nanoid";
import type { Product, ProductVariant } from "@/../../packages/domain/catalog/types";
import type { SelectedOption } from "@/../../packages/domain/orders/types";

/**
 * Cart item representation on the frontend
 * Supports both legacy variants and modern multi-variant option groups
 */
export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  selectedOptions: SelectedOption[];
  quantity: number;
  itemTotal: number;
  note?: string;
}

/**
 * Backend order item payload format
 * Used when submitting orders to the API
 */
export interface BackendOrderItem {
  product_id: string;
  product_name: string;
  base_price: number;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  variant_price_delta?: number;
  selected_options?: SelectedOption[];
  notes?: string;
}

/**
 * Serializes selected options into a stable, deterministic string for deduplication
 * Sorts by group_id then option_id to ensure consistent keys
 * 
 * @example
 * serializeOptions([
 *   { group_id: "size", option_id: "large", ... },
 *   { group_id: "sugar", option_id: "less", ... }
 * ]) 
 * // => "size:large|sugar:less"
 */
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

/**
 * Compares two option arrays for equality
 */
function compareOptions(opt1: SelectedOption[], opt2: SelectedOption[]): boolean {
  return serializeOptions(opt1) === serializeOptions(opt2);
}

/**
 * Calculates total price for a cart item
 * Price = (base_price + variant_delta + sum(option_deltas)) * quantity
 * 
 * @param product - The product
 * @param variant - Optional legacy variant (has price_delta)
 * @param selectedOptions - Array of selected options from option groups
 * @param quantity - Item quantity
 * @returns Total price including all modifiers
 */
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

/**
 * Creates a unique key for cart item deduplication
 * Items with same product, variant, and options are considered identical
 * 
 * @example
 * // Same product with different options = different keys
 * createItemKey(coffee, null, [extraShot]) !== createItemKey(coffee, null, [])
 * 
 * // Same product with same options = same key (will merge quantities)
 * createItemKey(coffee, null, [extraShot]) === createItemKey(coffee, null, [extraShot])
 */
function createItemKey(
  product: Product,
  variant: ProductVariant | undefined,
  selectedOptions: SelectedOption[]
): string {
  const variantPart = variant?.id || "no-variant";
  const optionsPart = serializeOptions(selectedOptions);
  return `${product.id}:${variantPart}:${optionsPart}`;
}

/**
 * Cart management hook with full support for multi-variant modifiers
 * 
 * Features:
 * - Supports legacy variants (single selection with price_delta)
 * - Supports modern option groups (multiple selections with individual price_deltas)
 * - Automatic deduplication: same product + variant + options = merged quantity
 * - Backend API ready: includes conversion to order payload format
 * 
 * @example
 * const { addItem, items, total, toBackendOrderItems } = useCart();
 * 
 * // Add product with option groups
 * addItem(coffee, undefined, [
 *   { group_id: "size", group_name: "Size", option_id: "large", option_name: "Large", price_delta: 1.50 },
 *   { group_id: "sugar", group_name: "Sugar", option_id: "less", option_name: "Less Sugar", price_delta: 0 }
 * ]);
 * 
 * // Submit order to backend
 * const orderPayload = {
 *   items: toBackendOrderItems(),
 *   customer_name: "John Doe"
 * };
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  /**
   * Add item to cart with support for variants and option groups
   * 
   * Handles three scenarios:
   * 1. Product with legacy variant only
   * 2. Product with option groups only (modern multi-variant)
   * 3. Product with both variant and option groups (hybrid)
   * 
   * If an identical item exists (same product, variant, options), quantities are merged.
   * 
   * @param product - The product to add
   * @param variant - Optional legacy variant
   * @param selectedOptions - Array of selected options from option groups
   * @param qty - Quantity to add (default: 1)
   */
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
      // Item already exists - merge quantities
      const newItems = [...items];
      const newQty = newItems[existingIndex].quantity + qty;
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newQty,
        itemTotal: calculateItemTotal(product, variant, selectedOptions, newQty),
      };
      setItems(newItems);
    } else {
      // New unique item - add to cart
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

  /**
   * Get unit price for an item (excluding quantity)
   * Calculates: base_price + variant_delta + sum(option_deltas)
   * 
   * @param item - Cart item to calculate price for
   * @returns Unit price including all modifiers
   */
  const getItemPrice = (item: CartItem): number => {
    const basePrice = item.product.base_price;
    const variantDelta = item.variant?.price_delta || 0;
    const optionsDelta = item.selectedOptions.reduce(
      (sum, opt) => sum + opt.price_delta,
      0
    );
    return basePrice + variantDelta + optionsDelta;
  };

  /**
   * Converts cart items to backend order payload format
   * Maps frontend CartItem structure to backend API requirements
   * 
   * @returns Array of order items ready for backend submission
   * 
   * @example
   * // Submit order to backend
   * const response = await fetch('/api/orders', {
   *   method: 'POST',
   *   body: JSON.stringify({
   *     items: cart.toBackendOrderItems(),
   *     customer_name: "John Doe",
   *     table_number: "5"
   *   })
   * });
   */
  const toBackendOrderItems = (): BackendOrderItem[] => {
    return items.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      base_price: item.product.base_price,
      quantity: item.quantity,
      variant_id: item.variant?.id,
      variant_name: item.variant?.name,
      variant_price_delta: item.variant?.price_delta,
      selected_options: item.selectedOptions.length > 0 ? item.selectedOptions : undefined,
      notes: item.note || undefined,
    }));
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
    toBackendOrderItems,
    subtotal,
    tax,
    serviceCharge,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
