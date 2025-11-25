import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  Plus,
  ChevronDown,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useProducts, useCreateProduct, useUpdateProduct } from "@/hooks/api/useProducts";
import { useVariantsLibrary, useCreateOrUpdateVariant, type Variant } from "@/hooks/useVariants";
import ProductForm from "@/components/products/ProductForm";
import VariantForm from "@/components/products/VariantForm";
import VariantLibrary from "@/components/products/VariantLibrary";
import { useToast } from "@/hooks/use-toast";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { queryClient } from "@/lib/queryClient";

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const { toast, addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"products" | "variants">("products");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [viewState, setViewState] = useState<"list" | "form_product" | "form_variant">("list");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [loadingProductToggles, setLoadingProductToggles] = useState<Set<string>>(new Set());
  const [loadingVariantToggles, setLoadingVariantToggles] = useState<Set<string>>(new Set());

  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: variants = [], isLoading: isLoadingVariants } = useVariantsLibrary();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createOrUpdateVariant = useCreateOrUpdateVariant();

  const groupedProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    products.forEach((product) => {
      const category = product.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(product);
    });
    
    // Sort items within each category by name for stable ordering
    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    
    return groups;
  }, [products]);

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setViewState("form_product");
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setViewState("form_product");
  };

  const handleCreateVariant = () => {
    setEditingVariant(null);
    setViewState("form_variant");
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setViewState("form_variant");
  };

  const handleSaveProduct = async (data: any) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          ...data,
          product_id: editingProduct.id,
        });
        toast({
          title: "Berhasil",
          description: "Produk berhasil diperbarui",
        });
      } else {
        await createProduct.mutateAsync(data);
        toast({
          title: "Berhasil",
          description: "Produk berhasil ditambahkan",
        });
      }
      setViewState("list");
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const handleSaveVariant = async (data: any) => {
    try {
      await createOrUpdateVariant.mutateAsync(data);
      toast({
        title: "Berhasil",
        description: editingVariant ? "Varian berhasil diperbarui" : "Varian berhasil dibuat",
      });
      setViewState("list");
      setEditingVariant(null);
    } catch (error) {
      toast({
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const handleCancelForm = () => {
    setViewState("list");
    setEditingProduct(null);
    setEditingVariant(null);
  };

  const handleNavigateToVariants = () => {
    setActiveTab("variants");
    setViewState("list");
  };

  const handleToggleProductAvailability = async (productId: string, newStatus: boolean) => {
    setLoadingProductToggles((prev) => new Set(prev).add(productId));
    // Get current products from cache
    const currentProducts = queryClient.getQueryData(["/api/catalog/products"]) as any[] | undefined;
    let updatedProducts: any[] | undefined;
    
    // Optimistically update the cache
    if (currentProducts) {
      updatedProducts = currentProducts.map((p) =>
        p.id === productId ? { ...p, is_active: newStatus } : p
      );
      queryClient.setQueryData(["/api/catalog/products"], updatedProducts);
    }

    try {
      // Call mutation directly without waiting for cache invalidation
      await updateProduct.mutateAsync({
        product_id: productId,
        is_active: newStatus,
      } as any);
      
      // After mutation succeeds, keep the optimistic state to maintain order
      // Don't let auto-refetch reorder the products
      if (currentProducts && updatedProducts) {
        const latestProducts = queryClient.getQueryData(["/api/catalog/products"]) as any[] | undefined;
        if (latestProducts && latestProducts !== updatedProducts) {
          // If data changed due to refetch, re-apply the sort to maintain order
          const productMap = new Map(latestProducts.map((p) => [p.id, p]));
          const sortedProducts = currentProducts.map((p) => productMap.get(p.id) || p);
          queryClient.setQueryData(["/api/catalog/products"], sortedProducts);
        }
      }
      
      addToast(
        newStatus ? "Produk diaktifkan" : "Produk dinonaktifkan",
        newStatus ? "success" : "info"
      );
    } catch (error) {
      // Revert to previous state on error
      if (currentProducts) {
        queryClient.setQueryData(["/api/catalog/products"], currentProducts);
      }
      addToast("Gagal mengubah status produk", "error");
    } finally {
      setLoadingProductToggles((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleToggleVariantOptionAvailability = async (
    variantId: string,
    optionIndex: number,
    newStatus: boolean
  ) => {
    const toggleKey = `${variantId}-${optionIndex}`;
    setLoadingVariantToggles((prev) => new Set(prev).add(toggleKey));
    // Get current products from cache for optimistic update
    const currentProducts = queryClient.getQueryData(["/api/catalog/products"]) as any[] | undefined;
    let updatedProducts: any[] | undefined;
    
    try {
      const variant = variants.find((v) => v.id === variantId);
      if (!variant) return;

      const updatedOptions = variant.options.map((opt, idx) =>
        idx === optionIndex ? { ...opt, available: newStatus } : opt
      );

      const variantType: "single" | "multiple" = variant.type === "radio" ? "single" : "multiple";
      
      // Optimistically update cache - update products with new variant options
      // Use is_available to match API response format
      if (currentProducts) {
        updatedProducts = currentProducts.map((p) => {
          const optGroups = p.option_groups || [];
          const hasThisVariant = optGroups.some((g: any) => g.name === variant.name);
          
          if (hasThisVariant) {
            return {
              ...p,
              option_groups: optGroups.map((g: any) => 
                g.name === variant.name 
                  ? {
                      ...g,
                      options: (g.options || []).map((opt: any, idx: number) =>
                        idx === optionIndex 
                          ? { ...opt, is_available: newStatus }
                          : opt
                      ),
                    }
                  : g
              ),
            };
          }
          return p;
        });
        queryClient.setQueryData(["/api/catalog/products"], updatedProducts);
      }

      try {
        await createOrUpdateVariant.mutateAsync({
          name: variant.name,
          type: variantType,
          required: variant.required,
          options: updatedOptions.map((opt) => ({
            name: opt.name,
            price_delta: opt.price,
            is_available: opt.available,
          })),
          linkedProducts: products
            .filter((p) =>
              (p.option_groups || []).some((g: any) => g.name === variant.name)
            )
            .map((p) => p.id),
          isEditing: true,
          oldName: variant.name,
        });
        
        // Mark cache as stale so it refetches when accessed, but don't force immediate refetch
        // This prevents UI bounce-back that causes freezing
        await queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] });
      } catch (innerError) {
        // Mutation error caught here, will be handled by outer catch
        throw innerError;
      }

      addToast(
        newStatus ? "Opsi diaktifkan" : "Opsi dinonaktifkan",
        newStatus ? "success" : "info"
      );
    } catch (error) {
      // Revert to previous state on error
      if (currentProducts) {
        queryClient.setQueryData(["/api/catalog/products"], currentProducts);
      }
      addToast("Gagal mengubah status opsi", "error");
    } finally {
      const toggleKey = `${variantId}-${optionIndex}`;
      setLoadingVariantToggles((prev) => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct) return;
    if (confirm(`Hapus produk "${editingProduct.name}"?`)) {
      try {
        await updateProduct.mutateAsync({
          product_id: editingProduct.id,
          is_deleted: true,
        } as any);
        addToast("Produk telah dihapus", "success");
        setViewState("list");
        setEditingProduct(null);
      } catch (error) {
        addToast("Gagal menghapus produk", "error");
      }
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    
    if (confirm(`Hapus varian "${variant.name}"?`)) {
      try {
        // Delete variant by updating with empty options
        await createOrUpdateVariant.mutateAsync({
          name: variant.name,
          type: variant.type === "radio" ? "single" : "multiple",
          required: variant.required,
          options: [],
          linkedProducts: [],
          isEditing: true,
          oldName: variant.name,
          isDeleting: true,
        } as any);
        addToast("Varian telah dihapus", "success");
      } catch (error) {
        addToast("Gagal menghapus varian", "error");
      }
    }
  };

  if (viewState === "form_product") {
    return (
      <ProductForm
        product={editingProduct}
        onSave={handleSaveProduct}
        onCancel={handleCancelForm}
        isLoading={updateProduct.isPending || createProduct.isPending}
        onNavigateToVariants={handleNavigateToVariants}
        onDelete={editingProduct ? handleDeleteProduct : undefined}
      />
    );
  }

  if (viewState === "form_variant") {
    return (
      <VariantForm
        variant={editingVariant}
        products={products}
        onSave={handleSaveVariant}
        onCancel={handleCancelForm}
        isLoading={createOrUpdateVariant.isPending}
        onDelete={editingVariant ? () => handleDeleteVariant(editingVariant.id) : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-extrabold text-slate-800" data-testid="text-page-title">
              Produk & Varian
            </h1>
          </div>
          {activeTab === "products" ? (
            <button
              onClick={handleCreateProduct}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              data-testid="button-add-product"
            >
              <Plus size={18} /> Produk
            </button>
          ) : (
            <button
              onClick={handleCreateVariant}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700"
              data-testid="button-add-variant"
            >
              <Plus size={18} /> Grup Varian
            </button>
          )}
        </div>

        <div className="flex gap-6 border-b border-slate-100 -mb-4">
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === "products"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            data-testid="tab-products"
          >
            Daftar Produk
          </button>
          <button
            onClick={() => setActiveTab("variants")}
            className={`pb-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === "variants"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
            data-testid="tab-variants"
          >
            Perpustakaan Varian
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {activeTab === "products" && (
          <div className="space-y-4">
            {isLoadingProducts ? (
              <div className="text-center py-8 text-slate-400">
                <p>Memuat produk...</p>
              </div>
            ) : Object.keys(groupedProducts).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="mb-2">Belum ada produk</p>
                <p className="text-xs">Klik tombol "+ Produk" untuk menambahkan</p>
              </div>
            ) : (
              Object.entries(groupedProducts).map(([category, items]) => {
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
                        <h3 className="font-bold text-slate-700 capitalize">
                          {category}
                        </h3>
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
                          const variantsCount = product.option_groups?.length || 0;
                          const stockQty = product.stock_qty ?? product.stockQty ?? 0;
                          const imageUrl = product.image_url || product.imageUrl || "";
                          const basePrice = product.base_price || product.basePrice || 0;
                          const isActive = product.is_active !== false;

                          return (
                            <div
                              key={product.id}
                              className={`p-3 flex items-center gap-4 transition-colors group ${
                                !isActive
                                  ? "bg-slate-50 opacity-70"
                                  : "hover:bg-blue-50"
                              }`}
                              data-testid={`product-card-${product.id}`}
                            >
                              <div
                                onClick={() => handleEditProduct(product)}
                                className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
                              >
                                <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      className={`w-full h-full object-cover transition-all ${
                                        !isActive ? "grayscale" : ""
                                      }`}
                                      alt={product.name}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <Plus size={20} />
                                    </div>
                                  )}
                                  {!isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                      <span className="bg-slate-800 text-white text-[8px] font-bold px-1 rounded">
                                        OFF
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-slate-800 truncate">
                                    {product.name}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="font-bold text-blue-600 text-xs">
                                      {formatIDR(basePrice)}
                                    </span>
                                    {product.stock_tracking_enabled || product.stockTrackingEnabled ? (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                          stockQty < 10
                                            ? "bg-red-100 text-red-600"
                                            : "bg-green-100 text-green-600"
                                        }`}
                                      >
                                        Stok: {stockQty}
                                      </span>
                                    ) : null}
                                    {variantsCount > 0 && (
                                      <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        <Layers size={10} /> {variantsCount} Varian
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="pl-4 border-l border-slate-100 flex flex-col items-center gap-1">
                                <ToggleSwitch
                                  checked={isActive}
                                  onChange={(val) =>
                                    handleToggleProductAvailability(product.id, val)
                                  }
                                  isLoading={loadingProductToggles.has(product.id)}
                                  data-testid={`toggle-product-${product.id}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "variants" && (
          <>
            {isLoadingVariants ? (
              <div className="text-center py-8 text-slate-400">
                <p>Memuat varian...</p>
              </div>
            ) : (
              <VariantLibrary
                variants={variants}
                products={products}
                onVariantClick={handleEditVariant}
                onCreateNew={handleCreateVariant}
                onToggleVariantOption={handleToggleVariantOptionAvailability}
                loadingVariantToggles={loadingVariantToggles}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
