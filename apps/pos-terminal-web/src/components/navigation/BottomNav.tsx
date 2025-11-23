import { useLocation } from "wouter";
import { LayoutGrid, Square, ShoppingBag, CreditCard, Settings } from "lucide-react";

interface BottomNavProps {
  cartItemsCount?: number;
}

export function BottomNav({ cartItemsCount = 0 }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    {
      path: "/pos",
      icon: LayoutGrid,
      label: "Menu",
      testId: "nav-menu",
    },
    {
      path: "/tables",
      icon: Square,
      label: "Meja",
      testId: "nav-tables",
    },
    {
      path: "/orders",
      icon: CreditCard,
      label: "Bill",
      testId: "nav-bill",
    },
    {
      path: "/",
      icon: Settings,
      label: "Set",
      testId: "nav-settings",
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`flex flex-col items-center gap-0.5 ${
              active ? "text-blue-600" : "text-slate-400"
            }`}
            data-testid={item.testId}
          >
            <Icon size={20} />
            <span className="text-[10px]">{item.label}zzz</span>
          </button>
        );
      })}

      <div className="relative -top-5">
        <button
          onClick={() => setLocation("/pos")}
          className="bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 border-4 border-slate-50 transition-transform"
          data-testid="nav-cart"
        >
          <ShoppingBag size={24} />
          {cartItemsCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-800">
              {cartItemsCount}
            </span>
          )}
        </button>
      </div>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`flex flex-col items-center gap-0.5 ${
              active ? "text-blue-600" : "text-slate-400"
            }`}
            data-testid={item.testId}
          >
            <Icon size={20} />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
