import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveTenantId } from "@/lib/tenant";
import { buildApiHeaders } from "@/lib/outlet";

async function apiFetch(url: string) {
  const res = await fetch(url, { headers: buildApiHeaders(), credentials: "include" });
  if (!res.ok) { const t = await res.text(); throw new Error(t || res.statusText); }
  return res.json();
}

async function apiPost(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: buildApiHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || res.statusText); }
  return res.json();
}

async function apiPut(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: buildApiHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || res.statusText); }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type LowStockItem = {
  productId: string;
  productName: string;
  category: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  threshold: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  outletId: string;
};

export type OpnameStatus = "draft" | "submitted" | "approved" | "cancelled";

export type OpnameItem = {
  id: string;
  opnameId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockOpname = {
  id: string;
  tenantId: string;
  outletId: string;
  opnameNumber: string;
  status: OpnameStatus;
  notes: string | null;
  startedBy: string | null;
  submittedBy: string | null;
  approvedBy: string | null;
  startedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OpnameItem[];
};

export type TransferStatus = "draft" | "submitted" | "received" | "cancelled";

export type TransferItem = {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockTransfer = {
  id: string;
  tenantId: string;
  transferNumber: string;
  fromOutletId: string;
  toOutletId: string;
  status: TransferStatus;
  notes: string | null;
  createdBy: string | null;
  submittedBy: string | null;
  receivedBy: string | null;
  cancelledBy: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: TransferItem[];
};

// ── Low Stock ──────────────────────────────────────────────────────────────────

export function useLowStockItems() {
  const tenantId = getActiveTenantId();
  return useQuery<{ success: boolean; data: { items: LowStockItem[]; total: number } }>({
    queryKey: ["/api/inventory/low-stock", tenantId],
    queryFn: () => apiFetch("/api/inventory/low-stock"),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useSetLowStockThreshold() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, threshold }: { productId: string; threshold: number | null }) =>
      apiPut(`/api/inventory/products/${productId}/threshold`, { threshold }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory/low-stock", tenantId] });
      qc.invalidateQueries({ queryKey: ["/api/inventory/products", tenantId] });
    },
  });
}

// ── Opname ────────────────────────────────────────────────────────────────────

export function useOpnames(status?: OpnameStatus) {
  const tenantId = getActiveTenantId();
  const params = status ? `?status=${status}` : "";
  return useQuery<{ success: boolean; data: { opnames: StockOpname[] } }>({
    queryKey: ["/api/inventory/opnames", tenantId, status],
    queryFn: () => apiFetch(`/api/inventory/opnames${params}`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useOpnameDetail(id: string | null) {
  const tenantId = getActiveTenantId();
  return useQuery<{ success: boolean; data: StockOpname }>({
    queryKey: ["/api/inventory/opnames", tenantId, id],
    queryFn: () => apiFetch(`/api/inventory/opnames/${id}`),
    enabled: !!tenantId && !!id,
    staleTime: 10_000,
  });
}

export function useCreateOpname() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { notes?: string; startedBy?: string }) =>
      apiPost("/api/inventory/opnames", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/inventory/opnames", tenantId] }),
  });
}

export function useUpdateOpnameItem() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      opnameId,
      productId,
      countedQuantity,
      notes,
    }: {
      opnameId: string;
      productId: string;
      countedQuantity: number;
      notes?: string;
    }) => apiPut(`/api/inventory/opnames/${opnameId}/items/${productId}`, { countedQuantity, notes }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/inventory/opnames", tenantId, vars.opnameId] });
    },
  });
}

export function useSubmitOpname() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ opnameId, submittedBy }: { opnameId: string; submittedBy?: string }) =>
      apiPost(`/api/inventory/opnames/${opnameId}/submit`, { submittedBy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/inventory/opnames", tenantId] }),
  });
}

export function useApproveOpname() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ opnameId, approvedBy }: { opnameId: string; approvedBy?: string }) =>
      apiPost(`/api/inventory/opnames/${opnameId}/approve`, { approvedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory/opnames", tenantId] });
      qc.invalidateQueries({ queryKey: ["/api/inventory/products", tenantId] });
      qc.invalidateQueries({ queryKey: ["/api/inventory/low-stock", tenantId] });
    },
  });
}

export function useCancelOpname() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ opnameId }: { opnameId: string }) =>
      apiPost(`/api/inventory/opnames/${opnameId}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/inventory/opnames", tenantId] }),
  });
}

// ── Transfer ──────────────────────────────────────────────────────────────────

export function useTransfers(status?: TransferStatus) {
  const tenantId = getActiveTenantId();
  const params = status ? `?status=${status}` : "";
  return useQuery<{ success: boolean; data: { transfers: StockTransfer[] } }>({
    queryKey: ["/api/inventory/transfers", tenantId, status],
    queryFn: () => apiFetch(`/api/inventory/transfers${params}`),
    enabled: !!tenantId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useTransferDetail(id: string | null) {
  const tenantId = getActiveTenantId();
  return useQuery<{ success: boolean; data: StockTransfer }>({
    queryKey: ["/api/inventory/transfers", tenantId, id],
    queryFn: () => apiFetch(`/api/inventory/transfers/${id}`),
    enabled: !!tenantId && !!id,
    staleTime: 10_000,
    retry: false,
  });
}

export function useCreateTransfer() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      fromOutletId: string;
      toOutletId: string;
      notes?: string;
      createdBy?: string;
      items: Array<{ productId: string; quantity: number; notes?: string }>;
    }) => apiPost("/api/inventory/transfers", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/inventory/transfers", tenantId] }),
  });
}

export function useSubmitTransfer() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, submittedBy }: { transferId: string; submittedBy?: string }) =>
      apiPost(`/api/inventory/transfers/${transferId}/submit`, { submittedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory/transfers", tenantId] });
      qc.invalidateQueries({ queryKey: ["/api/inventory/products", tenantId] });
    },
  });
}

export function useReceiveTransfer() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, receivedBy }: { transferId: string; receivedBy?: string }) =>
      apiPost(`/api/inventory/transfers/${transferId}/receive`, { receivedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory/transfers", tenantId] });
      qc.invalidateQueries({ queryKey: ["/api/inventory/products", tenantId] });
    },
  });
}

export function useCancelTransfer() {
  const tenantId = getActiveTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transferId, cancelledBy }: { transferId: string; cancelledBy?: string }) =>
      apiPost(`/api/inventory/transfers/${transferId}/cancel`, { cancelledBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory/transfers", tenantId] });
      qc.invalidateQueries({ queryKey: ["/api/inventory/products", tenantId] });
    },
  });
}
