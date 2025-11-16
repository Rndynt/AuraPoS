import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/../../packages/domain/catalog/types";

const TENANT_ID = "demo-tenant";

async function fetchWithTenantHeader(url: string) {
  const res = await fetch(url, {
    headers: {
      "x-tenant-id": TENANT_ID,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["/api/catalog/products"],
    queryFn: () => fetchWithTenantHeader("/api/catalog/products"),
  });
}

export function useProductById(id: string) {
  return useQuery<Product>({
    queryKey: ["/api/catalog/products", id],
    queryFn: () => fetchWithTenantHeader(`/api/catalog/products/${id}`),
    enabled: !!id,
  });
}
