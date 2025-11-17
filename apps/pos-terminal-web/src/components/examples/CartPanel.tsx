import { useState } from "react";
import { nanoid } from "nanoid";
import { CartPanel } from "../pos/CartPanel";
import { mockProducts } from "@/lib/mockData";
import { DEFAULT_TAX_RATE, DEFAULT_SERVICE_CHARGE_RATE } from "@pos/core/pricing";
import type { CartItem } from "@/hooks/useCart";

export default function CartPanelExample() {
  type ProductVariant = NonNullable<(typeof mockProducts)[number]["variants"]>[number];

  const createCartItem = (product: (typeof mockProducts)[number], variant?: ProductVariant, quantity = 1): CartItem => {
    const variantDelta = variant?.price_delta || 0;
    const unitPrice = product.base_price + variantDelta;
    return {
      id: nanoid(),
      product,
      variant,
      selectedOptions: [],
      quantity,
      itemTotal: unitPrice * quantity,
      note: "",
    };
  };

  const [items, setItems] = useState<CartItem[]>([
    createCartItem(mockProducts[0], mockProducts[0].variants?.[1], 2),
    createCartItem(mockProducts[2], undefined, 1),
  ]);

  const getItemPrice = (item: CartItem) => {
    const optionsDelta = item.selectedOptions.reduce((sum, opt) => sum + opt.price_delta, 0);
    return item.product.base_price + (item.variant?.price_delta || 0) + optionsDelta;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const tax = subtotal * DEFAULT_TAX_RATE;
  const serviceCharge = subtotal * DEFAULT_SERVICE_CHARGE_RATE;
  const total = subtotal + tax + serviceCharge;

  return (
    <div className="h-screen w-[360px]">
      <CartPanel
        items={items}
        onUpdateQty={(id, qty) => {
          setItems(items.map(item =>
            item.id === id
              ? { ...item, quantity: qty, itemTotal: getItemPrice(item) * qty }
              : item
          ));
        }}
        onRemove={(id) => {
          console.log("Remove:", id);
          setItems(items.filter(item => item.id !== id));
        }}
        onClear={() => {
          console.log("Clear cart");
          setItems([]);
        }}
        getItemPrice={getItemPrice}
        subtotal={subtotal}
        taxRate={DEFAULT_TAX_RATE}
        tax={tax}
        serviceChargeRate={DEFAULT_SERVICE_CHARGE_RATE}
        serviceCharge={serviceCharge}
        total={total}
        onCharge={() => console.log("Charge!")}
        onPartialPayment={() => console.log("Partial payment")}
        onKitchenTicket={() => console.log("Kitchen ticket")}
        hasPartialPayment={true}
        hasKitchenTicket={true}
      />
    </div>
  );
}
