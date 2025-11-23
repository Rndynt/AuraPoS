import { useLocation } from "wouter";
import { 
  BarChart3, 
  Box, 
  Package, 
  Users2, 
  FileText, 
  Store, 
  Edit2, 
  LogOut 
} from "lucide-react";
import { UnifiedBottomNav } from "@/components/navigation/UnifiedBottomNav";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const MENU_ITEMS = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: BarChart3,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'products',
      title: 'Produk',
      icon: Box,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      id: 'stock',
      title: 'Stok',
      icon: Package,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'employees',
      title: 'Karyawan',
      icon: Users2,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'reports',
      title: 'Laporan',
      icon: FileText,
      color: 'bg-pink-100 text-pink-600',
    },
    {
      id: 'store',
      title: 'Profil Toko',
      icon: Store,
      color: 'bg-slate-100 text-slate-600',
    },
  ];

  const handleNavigate = (menuId: string) => {
    const routes: Record<string, string> = {
      dashboard: "/dashboard",
      products: "/products",
      stock: "/stock",
      employees: "/employees",
      reports: "/reports",
      store: "/store-profile",
    };

    const route = routes[menuId];

    if (route) {
      setLocation(route);
      return;
    }

    toast({
      title: "Fitur dalam pengembangan",
      description: `Halaman ${MENU_ITEMS.find((m) => m.id === menuId)?.title} sedang dalam pengembangan`,
    });
  };

  const handleLogout = () => {
    toast({
      title: "Logout",
      description: "Fungsi logout akan segera ditambahkan",
    });
  };

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto pb-20">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-slate-800" data-testid="text-page-title">
          Manajemen
        </h1>
        <p className="text-xs text-slate-500" data-testid="text-page-subtitle">
          Pengaturan toko & laporan
        </p>
      </header>

      {/* Profile Card */}
      <div className="p-4">
        <div className="bg-slate-800 text-white p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-slate-300" data-testid="card-profile">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold" data-testid="text-avatar">
            AP
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg" data-testid="text-store-name">
              Aura Pos Resto
            </h3>
            <p className="text-xs text-slate-300" data-testid="text-branch-info">
              Cabang Pusat • Owner
            </p>
          </div>
          <button 
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
            data-testid="button-edit-profile"
            onClick={() => toast({ title: "Edit Profile", description: "Fitur edit profile akan segera ditambahkan" })}
          >
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-start gap-3"
            data-testid={`button-menu-${item.id}`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}
            >
              <item.icon size={20} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-slate-700" data-testid={`text-menu-title-${item.id}`}>
                {item.title}
              </h4>
              <p className="text-[10px] text-slate-400" data-testid={`text-menu-subtitle-${item.id}`}>
                Kelola {item.title.toLowerCase()}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4">
        <button 
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors border border-red-200"
          data-testid="button-logout"
        >
          <LogOut size={18} />
          Keluar Aplikasi
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-4" data-testid="text-version">
          AuraPOS v1.0.2 • Build 20231122
        </p>
      </div>

      {/* Mobile Navigation */}
      <UnifiedBottomNav cartCount={0} />
    </div>
  );
}
