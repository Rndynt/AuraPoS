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
    <div className="w-20 bg-card border-r border-card-border flex flex-col items-center py-6 gap-4">
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
