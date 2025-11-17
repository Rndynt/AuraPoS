import { CURRENT_TENANT_ID } from "@pos/core/tenant";

const STORAGE_KEY = "aurapos.activeTenantId";
let activeTenantId = CURRENT_TENANT_ID;

export function resolveInitialTenantId() {
  if (typeof window === "undefined") {
    return activeTenantId;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  activeTenantId = stored || CURRENT_TENANT_ID;
  return activeTenantId;
}

export function getActiveTenantId() {
  return activeTenantId;
}

export function setActiveTenantId(nextTenantId: string) {
  activeTenantId = nextTenantId;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, nextTenantId);
  }
}
