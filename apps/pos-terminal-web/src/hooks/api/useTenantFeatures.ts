import { useQuery } from "@tanstack/react-query";
import type { TenantFeature, FeatureCheck } from "@/../../packages/domain/tenants/types";
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

export function useTenantFeatures() {
  return useQuery<TenantFeature[]>({
    queryKey: ["/api/tenants/features"],
    queryFn: () => fetchWithTenantHeader("/api/tenants/features"),
  });
}

export function useCheckFeatureAccess(featureCode: string) {
  return useQuery<FeatureCheck>({
    queryKey: ["/api/tenants/features/check", featureCode],
    queryFn: () => postWithTenantHeader("/api/tenants/features/check", { feature_code: featureCode }),
    enabled: !!featureCode,
  });
}
