import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTenant } from "@/context/TenantContext";

interface POSHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchDisabled?: boolean;
  sidebarContent: React.ReactNode;
}

export function POSHeader({ 
  searchQuery, 
  onSearchChange, 
  searchDisabled,
  sidebarContent 
}: POSHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tenantId } = useTenant();

  return (
    <div className="sticky top-0 z-20 border-b bg-background shadow-sm overflow-x-hidden w-full">
      <div className="p-3 md:p-4 w-full max-w-full">
        <div className="flex items-center gap-3 w-full max-w-full">
          {/* Mobile Hamburger Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden flex-shrink-0"
                data-testid="button-menu-mobile"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-6">
              {sidebarContent}
            </SheetContent>
          </Sheet>

          {/* Search Bar - Full width on mobile, max-width on larger screens */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products..."
              className="pl-10 h-9 md:h-10 text-sm w-full"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-search-products"
              disabled={searchDisabled}
            />
          </div>

          {/* Tenant Info - Hidden on very small screens, shown on sm+ */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <User className="w-4 h-4" />
            <span data-testid="text-tenant" className="whitespace-nowrap">{tenantId}</span>
          </div>
        </div>
      </div>

      {/* Tenant Info for Mobile - Below search bar */}
      <div className="sm:hidden px-3 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <User className="w-3.5 h-3.5" />
        <span data-testid="text-tenant-mobile">{tenantId}</span>
      </div>
    </div>
  );
}
