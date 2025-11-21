/**
 * React Query API Hooks
 * Centralized hooks for all backend API interactions
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@pos/domain/catalog/types";
import type { Order, OrderItem, OrderPayment, KitchenTicket, SelectedOption, OrderType, TenantOrderType } from "@pos/domain/orders/types";
import type { TenantFeature, FeatureCheck } from "@pos/domain/tenants/types";
import { getActiveTenantId } from "@/lib/tenant";

// Helper to add tenant header to fetch requests
async function fetchWithTenantHeader(url: string) {
  const tenantId = getActiveTenantId();
  const res = await fetch(url, {
    headers: {
      "x-tenant-id": tenantId,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  const response = await res.json();
  return response.data;
}

// Helper to add tenant header to mutations
async function mutateWithTenantHeader(method: string, url: string, data?: unknown) {
  const tenantId = getActiveTenantId();
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  const response = await res.json();
  return response.data;
}

// ============================================================================
// CATALOG HOOKS
// ============================================================================

/**
 * Fetch products with optional filters
 */
export type UseProductsFilters = {
  category?: string;
  isActive?: boolean;
};

export function useProducts(filters?: UseProductsFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.category) {
    queryParams.append("category", filters.category);
  }
  if (filters?.isActive !== undefined) {
    queryParams.append("isActive", String(filters.isActive));
  }

  const url = `/api/catalog/products${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return useQuery<{ products: Product[]; total: number }>({
    queryKey: ["/api/catalog/products", JSON.stringify(filters || {})],
    queryFn: () => fetchWithTenantHeader(url),
  });
}

/**
 * Fetch single product by ID
 */
export function useProduct(id: string | undefined) {
  return useQuery<Product>({
    queryKey: ["/api/catalog/products", id],
    queryFn: () => fetchWithTenantHeader(`/api/catalog/products/${id}`),
    enabled: !!id,
  });
}

// ============================================================================
// ORDER HOOKS
// ============================================================================

/**
 * Fetch orders with optional filters
 */
export type UseOrdersFilters = {
  status?: "draft" | "confirmed" | "completed" | "cancelled" | string;
  payment_status?: "paid" | "partial" | "unpaid";
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

export function useOrders(filters?: UseOrdersFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.status) {
    queryParams.append("status", filters.status);
  }
  if (filters?.payment_status) {
    queryParams.append("payment_status", filters.payment_status);
  }
  if (filters?.startDate) {
    queryParams.append("startDate", filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    queryParams.append("endDate", filters.endDate.toISOString());
  }
  if (filters?.page) {
    queryParams.append("page", String(filters.page));
  }
  if (filters?.limit) {
    queryParams.append("limit", String(filters.limit));
  }

  const url = `/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return useQuery<{ orders: Order[]; pagination: { page: number; limit: number; total: number } }>({
    queryKey: ["/api/orders", JSON.stringify(filters || {})],
    queryFn: () => fetchWithTenantHeader(url),
  });
}

/**
 * Fetch single order by ID
 */
export function useOrder(id: string | undefined) {
  return useQuery<Order>({
    queryKey: ["/api/orders", id],
    queryFn: () => fetchWithTenantHeader(`/api/orders/${id}`),
    enabled: !!id,
  });
}

/**
 * Create new order
 */
export type CreateOrderInput = {
  items: Array<{
    product_id: string;
    product_name: string;
    base_price: number;
    quantity: number;
    variant_id?: string;
    variant_name?: string;
    variant_price_delta?: number;
    selected_options?: SelectedOption[];
    notes?: string;
  }>;
  order_type_id?: string;
  customer_name?: string;
  table_number?: string;
  notes?: string;
  tax_rate?: number;
  service_charge_rate?: number;
};

export type CreateOrderResponse = {
  order: Order;
  pricing: {
    subtotal: number;
    tax_amount: number;
    service_charge_amount: number;
    total_amount: number;
  };
};

export function useCreateOrder() {
  return useMutation<CreateOrderResponse, Error, CreateOrderInput>({
    mutationFn: (data) => mutateWithTenantHeader("POST", "/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });
}

/**
 * Record payment for an order (supports partial payments)
 */
export type RecordPaymentInput = {
  amount: number;
  payment_method: "cash" | "card" | "ewallet" | "other";
  transaction_ref?: string;
  notes?: string;
};

export type RecordPaymentResponse = {
  payment: OrderPayment;
  order: Order;
  remainingAmount: number;
};

export type RecordPaymentVariables = RecordPaymentInput & { orderId: string };

export function useRecordPayment() {
  return useMutation<RecordPaymentResponse, Error, RecordPaymentVariables>({
    mutationFn: ({ orderId, ...payload }) =>
      mutateWithTenantHeader("POST", `/api/orders/${orderId}/payments`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", variables.orderId] });
    },
  });
}

/**
 * Create kitchen ticket for an order
 */
export type CreateKitchenTicketInput = {
  priority?: "normal" | "high" | "urgent";
};

export type CreateKitchenTicketResponse = {
  ticket: KitchenTicket;
};

export type CreateKitchenTicketVariables = CreateKitchenTicketInput & { orderId: string };

export function useCreateKitchenTicket() {
  return useMutation<CreateKitchenTicketResponse, Error, CreateKitchenTicketVariables>({
    mutationFn: ({ orderId, ...payload }) =>
      mutateWithTenantHeader("POST", `/api/orders/${orderId}/kitchen-ticket`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", variables.orderId] });
    },
  });
}

/**
 * Update existing order with new items (for continuing unpaid orders)
 */
export type UpdateOrderInput = {
  items: Array<{
    product_id: string;
    product_name: string;
    base_price: number;
    quantity: number;
    variant_id?: string;
    variant_name?: string;
    variant_price_delta?: number;
    selected_options?: SelectedOption[];
    notes?: string;
  }>;
  customer_name?: string;
  tax_rate?: number;
  service_charge_rate?: number;
};

export type UpdateOrderVariables = UpdateOrderInput & { orderId: string };

export type UpdateOrderResponse = {
  order: Order;
  pricing: {
    subtotal: number;
    tax_amount: number;
    service_charge_amount: number;
    total_amount: number;
  };
};

export function useUpdateOrder() {
  return useMutation<UpdateOrderResponse, Error, UpdateOrderVariables>({
    mutationFn: ({ orderId, ...payload }) =>
      mutateWithTenantHeader("PATCH", `/api/orders/${orderId}`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", variables.orderId] });
    },
  });
}

/**
 * Fetch order types for tenant
 */
export function useOrderTypes() {
  return useQuery<OrderType[]>({
    queryKey: ["/api/orders/order-types"],
    queryFn: () => fetchWithTenantHeader("/api/orders/order-types"),
  });
}

/**
 * Fetch all order types (master data)
 */
export function useAllOrderTypes() {
  return useQuery<OrderType[]>({
    queryKey: ["/api/orders/order-types/all"],
    queryFn: () => fetchWithTenantHeader("/api/orders/order-types/all"),
  });
}

/**
 * Enable order type for tenant
 */
export type EnableOrderTypeInput = {
  orderTypeId: string;
  config?: Record<string, any>;
};

export function useEnableOrderType() {
  return useMutation<TenantOrderType, Error, EnableOrderTypeInput>({
    mutationFn: ({ orderTypeId, config }) =>
      mutateWithTenantHeader("POST", `/api/orders/order-types/${orderTypeId}/enable`, { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/order-types"] });
    },
  });
}

/**
 * Disable order type for tenant
 */
export type DisableOrderTypeInput = {
  orderTypeId: string;
};

export function useDisableOrderType() {
  return useMutation<void, Error, DisableOrderTypeInput>({
    mutationFn: ({ orderTypeId }) =>
      mutateWithTenantHeader("POST", `/api/orders/order-types/${orderTypeId}/disable`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/order-types"] });
    },
  });
}

/**
 * Confirm an order (transition from draft to confirmed)
 */
export type ConfirmOrderInput = {
  orderId: string;
};

export function useConfirmOrder() {
  return useMutation<Order, Error, ConfirmOrderInput>({
    mutationFn: ({ orderId }) =>
      mutateWithTenantHeader("POST", `/api/orders/${orderId}/confirm`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", variables.orderId] });
    },
  });
}

/**
 * Complete an order (mark as completed)
 */
export type CompleteOrderInput = {
  orderId: string;
};

export function useCompleteOrder() {
  return useMutation<Order, Error, CompleteOrderInput>({
    mutationFn: ({ orderId }) =>
      mutateWithTenantHeader("POST", `/api/orders/${orderId}/complete`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", variables.orderId] });
    },
  });
}

/**
 * Cancel an order
 */
export type CancelOrderInput = {
  orderId: string;
};

export function useCancelOrder() {
  return useMutation<Order, Error, CancelOrderInput>({
    mutationFn: ({ orderId }) =>
      mutateWithTenantHeader("POST", `/api/orders/${orderId}/cancel`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", variables.orderId] });
    },
  });
}

// ============================================================================
// TENANT HOOKS
// ============================================================================

/**
 * Fetch active features for tenant
 */
export function useTenantFeatures() {
  return useQuery<{ features: TenantFeature[]; total: number }>({
    queryKey: ["/api/tenants/features"],
    queryFn: () => fetchWithTenantHeader("/api/tenants/features"),
  });
}

/**
 * Check feature access for tenant
 */
export type CheckFeatureInput = {
  feature_code: string;
};

export function useCheckFeature() {
  return useMutation<FeatureCheck, Error, CheckFeatureInput>({
    mutationFn: (data) => mutateWithTenantHeader("POST", "/api/tenants/features/check", data),
  });
}
