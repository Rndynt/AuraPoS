import { useLocation } from "wouter";
import { LayoutGrid, UtensilsCrossed, ShoppingBag, ChefHat, Grip, Receipt, Monitor } from "lucide-react";
import { useTenant } from "@/context/TenantContext";

interface UnifiedBottomNavProps {
  cartCount: number;
  onCartClick?: () => void;
}

export function UnifiedBottomNav({ cartCount, onCartClick }: UnifiedBottomNavProps) {
  const [location, setLocation] = useLocation();
  const { can, isLoading, planTier } = useTenant();
  const planIncludesRestaurantOps = planTier === "growth" || planTier === "pro";
  const isKitchenEnabled = !isLoading && (can("restaurant_kitchen_ops") || planIncludesRestaurantOps);
  const isTablesEnabled = !isLoading && (can("restaurant_table_service") || planIncludesRestaurantOps);

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  const navItems = [
    { path: "/pos", icon: LayoutGrid, label: "Kasir" },
    ...(isTablesEnabled ? [{ path: "/tables", icon: UtensilsCrossed, label: "Meja" }] : []),
    { path: "__cart__", icon: ShoppingBag, label: "Keranjang" },
    { path: "/orders", icon: Receipt, label: "Pesanan" },
    ...(isKitchenEnabled ? [{ path: "/kitchen", icon: ChefHat, label: "Dapur" }] : []),
    { path: "/display", icon: Monitor, label: "CFD" },
    { path: "/hub", icon: Grip, label: "Hub" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-black/10 px-2 py-2 mx-4 overflow-x-auto max-w-[calc(100vw-24px)]">
        {navItems.map((item) => {
          if (item.path === "__cart__") {
            return (
              <button
                key="cart"
                onClick={onCartClick}
                className="relative mx-1 flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/40 active:scale-90 transition-transform"
                aria-label="Keranjang"
              >
                <ShoppingBag size={22} className="text-white" strokeWidth={2} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-black leading-none tabular-nums">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  </span>
                )}
              </button>
            );
          }

          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className="relative flex-shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all duration-200 active:scale-90"
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-blue-50 transition-all" />
              )}
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                className={`relative transition-colors duration-200 ${active ? "text-blue-600" : "text-slate-400"}`}
              />
              <span
                className={`relative text-[10px] font-semibold leading-none transition-colors duration-200 ${
                  active ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
