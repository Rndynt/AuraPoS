import { ProductArea } from "../pos/ProductArea";

export default function ProductAreaExample() {
  return (
    <div className="h-screen">
      <ProductArea onAddToCart={(p) => console.log("Add to cart:", p.name)} />
    </div>
  );
}
