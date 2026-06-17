import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/TenantContext";
import { queryClient } from "@/lib/queryClient";
import {
  resolveInitialOutletId,
  setActiveOutletId,
  getActiveOutletId,
  buildApiHeaders,
} from "@/lib/outlet";

export type Outlet = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OutletContextValue = {
  outlets: Outlet[];
  activeOutlet: Outlet | null;
  activeOutletId: string | null;
  setActiveOutlet: (outlet: Outlet) => void;
  isLoading: boolean;
  refetch: () => void;
};

const OutletContext = createContext<OutletContextValue | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const { tenantId } = useTenant();
  const [activeOutletId, setActiveOutletIdState] = useState<string | null>(
    () => resolveInitialOutletId(),
  );

  // Use React Query — same key as useOutlets() so they share cache
  const { data, isLoading, refetch } = useQuery<{ outlets: Outlet[] }>({
    queryKey: ["/api/outlets", tenantId],
    queryFn: async () => {
      const res = await fetch("/api/outlets", {
        headers: buildApiHeaders(),
        credentials: "include",
      });
      if (!res.ok) return { outlets: [] };
      return res.json();
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const outlets = data?.outlets ?? [];

  // Auto-select outlet when list loads or changes
  useEffect(() => {
    if (isLoading || outlets.length === 0) return;
    const stored = getActiveOutletId();
    const valid = outlets.find((o) => o.id === stored);
    if (valid) {
      setActiveOutletIdState(valid.id);
      setActiveOutletId(valid.id);
    } else if (!activeOutletId || !outlets.find((o) => o.id === activeOutletId)) {
      const def = outlets.find((o) => o.isDefault) ?? outlets[0];
      if (def) {
        setActiveOutletIdState(def.id);
        setActiveOutletId(def.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlets, isLoading]);

  const setActiveOutlet = useCallback((outlet: Outlet) => {
    setActiveOutletIdState(outlet.id);
    setActiveOutletId(outlet.id);
    // Invalidate outlet-scoped data so pages re-fetch with new x-outlet-id header
    queryClient.invalidateQueries({ predicate: (q) => {
      const key = q.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/") && key !== "/api/outlets";
    }});
  }, []);

  const activeOutlet = outlets.find((o) => o.id === activeOutletId) ?? null;

  return (
    <OutletContext.Provider
      value={{
        outlets,
        activeOutlet,
        activeOutletId,
        setActiveOutlet,
        isLoading,
        refetch: () => refetch(),
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet(): OutletContextValue {
  const ctx = useContext(OutletContext);
  if (!ctx) throw new Error("useOutlet must be used inside OutletProvider");
  return ctx;
}
