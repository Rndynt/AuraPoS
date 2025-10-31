import { CartItem } from "../pos/CartItem";
import { mockProducts } from "@/lib/mockData";

export default function CartItemExample() {
  const mockCartItems = [
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
  ];

  const getItemPrice = (item: typeof mockCartItems[0]) => {
    return item.product.base_price + (item.variant?.price_delta || 0);
  };

  return (
    <div className="p-6 max-w-md space-y-2 bg-background">
      {mockCartItems.map((item) => (
        <CartItem
          key={item.id}
          item={item}
          onUpdateQty={(id, qty) => console.log("Update qty:", id, qty)}
          onRemove={(id) => console.log("Remove:", id)}
          getItemPrice={getItemPrice}
        />
      ))}
    </div>
  );
}
