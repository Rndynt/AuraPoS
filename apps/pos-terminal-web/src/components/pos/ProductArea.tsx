import { useState, useMemo } from "react";
import type { Product } from "@/../../packages/domain/catalog/types";
import { ProductCard } from "./ProductCardV2";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type ProductAreaProps = {
  products: Product[];
  isLoading?: boolean;
  error?: Error | null;
  onAddToCart: (product: Product) => void;
};

// Extract unique categories from products
const getCategories = (products: Product[]): string[] => {
  if (!products || products.length === 0) {
    return ["Popular"];
  }
  const categorySet = new Set(products.map(p => p.category));
  return ["Popular", ...Array.from(categorySet).sort()];
};

// Filter products by category
const filterByCategory = (products: Product[], category: string): Product[] => {
  if (!products || products.length === 0) {
    return [];
  }
  if (category === "Popular") {
    return products.slice(0, 4);
  }
  return products.filter(p => p.category === category);
};

export function ProductArea({ products, isLoading, error, onAddToCart }: ProductAreaProps) {
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => getCategories(products), [products]);

  const filteredProducts = useMemo(() => {
    const categoryFiltered = filterByCategory(products, selectedCategory);
    if (!searchQuery) return categoryFiltered;
    
    return categoryFiltered.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-muted/40">
      {/* Top Bar - with padding for mobile hamburger button */}
      <div className="p-3 md:p-4 pl-16 md:pl-4 bg-background border-b flex items-center gap-3 md:gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10 h-9 md:h-10 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-products"
            disabled={isLoading}
          />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span data-testid="text-tenant">demo-tenant</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-background border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            {isLoading ? (
              <>
                <Skeleton className="h-8 md:h-9 w-20 md:w-24 rounded-full flex-shrink-0" />
                <Skeleton className="h-8 md:h-9 w-16 md:w-20 rounded-full flex-shrink-0" />
                <Skeleton className="h-8 md:h-9 w-16 md:w-20 rounded-full flex-shrink-0" />
                <Skeleton className="h-8 md:h-9 w-20 md:w-24 rounded-full flex-shrink-0" />
              </>
            ) : (
              categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "ghost"}
                  className="flex-shrink-0 rounded-full h-8 md:h-9 px-3 md:px-4 text-sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`button-category-${category.toLowerCase()}`}
                >
                  {category}
                </Button>
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1">
        <div className="p-2 md:p-3 lg:p-4 pb-20 md:pb-4">
          {error ? (
            <div className="py-16 text-center">
              <p className="text-destructive mb-2" data-testid="text-error">
                Failed to load products
              </p>
              <p className="text-sm text-muted-foreground">
                {error.message}
              </p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground" data-testid="text-no-products">
                No products found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
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

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 md:h-5 w-3/4" />
          <Skeleton className="h-5 md:h-6 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-4 md:h-5 w-16" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}
