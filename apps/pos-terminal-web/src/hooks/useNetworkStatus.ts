import { useEffect, useMemo, useState } from "react";

export type NetworkMode = "online" | "offline" | "syncing";

export function useNetworkStatus(pendingSyncCount = 0) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState<string | null>(navigator.onLine ? new Date().toISOString() : null);
  const [lastOfflineAt, setLastOfflineAt] = useState<string | null>(navigator.onLine ? null : new Date().toISOString());

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date().toISOString());
    };
    const onOffline = () => {
      setIsOnline(false);
      setLastOfflineAt(new Date().toISOString());
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const mode: NetworkMode = useMemo(() => {
    if (!isOnline) return "offline";
    if (pendingSyncCount > 0) return "syncing";
    return "online";
  }, [isOnline, pendingSyncCount]);

  return { isOnline, mode, pendingSyncCount, lastOnlineAt, lastOfflineAt };
}
