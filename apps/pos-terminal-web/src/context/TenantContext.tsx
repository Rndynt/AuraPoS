import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { resolveInitialTenantId, setActiveTenantId } from "@/lib/tenant";

type TenantContextValue = {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, updateTenantId] = useState(() => resolveInitialTenantId());

  const setTenantId = useCallback((nextTenantId: string) => {
    updateTenantId(nextTenantId);
    setActiveTenantId(nextTenantId);
  }, []);

  const value = useMemo(() => ({ tenantId, setTenantId }), [tenantId, setTenantId]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }

  return context;
}
