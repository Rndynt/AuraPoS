import { useState } from "react";
import { CartItem, Product, ProductVariant } from "@/lib/mockData";
import { nanoid } from "nanoid";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, variant?: ProductVariant, qty: number = 1) => {
    const existingIndex = items.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.variant?.id === variant?.id
    );

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].qty += qty;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          id: nanoid(),
          product,
          variant,
          qty,
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
      items.map((item) => (item.id === id ? { ...item, qty } : item))
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
    return item.product.base_price + (item.variant?.price_delta || 0);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + getItemPrice(item) * item.qty,
    0
  );

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
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
  };
}
