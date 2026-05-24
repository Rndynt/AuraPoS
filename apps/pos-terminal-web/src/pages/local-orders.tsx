import { useLocation } from "wouter";
import { PageHeader } from "@/components/design";
import { LocalOrderList } from "@/components/offline/LocalOrderList";

export default function LocalOrdersPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="Order Offline"
        subtitle="Transaksi lokal & status sinkronisasi"
        onBack={() => setLocation("/hub")}
      />
      <div className="flex-1 overflow-auto">
        <LocalOrderList />
      </div>
    </div>
  );
}
