import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/TenantContext";
import type { Table } from "@shared/schema";

interface TablesResponse {
  tables: Table[];
  total: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  status: string;
  subtotal: string;
  tax_amount: string;
  service_charge: string;
  total: string;
  payment_status: string;
  order_items?: OrderItem[];
}

interface OpenOrdersResponse {
  orders: Order[];
}

export function useTables(status?: string, floor?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["/api/tables", tenantId, status, floor],
    queryFn: async (): Promise<TablesResponse> => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (floor) params.append("floor", floor);
      
      const response = await fetch(
        `/api/tables${params.toString() ? `?${params.toString()}` : ""}`,
        {
          headers: {
            "x-tenant-id": tenantId,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch tables");
      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function useOpenOrders() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["/api/orders/open", tenantId],
    queryFn: async (): Promise<OpenOrdersResponse> => {
      const response = await fetch(
        `/api/orders/open`,
        {
          headers: {
            "x-tenant-id": tenantId,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch open orders");
      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function useAvailableTables() {
  return useTables("available");
}
