import { useEffect, useState } from "react";
import { WifiOff, Clock } from "lucide-react";
import { getCatalogCachedAt, isCatalogStale } from "@pos/offline";
import { getActiveTenantId } from "@/lib/tenant";

interface OfflineCacheBannerProps {
  show: boolean;
}

export function OfflineCacheBanner({ show }: OfflineCacheBannerProps) {
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!show) return;
    getCatalogCachedAt(getActiveTenantId())
      .then((ts) => {
        setCachedAt(ts);
        setIsStale(isCatalogStale(ts, 6 * 60 * 60 * 1000));
      })
      .catch(() => undefined);
  }, [show]);

  if (!show) return null;

  const timeLabel = cachedAt
    ? new Date(cachedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b ${
        isStale
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-blue-50 text-blue-800 border-blue-200"
      }`}
      data-testid="offline-cache-banner"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        {isStale
          ? "Mode offline — data katalog mungkin sudah usang."
          : "Mode offline — menampilkan data dari cache lokal."}
      </span>
      {timeLabel && (
        <span className="flex items-center gap-1 opacity-70 ml-auto">
          <Clock className="w-3 h-3" />
          Cache: {timeLabel}
        </span>
      )}
    </div>
  );
}
