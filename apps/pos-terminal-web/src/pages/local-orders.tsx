import { LocalOrderList } from "@/components/offline/LocalOrderList";

export default function LocalOrdersPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-4 border-b"><h1 className="font-bold">Local Orders</h1><p className="text-xs text-slate-500">Offline transactions and sync states</p></div>
      <LocalOrderList />
    </div>
  );
}
