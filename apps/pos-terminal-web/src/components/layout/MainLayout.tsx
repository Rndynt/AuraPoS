import { Sidebar } from "@/components/pos/Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content Area - pages control their own mobile UI */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
