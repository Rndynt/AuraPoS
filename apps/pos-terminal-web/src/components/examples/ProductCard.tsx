import { ProductCard } from "../pos/ProductCardV2";
import { mockProducts } from "@/lib/mockData";

export default function ProductCardExample() {
  return (
    <div className="p-6 grid grid-cols-3 gap-4 max-w-4xl">
      {mockProducts.slice(0, 3).map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={(p) => console.log("Add to cart:", p.name)}
        />
      ))}
    </div>
  );
}
