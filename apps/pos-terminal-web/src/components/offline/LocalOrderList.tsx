import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { offlineDb } from "@pos/offline";
import type { LocalOrder, SyncStatus } from "@pos/offline";

export function LocalOrderList() {
  const [filter, setFilter] = useState<"all" | SyncStatus>("all");
  const [query, setQuery] = useState("");

  const { data = [] } = useQuery<LocalOrder[]>({
    queryKey: ["local-orders-list"],
    queryFn: async () => offlineDb.local_orders.toArray(),
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => {
    return data.filter((o: LocalOrder) => {
      if (filter !== "all" && o.syncStatus !== filter) return false;
      if (query && !`${o.localOrderNumber} ${o.serverOrderNumber ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [data, filter, query]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="Cari no order" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | SyncStatus)}
        >
          <option value="all">All</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="conflict">Conflict</option><option value="synced">Synced</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? <p className="text-sm text-slate-500">Belum ada local order.</p> : filtered.map((o) => (
          <div key={o.localId} className="border rounded-lg p-3 text-sm">
            <div className="font-semibold">{o.localOrderNumber}</div>
            <div className="text-slate-500">Status: {o.syncStatus}</div>
            <div className="text-slate-500">Payment: {o.paymentStatus}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
