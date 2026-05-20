/**
 * Modern POS Header Component
 */

import { Search } from "lucide-react";

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
  return (
    <header className="px-4 md:px-8 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="relative">
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
