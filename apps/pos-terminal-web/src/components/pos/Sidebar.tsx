import { ShoppingBag, LayoutGrid, UtensilsCrossed, ChefHat, Grip, LogOut, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useTenant } from "@/context/TenantContext";

// ─── Desktop icon-only sidebar ────────────────────────────────────────────────
function SidebarItem({
  icon: Icon, label, isActive = false, onClick, testId,
}: {
  icon: typeof LayoutGrid; label: string;
  isActive?: boolean; onClick?: () => void; testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      title={label}
      className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${
        isActive
          ? "bg-blue-600 text-white shadow-md shadow-blue-400/30"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
        {label}
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
      </span>
    </button>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { hasModule, isLoading } = useTenant();

  const showTables  = !isLoading && hasModule("enable_table_management");
  const showKitchen = !isLoading && hasModule("enable_kitchen_ticket");

  const nav = (path: string) => setLocation(path);
  const isHub = ["/hub", "/dashboard", "/products", "/stock", "/reports", "/employees", "/store-profile", "/orders"].some(p => location === p || location.startsWith(p));

  return (
    <aside className="hidden md:flex flex-col items-center w-[68px] h-screen bg-white border-r border-slate-100 py-5 flex-shrink-0 z-30 gap-2">

      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-300/40 mb-3 flex-shrink-0">
        <ShoppingBag size={18} className="text-white" strokeWidth={2.5} />
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1.5 flex-1">
        <SidebarItem
          icon={LayoutGrid}
          label="Kasir / POS"
          isActive={location === "/pos" || location === "/"}
          onClick={() => nav("/pos")}
          testId="button-nav-pos"
        />

        {showTables && (
          <SidebarItem
            icon={UtensilsCrossed}
            label="Meja"
            isActive={location.startsWith("/tables")}
            onClick={() => nav("/tables")}
            testId="button-nav-tables"
          />
        )}

        {showKitchen && (
          <SidebarItem
            icon={ChefHat}
            label="Dapur / Kitchen"
            isActive={location.startsWith("/kitchen")}
            onClick={() => nav("/kitchen")}
            testId="button-nav-kitchen"
          />
        )}

        <SidebarItem
          icon={AlertTriangle}
          label="Konflik Sync"
          isActive={location.startsWith("/sync-conflicts")}
          onClick={() => nav("/sync-conflicts")}
          testId="button-nav-sync-conflicts"
        />

        <SidebarItem
          icon={Grip}
          label="Hub / Manajemen"
          isActive={isHub}
          onClick={() => nav("/hub")}
          testId="button-nav-hub"
        />
      </nav>

      {/* Logout */}
      <button
        className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150 flex-shrink-0"
        data-testid="button-nav-logout"
        title="Keluar"
      >
        <LogOut size={18} strokeWidth={1.8} />
      </button>
    </aside>
  );
}

// ─── SidebarContent (used in mobile sheet/drawer if needed) ───────────────────
export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const [location, setLocation] = useLocation();
  const { hasModule, isLoading } = useTenant();

  const showTables  = !isLoading && hasModule("enable_table_management");
  const showKitchen = !isLoading && hasModule("enable_kitchen_ticket");

  const nav = (path: string) => { setLocation(path); onItemClick?.(); };
  const isHub = ["/hub", "/dashboard", "/products", "/stock", "/reports", "/employees", "/store-profile", "/orders"].some(p => location === p || location.startsWith(p));

  const items = [
    { path: "/pos",             icon: LayoutGrid,     label: "Kasir / POS",      active: location === "/pos" || location === "/",   show: true         },
    { path: "/tables",          icon: UtensilsCrossed,label: "Meja",             active: location.startsWith("/tables"),            show: showTables   },
    { path: "/kitchen",         icon: ChefHat,        label: "Dapur / Kitchen",  active: location.startsWith("/kitchen"),           show: showKitchen  },
    { path: "/sync-conflicts",  icon: AlertTriangle,  label: "Konflik Sync",     active: location.startsWith("/sync-conflicts"),    show: true         },
    { path: "/hub",             icon: Grip,           label: "Hub / Manajemen",  active: isHub,                                     show: true         },
  ];

  return (
    <div className="flex flex-col gap-1 py-4">
      {items.filter(i => i.show).map(({ path, icon: Icon, label, active }) => (
        <button
          key={path}
          onClick={() => nav(path)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
            active ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
          {label}
        </button>
      ))}

      <div className="mt-2 pt-2 border-t border-slate-100">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
          <LogOut size={18} strokeWidth={1.8} />
          Keluar
        </button>
      </div>
    </div>
  );
}
