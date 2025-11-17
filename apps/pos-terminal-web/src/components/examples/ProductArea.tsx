import { ProductArea } from "../pos/ProductArea";
import { mockProducts } from "@/lib/mockData";

export default function ProductAreaExample() {
  return (
    <div className="h-screen">
      <ProductArea
        products={mockProducts}
        onAddToCart={(p) => console.log("Add to cart:", p.name)}
      />
    </div>
  );
}
