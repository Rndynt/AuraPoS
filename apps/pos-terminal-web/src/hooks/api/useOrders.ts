import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Order, OrderItem, OrderPayment } from "@/../../packages/domain/orders/types";
import { getActiveTenantId } from "@/lib/tenant";

async function fetchWithTenantHeader(url: string) {
  const res = await fetch(url, {
    headers: {
      "x-tenant-id": getActiveTenantId(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

async function postWithTenantHeader(url: string, data: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": getActiveTenantId(),
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: () => fetchWithTenantHeader("/api/orders"),
  });
}

export function useOrderById(orderId: string) {
  return useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    queryFn: () => fetchWithTenantHeader(`/api/orders/${orderId}`),
    enabled: !!orderId,
  });
}

type CreateOrderInput = {
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  discount_amount?: number;
  total_amount: number;
  customer_name?: string;
  table_number?: string;
  notes?: string;
  initial_payment?: {
    amount: number;
    payment_method: "cash" | "card" | "ewallet" | "other";
  };
};

export function useCreateOrder() {
  return useMutation<Order, Error, CreateOrderInput>({
    mutationFn: (data) => postWithTenantHeader("/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

type RecordPaymentInput = {
  amount: number;
  payment_method: "cash" | "card" | "ewallet" | "other";
  notes?: string;
};

export function useRecordPayment(orderId: string) {
  return useMutation<OrderPayment, Error, RecordPaymentInput>({
    mutationFn: (data) => postWithTenantHeader(`/api/orders/${orderId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
    },
  });
}

export function useCreateKitchenTicket(orderId: string) {
  return useMutation<any, Error, void>({
    mutationFn: () => postWithTenantHeader(`/api/orders/${orderId}/kitchen-ticket`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
    },
  });
}
