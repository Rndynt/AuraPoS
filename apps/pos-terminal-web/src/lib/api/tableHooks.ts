import { useQuery } from "@tanstack/react-query";
import type { Table } from "@shared/schema";

interface TablesResponse {
  tables: Table[];
  total: number;
}

export function useTables(status?: string, floor?: string) {
  return useQuery({
    queryKey: ["/api/tables", status, floor],
    queryFn: async (): Promise<TablesResponse> => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (floor) params.append("floor", floor);
      
      const response = await fetch(`/api/tables${params.toString() ? `?${params.toString()}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
  });
}

export function useAvailableTables() {
  return useTables("available");
}
