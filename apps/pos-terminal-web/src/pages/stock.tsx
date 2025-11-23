import { useLocation } from "wouter";
import { ChevronLeft, Package, AlertCircle, History } from "lucide-react";

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Classic Beef Burger",
    price: 45000,
    category: "burger",
    stock: 15,
    stockTracking: true,
    sku: "BG-001",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60",
  },
  {
    id: 2,
    name: "Cappuccino Art",
    price: 25000,
    category: "coffee",
    stock: 50,
    stockTracking: false,
    sku: "CP-002",
    image:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60",
  },
  {
    id: 3,
    name: "French Fries",
    price: 18000,
    category: "snack",
    stock: 5,
    stockTracking: true,
    sku: "SN-003",
    image:
      "https://images.unsplash.com/photo-1541592103048-4e22ecc25e67?auto=format&fit=crop&w=500&q=60",
  },
  {
    id: 4,
    name: "Supreme Pizza",
    price: 85000,
    category: "pizza",
    stock: 8,
    stockTracking: true,
    sku: "PZ-004",
    image:
      "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=60",
  },
];

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export default function StockPage() {
  const [, setLocation] = useLocation();

  const totalItems = MOCK_PRODUCTS.length;
  const criticalStockCount = MOCK_PRODUCTS.filter((p) => p.stock < 10).length;

  const handleBack = () => {
    setLocation("/");
  };

  const handleHistory = () => {
    console.log("Navigate to stock history");
  };

  const handleAdjustStock = (productId: number) => {
    console.log("Adjust stock for product:", productId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800" data-testid="text-page-title">
              Stok & Inventaris
            </h1>
            <p className="text-xs text-slate-500">Kelola ketersediaan produk</p>
          </div>
        </div>
        <button
          onClick={handleHistory}
          className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100"
          data-testid="button-history"
        >
          <History size={16} /> Riwayat
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
              <Package size={14} /> Total Item
            </div>
            <div className="text-2xl font-black text-slate-800" data-testid="text-total-items">
              {totalItems}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-1">
              <AlertCircle size={14} /> Stok Kritis
            </div>
            <div className="text-2xl font-black text-red-600" data-testid="text-critical-stock">
              {criticalStockCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4 text-center">Sisa Stok</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_PRODUCTS.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50 transition-colors"
                  data-testid={`row-product-${product.id}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          data-testid={`img-product-${product.id}`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </p>
                        <p className="text-[10px] text-slate-400" data-testid={`text-product-sku-${product.id}`}>
                          SKU: {product.sku}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded font-bold text-xs ${
                        product.stock < 10
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                      data-testid={`badge-stock-${product.id}`}
                    >
                      {product.stock} Unit
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleAdjustStock(product.id)}
                      className="text-blue-600 font-bold text-xs hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                      data-testid={`button-adjust-${product.id}`}
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
