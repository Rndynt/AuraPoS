import { nanoid } from "nanoid";
import { CartItem as CartItemComponent } from "../pos/CartItem";
import { mockProducts } from "@/lib/mockData";
import type { CartItem } from "@/hooks/useCart";
import type { Product, ProductVariant } from "@pos/domain/catalog/types";

export default function CartItemExample() {
  const createCartItem = (product: Product, variant?: ProductVariant, quantity: number = 1): CartItem => {
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

  const mockCartItems: CartItem[] = [
    createCartItem(mockProducts[0], mockProducts[0].variants?.[1], 2),
    createCartItem(mockProducts[2], undefined, 1),
  ];

  const getItemPrice = (item: CartItem) => {
    const optionsDelta = item.selectedOptions.reduce((sum, opt) => sum + opt.price_delta, 0);
    return item.product.base_price + (item.variant?.price_delta || 0) + optionsDelta;
  };

  return (
    <div className="p-6 max-w-md space-y-2 bg-background">
      {mockCartItems.map((item) => (
        <CartItemComponent
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
