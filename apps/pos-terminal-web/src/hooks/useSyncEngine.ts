import { useCallback, useEffect, useRef, useState } from "react";
import { runSyncEngine, type SyncEngineResult } from "@pos/offline";

export function useSyncEngine() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncEngineResult | null>(null);
  const lockRef = useRef(false);

  const run = useCallback(async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsSyncing(true);
    try {
      const result = await runSyncEngine();
      setLastResult(result);
      return result;
    } finally {
      lockRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    run().catch(() => undefined);
    const onlineHandler = () => run().catch(() => undefined);
    window.addEventListener("online", onlineHandler);
    const interval = window.setInterval(() => {
      if (navigator.onLine) run().catch(() => undefined);
    }, 30000);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.clearInterval(interval);
    };
  }, [run]);

  return { run, isSyncing, lastResult };
}
