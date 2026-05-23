import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkStatusBadge({ pendingSyncCount = 0 }: { pendingSyncCount?: number }) {
  const { mode } = useNetworkStatus(pendingSyncCount);
  const config = mode === "online"
    ? { label: "Online", icon: Wifi, className: "bg-emerald-100 text-emerald-700" }
    : mode === "syncing"
      ? { label: `Syncing (${pendingSyncCount})`, icon: RefreshCw, className: "bg-amber-100 text-amber-700" }
      : { label: "Offline", icon: WifiOff, className: "bg-slate-200 text-slate-700" };

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      <Icon className={`w-3.5 h-3.5 ${mode === "syncing" ? "animate-spin" : ""}`} />
      <span>{config.label}</span>
    </div>
  );
}
