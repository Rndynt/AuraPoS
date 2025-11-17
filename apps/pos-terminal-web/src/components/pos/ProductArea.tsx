import { useState, useMemo } from "react";
import type { Product } from "@/../../packages/domain/catalog/types";
import type { OrderType } from "@/../../packages/domain/orders/types";
import { ProductCard } from "./ProductCardV2";
import { POSHeader } from "./POSHeader";
import { SidebarContent } from "./Sidebar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const DEFAULT_CATEGORY = "All";

type ProductAreaProps = {
  products: Product[];
  isLoading?: boolean;
  error?: Error | null;
  onAddToCart: (product: Product) => void;
  orderTypes: OrderType[];
  orderTypesLoading: boolean;
  selectedOrderTypeId: string | null;
  onSelectOrderType: (orderTypeId: string | null) => void;
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
  onAddToCart,
  orderTypes,
  orderTypesLoading,
  selectedOrderTypeId,
  onSelectOrderType
}: ProductAreaProps) {
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => getCategories(products), [products]);

  // Defensive filter - only show active order types
  const activeOrderTypes = useMemo(() => {
    return orderTypes.filter(ot => ot.isActive === true);
  }, [orderTypes]);

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
    <div className="flex-1 flex flex-col bg-muted/40 min-h-0 overflow-x-hidden w-full max-w-full">
      {/* Unified Header */}
      <POSHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchDisabled={isLoading}
        sidebarContent={<SidebarContent />}
      />

      {/* Order Type Tabs */}
      <div className="sticky top-[86px] sm:top-[62px] md:top-[74px] z-20 bg-background border-b">
        <div className="px-3 md:px-4 py-2 md:py-3">
          <ScrollArea className="w-full">
            <div className="flex gap-2">
              {orderTypesLoading ? (
                <>
                  <Skeleton className="h-8 md:h-9 w-24 md:w-28 rounded-full flex-shrink-0" />
                  <Skeleton className="h-8 md:h-9 w-24 md:w-28 rounded-full flex-shrink-0" />
                  <Skeleton className="h-8 md:h-9 w-20 md:w-24 rounded-full flex-shrink-0" />
                </>
              ) : activeOrderTypes.length > 0 ? (
                activeOrderTypes.map((orderType) => (
                  <Button
                    key={orderType.id}
                    variant={selectedOrderTypeId === orderType.id ? "default" : "ghost"}
                    className="flex-shrink-0 rounded-full h-8 md:h-9 px-3 md:px-4 text-sm"
                    onClick={() => onSelectOrderType(orderType.id)}
                    data-testid={`button-order-type-${orderType.code.toLowerCase()}`}
                  >
                    {orderType.name}
                  </Button>
                ))
              ) : null}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-[134px] sm:top-[110px] md:top-[122px] z-10 bg-background border-b">
        <div className="px-3 md:px-4 py-2 md:py-3">
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
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
        <div className="p-2 md:p-3 lg:p-4 pb-28 md:pb-6 w-full max-w-full">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 w-full max-w-full">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 w-full max-w-full">
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
