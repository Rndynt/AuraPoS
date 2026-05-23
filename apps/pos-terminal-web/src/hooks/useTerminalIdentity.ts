import { useEffect, useState } from "react";
import { getOrCreateTerminalIdentity, type TerminalIdentity } from "@pos/offline";
import { getActiveTenantId, resolveInitialTenantId } from "@/lib/tenant";

export function useTerminalIdentity() {
  const [terminal, setTerminal] = useState<TerminalIdentity | null>(null);

  useEffect(() => {
    const tenantId = getActiveTenantId() || resolveInitialTenantId() || "default";
    getOrCreateTerminalIdentity(tenantId).then(setTerminal).catch(() => setTerminal(null));
  }, []);

  return terminal;
}
