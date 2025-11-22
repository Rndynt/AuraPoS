import { useState, useMemo } from "react";
import type { Product } from "@pos/domain/catalog/types";
import { ProductCard } from "./ProductCardV2";
import { ModernPOSHeader } from "./shared/ModernPOSHeader";
import { CategoryChip } from "./shared/CategoryChip";
import { getCategoryIcon } from "@/lib/design-tokens";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const DEFAULT_CATEGORY = "All";

type ProductAreaProps = {
  products: Product[];
  isLoading?: boolean;
  error?: Error | null;
  onAddToCart: (product: Product) => void;
};

// Extract unique categories from products
const getCategories = (products: Product[]): string[] => {
  if (!products || products.length === 0) {
    return [DEFAULT_CATEGORY];
  }
  const categorySet = new Set(products.map(p => p.category).filter(Boolean));
  return [DEFAULT_CATEGORY, ...Array.from(categorySet).sort()];
};

// Filter products by category
const filterByCategory = (products: Product[], category: string): Product[] => {
  if (!products || products.length === 0 || category === DEFAULT_CATEGORY) {
    return products;
  }
  return products.filter(p => p.category === category);
};

export function ProductArea({ 
  products, 
  isLoading, 
  error, 
  onAddToCart
}: ProductAreaProps) {
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => getCategories(products), [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      return products.filter((product) =>
        product.name.toLowerCase().includes(normalizedQuery)
      );
    }

    return filterByCategory(products, selectedCategory);
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col bg-slate-50/50 h-full min-h-0 overflow-x-hidden w-full max-w-full">
      {/* Modern POS Header */}
      <ModernPOSHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchDisabled={isLoading}
      />

      {/* Category Chips */}
      <div className="px-4 md:px-8 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-24 rounded-full flex-shrink-0" />
              <Skeleton className="h-9 w-20 rounded-full flex-shrink-0" />
              <Skeleton className="h-9 w-20 rounded-full flex-shrink-0" />
            </>
          ) : (
            categories.map((category) => (
              <CategoryChip
                key={category}
                id={category}
                name={category}
                icon={getCategoryIcon(category)}
                isActive={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            ))
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-8">
        {error ? (
          <div className="py-16 text-center">
            <p className="text-red-600 mb-2" data-testid="text-error">
              Failed to load products
            </p>
            <p className="text-sm text-slate-500">
              {error.message}
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400" data-testid="text-no-products">
              No products found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
