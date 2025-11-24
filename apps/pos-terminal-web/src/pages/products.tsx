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

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"products" | "variants">("products");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [viewState, setViewState] = useState<"list" | "form_product" | "form_variant">("list");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

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

  if (viewState === "form_product") {
    return (
      <ProductForm
        product={editingProduct}
        onSave={handleSaveProduct}
        onCancel={handleCancelForm}
        isLoading={updateProduct.isPending || createProduct.isPending}
        onNavigateToVariants={handleNavigateToVariants}
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
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700"
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                          return (
                            <div
                              key={product.id}
                              onClick={() => handleEditProduct(product)}
                              className="p-3 flex items-center gap-4 hover:bg-blue-50 cursor-pointer transition-colors group"
                              data-testid={`product-card-${product.id}`}
                            >
                              <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    className="w-full h-full object-cover"
                                    alt={product.name}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Plus size={20} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-bold text-slate-800 truncate">
                                    {product.name}
                                  </h4>
                                  <span className="font-bold text-blue-600 text-sm">
                                    {formatIDR(basePrice)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
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
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-500">
                                      Tanpa Stok
                                    </span>
                                  )}
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
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
