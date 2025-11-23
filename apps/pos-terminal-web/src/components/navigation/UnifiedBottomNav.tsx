import { useLocation } from "wouter";
import { LayoutGrid, Square, ShoppingBag, CreditCard, Settings } from "lucide-react";

interface UnifiedBottomNavProps {
  cartCount: number;
  onCartClick?: () => void;
}

export function UnifiedBottomNav({ cartCount, onCartClick }: UnifiedBottomNavProps) {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    setLocation(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]">
      {/* Menu Button */}
      <button
        onClick={() => handleNavClick("/pos")}
        className={`flex flex-col items-center gap-0.5 ${
          isActive("/pos") ? "text-blue-600" : "text-slate-400"
        }`}
        data-testid="nav-menu"
      >
        <LayoutGrid size={20} />
        <span className="text-[10px]">Menu</span>
      </button>

      {/* Tables Button */}
      <button
        onClick={() => handleNavClick("/tables")}
        className={`flex flex-col items-center gap-0.5 ${
          isActive("/tables") ? "text-blue-600" : "text-slate-400"
        }`}
        data-testid="nav-tables"
      >
        <Square size={20} />
        <span className="text-[10px]">Meja</span>
      </button>

      {/* Cart Button - Floating in Center */}
      <button
        onClick={onCartClick}
        className="relative bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 border-4 border-white transition-transform -mt-8 z-50"
        data-testid="nav-cart"
      >
        <ShoppingBag size={24} />
        {/* Badge Notification */}
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white z-10 shadow-sm pointer-events-none">
            {cartCount}
          </span>
        )}
      </button>

      {/* Bills Button */}
      <button
        onClick={() => handleNavClick("/orders")}
        className={`flex flex-col items-center gap-0.5 ${
          isActive("/orders") ? "text-blue-600" : "text-slate-400"
        }`}
        data-testid="nav-bills"
      >
        <CreditCard size={20} />
        <span className="text-[10px]">Bill</span>
      </button>

      {/* Settings Button */}
      <button
        onClick={() => handleNavClick("/")}
        className={`flex flex-col items-center gap-0.5 ${
          isActive("/") && location === "/" ? "text-blue-600" : "text-slate-400"
        }`}
        data-testid="nav-settings"
      >
        <Settings size={20} />
        <span className="text-[10px]">Set</span>
      </button>
    </div>
  );
}
