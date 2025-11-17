import { Home, LayoutDashboard, ShoppingCart, Receipt, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarItem = {
  icon: typeof Home;
  label: string;
  active?: boolean;
};

const sidebarItems: SidebarItem[] = [
  { icon: Home, label: "Home", active: true },
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: ShoppingCart, label: "Orders" },
  { icon: Receipt, label: "Bills" },
  { icon: Settings, label: "Settings" },
];

export function Sidebar() {
  return (
    <div className="hidden md:flex w-20 bg-card border-r border-card-border flex-col items-center py-6 gap-4">
      {sidebarItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Button
            key={index}
            size="icon"
            variant={item.active ? "default" : "ghost"}
            className="w-14 h-14"
            data-testid={`button-nav-${item.label.toLowerCase()}`}
            onClick={() => console.log(`Navigate to ${item.label}`)}
          >
            <Icon className="w-6 h-6" />
          </Button>
        );
      })}
      <div className="flex-1" />
      <Button
        size="icon"
        variant="ghost"
        className="w-14 h-14"
        data-testid="button-nav-logout"
        onClick={() => console.log("Logout clicked")}
      >
        <LogOut className="w-6 h-6" />
      </Button>
    </div>
  );
}

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  return (
    <div className="flex flex-col gap-2 mt-8">
      {sidebarItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Button
            key={index}
            variant={item.active ? "default" : "ghost"}
            className="w-full justify-start gap-3 h-12"
            data-testid={`button-nav-mobile-${item.label.toLowerCase()}`}
            onClick={() => {
              console.log(`Navigate to ${item.label}`);
              onItemClick?.();
            }}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Button>
        );
      })}
      <div className="flex-1 min-h-8" />
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
        data-testid="button-nav-mobile-logout"
        onClick={() => {
          console.log("Logout clicked");
          onItemClick?.();
        }}
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </Button>
    </div>
  );
}
