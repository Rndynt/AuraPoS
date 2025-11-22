/**
 * Modern POS Header Component
 * Based on base-design.md header styling
 */

import { Search, MapPin } from "lucide-react";
import { useTenant } from "@/context/TenantContext";

type ModernPOSHeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchDisabled?: boolean;
};

export function ModernPOSHeader({
  searchQuery,
  onSearchChange,
  searchDisabled = false,
}: ModernPOSHeaderProps) {
  const { tenantId } = useTenant();

  return (
    <header className="px-4 md:px-8 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">
          Resto POS Pro
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <MapPin size={12} /> Cabang Pusat
          </span>
          <span>•</span>
          <span className="text-green-600 font-bold">Online</span>
        </div>
      </div>
      <div className="w-1/3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Cari menu..."
          className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={searchDisabled}
          data-testid="input-search-products"
        />
      </div>
    </header>
  );
}
