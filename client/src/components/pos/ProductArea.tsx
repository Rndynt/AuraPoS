import { useState } from "react";
import { Product, categories, getProductsByCategory } from "@/lib/mockData";
import { ProductCard } from "./ProductCard";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProductAreaProps = {
  onAddToCart: (product: Product) => void;
};

export function ProductArea({ onAddToCart }: ProductAreaProps) {
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");

  const products = getProductsByCategory(selectedCategory);
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-muted/40">
      {/* Top Bar */}
      <div className="p-4 bg-background border-b flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-products"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span data-testid="text-tenant">demo-tenant</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 bg-background border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                className="flex-shrink-0 rounded-full"
                onClick={() => setSelectedCategory(category)}
                data-testid={`button-category-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground" data-testid="text-no-products">
                No products found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
