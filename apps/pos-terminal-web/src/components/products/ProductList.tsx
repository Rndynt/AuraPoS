import { useState } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

interface ProductListProps {
  products: any[];
  onProductClick: (product: any) => void;
}

const formatIDR = (price: number | string) => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
};

export default function ProductList({ products, onProductClick }: ProductListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const groupedProducts = products.reduce((acc, product) => {
    const cat = product.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedProducts).map(([category, items]) => {
        const isCollapsed = collapsedCategories[category];
        return (
          <div
            key={category}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            data-testid={`category-${category}`}
          >
            <div
              onClick={() => toggleCategory(category)}
              className="p-4 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
              data-testid={`category-header-${category}`}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700 capitalize">{category}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div
                className={`text-slate-400 transition-transform duration-300 ${
                  isCollapsed ? "-rotate-90" : "rotate-0"
                }`}
              >
                <ChevronDown size={20} />
              </div>
            </div>

            {!isCollapsed && (
              <div className="divide-y divide-slate-100 animate-in slide-in-from-top-2">
                {items.map((product) => {
                  const price = product.base_price || product.basePrice || 0;
                  const stock = product.stock_qty ?? product.stockQty ?? 0;
                  const variantsCount = product.option_groups?.length || 0;
                  const imageUrl = product.image_url || product.imageUrl || "";

                  return (
                    <div
                      key={product.id}
                      onClick={() => onProductClick(product)}
                      className="p-3 flex items-center gap-4 hover:bg-blue-50 cursor-pointer transition-colors group"
                      data-testid={`product-card-${product.id}`}
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            className="w-full h-full object-cover"
                            alt={product.name}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 truncate">
                            {product.name}
                          </h4>
                          <span className="font-bold text-blue-600 text-sm">
                            {formatIDR(price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              stock < 10
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            Stok: {stock}
                          </span>
                          {variantsCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              <Layers size={10} /> {variantsCount} Varian
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        size={16}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
