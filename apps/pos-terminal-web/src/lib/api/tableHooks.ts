import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/TenantContext";
import type { Table } from "@shared/schema";

interface TablesResponse {
  tables: Table[];
  total: number;
}

export function useTables(status?: string, floor?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["/api/tables", tenantId, status, floor],
    queryFn: async (): Promise<TablesResponse> => {
      const params = new URLSearchParams();
      if (tenantId) params.append("tenant_id", tenantId);
      if (status) params.append("status", status);
      if (floor) params.append("floor", floor);
      
      const response = await fetch(`/api/tables${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function useAvailableTables() {
  return useTables("available");
}
