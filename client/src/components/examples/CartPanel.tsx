import { useState } from "react";
import { CartPanel } from "../pos/CartPanel";
import { mockProducts } from "@/lib/mockData";

export default function CartPanelExample() {
  const [items, setItems] = useState([
    {
      id: "1",
      product: mockProducts[0],
      variant: mockProducts[0].variants?.[1],
      qty: 2,
    },
    {
      id: "2",
      product: mockProducts[2],
      qty: 1,
    },
  ]);

  const getItemPrice = (item: typeof items[0]) => {
    return item.product.base_price + (item.variant?.price_delta || 0);
  };

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * item.qty, 0);
  const tax = subtotal * 0.1;
  const serviceCharge = subtotal * 0.05;
  const total = subtotal + tax + serviceCharge;

  return (
    <div className="h-screen w-[360px]">
      <CartPanel
        items={items}
        onUpdateQty={(id, qty) => {
          console.log("Update qty:", id, qty);
          setItems(items.map(item => item.id === id ? { ...item, qty } : item));
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
        tax={tax}
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
