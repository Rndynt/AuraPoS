import { Home, LayoutDashboard, ShoppingCart, Receipt, Settings, LogOut, Table, Truck, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/context/TenantContext";
import { useLocation } from "wouter";

type SidebarItem = {
  icon: typeof Home;
  label: string;
  route?: string;
  disabled?: boolean;
};

export function Sidebar() {
  const { hasModule, isLoading } = useTenant();
  const [location, setLocation] = useLocation();

  const baseSidebarItems: SidebarItem[] = [
    { icon: Home, label: "Home", route: "/pos" },
    { icon: LayoutDashboard, label: "Dashboard", disabled: true },
    { icon: ShoppingCart, label: "Orders", route: "/orders" },
    { icon: Receipt, label: "Bills", disabled: true },
  ];

  const conditionalItems: SidebarItem[] = [];
  if (!isLoading && hasModule('enable_table_management')) {
    conditionalItems.push({ icon: Table, label: "Tables", route: "/tables" });
  }
  if (!isLoading && hasModule('enable_delivery')) {
    conditionalItems.push({ icon: Truck, label: "Delivery", disabled: true });
  }
  if (!isLoading && hasModule('enable_loyalty')) {
    conditionalItems.push({ icon: Gift, label: "Loyalty", disabled: true });
  }

  const sidebarItems = [
    ...baseSidebarItems,
    ...conditionalItems,
    { icon: Settings, label: "Settings", disabled: true },
  ];

  const handleNavigation = (item: SidebarItem) => {
    if (item.disabled) {
      return;
    }
    if (item.route) {
      setLocation(item.route);
    }
  };

  return (
    <div className="hidden md:flex w-20 bg-card border-r border-card-border flex-col items-center py-6 gap-4">
      {sidebarItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = !item.disabled && item.route === location;
        const button = (
          <Button
            key={index}
            size="icon"
            variant={isActive ? "default" : "ghost"}
            data-testid={`button-nav-${item.label.toLowerCase()}`}
            onClick={() => handleNavigation(item)}
            disabled={item.disabled}
          >
            <Icon className="w-6 h-6" />
          </Button>
        );

        if (item.disabled) {
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                {button}
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label} - Coming Soon</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return button;
      })}
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-nav-logout"
            disabled
          >
            <LogOut className="w-6 h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Logout - Coming Soon</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const { hasModule, isLoading } = useTenant();
  const [location, setLocation] = useLocation();

  const baseSidebarItems: SidebarItem[] = [
    { icon: Home, label: "Home", route: "/pos" },
    { icon: LayoutDashboard, label: "Dashboard", disabled: true },
    { icon: ShoppingCart, label: "Orders", route: "/orders" },
    { icon: Receipt, label: "Bills", disabled: true },
  ];

  const conditionalItems: SidebarItem[] = [];
  if (!isLoading && hasModule('enable_table_management')) {
    conditionalItems.push({ icon: Table, label: "Tables", route: "/tables" });
  }
  if (!isLoading && hasModule('enable_delivery')) {
    conditionalItems.push({ icon: Truck, label: "Delivery", disabled: true });
  }
  if (!isLoading && hasModule('enable_loyalty')) {
    conditionalItems.push({ icon: Gift, label: "Loyalty", disabled: true });
  }

  const sidebarItems = [
    ...baseSidebarItems,
    ...conditionalItems,
    { icon: Settings, label: "Settings", disabled: true },
  ];

  const handleNavigation = (item: SidebarItem) => {
    if (item.disabled) {
      return;
    }
    if (item.route) {
      setLocation(item.route);
      onItemClick?.();
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-8">
      {sidebarItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = !item.disabled && item.route === location;
        return (
          <Button
            key={index}
            variant={isActive ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12"
            data-testid={`button-nav-mobile-${item.label.toLowerCase()}`}
            onClick={() => handleNavigation(item)}
            disabled={item.disabled}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
            {item.disabled && <span className="ml-auto text-xs text-muted-foreground">Soon</span>}
          </Button>
        );
      })}
      <div className="flex-1 min-h-8" />
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
        data-testid="button-nav-mobile-logout"
        disabled
        onClick={() => {
          onItemClick?.();
        }}
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
        <span className="ml-auto text-xs text-muted-foreground">Soon</span>
      </Button>
    </div>
  );
}
