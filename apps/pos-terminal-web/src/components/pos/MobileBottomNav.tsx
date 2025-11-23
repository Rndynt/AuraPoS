import { LayoutGrid, Square, ShoppingBag, CreditCard, Settings, Store, Grip } from "lucide-react";

interface MobileBottomNavProps {
  onCartClick: () => void;
  onTablesClick: () => void;
  onSettingsClick: () => void;
  cartItemCount: number;
  activeTab: 'pos' | 'tables' | 'bills' | 'settings';
}

export function MobileBottomNav({
  onCartClick,
  onTablesClick,
  onSettingsClick,
  cartItemCount,
  activeTab,
}: MobileBottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-40 pb-safe h-[60px]">
      {/* PoS Button */}
      <button
        className={`flex flex-col items-center gap-0.5 ${
          activeTab === 'pos' ? 'text-blue-600' : 'text-slate-400'
        }`}
        data-testid="button-nav-menu"
      >
        <Store size={20} />
        <span className="text-[10px]">PoS</span>
      </button>

      {/* Tables Button */}
      <button
        onClick={onTablesClick}
        className={`flex flex-col items-center gap-0.5 ${
          activeTab === 'tables' ? 'text-blue-600' : 'text-slate-400'
        }`}
        data-testid="button-nav-tables"
      >
        <Square size={20} />
        <span className="text-[10px]">Meja</span>
      </button>

      {/* Cart Button - Centered & Floating */}
      <div className="relative -top-5">
        <button
          onClick={onCartClick}
          className="bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 border-4 border-slate-50 transition-transform"
          data-testid="button-nav-cart"
        >
          <ShoppingBag size={24} />
          {/* Badge Notification */}
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-800">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Bills Button */}
      <button
        className={`flex flex-col items-center gap-0.5 ${
          activeTab === 'bills' ? 'text-blue-600' : 'text-slate-400'
        }`}
        data-testid="button-nav-bills"
      >
        <CreditCard size={20} />
        <span className="text-[10px]">Bill</span>
      </button>

      {/* Menu More Button */}
      <button
        onClick={onSettingsClick}
        className={`flex flex-col items-center gap-0.5 ${
          activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'
        }`}
        data-testid="button-nav-settings"
      >
        <Grip size={20} />
        <span className="text-[10px]">More</span>
      </button>
    </div>
  );
}
