import { offlineDb } from "./db";

const CART_SESSION_ID = "active";
const LEGACY_STORAGE_KEY = "pos_cart_session";
const CART_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export type StoredCartSession<TPayload = unknown> = {
  id: string;
  tenantId: string;
  payload: TPayload;
  updatedAt: string;
};

export async function loadCartSession<TPayload>(tenantId: string): Promise<TPayload | null> {
  const row = await offlineDb.local_cart_sessions.get(CART_SESSION_ID);
  if (!row || row.tenantId !== tenantId) return null;
  const expired = Date.now() - new Date(row.updatedAt).getTime() > CART_TTL_MS;
  if (expired) {
    await offlineDb.local_cart_sessions.delete(CART_SESSION_ID);
    return null;
  }
  return row.payload as TPayload;
}

export async function saveCartSession<TPayload>(tenantId: string, payload: TPayload): Promise<void> {
  await offlineDb.local_cart_sessions.put({
    id: CART_SESSION_ID,
    tenantId,
    payload,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearCartSession(): Promise<void> {
  await offlineDb.local_cart_sessions.delete(CART_SESSION_ID);
}

export async function migrateLegacySession<TPayload = unknown>(tenantId: string): Promise<TPayload | null> {
  const existing = await loadCartSession<TPayload>(tenantId);
  if (existing) return existing;

  try {
    const raw = sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TPayload;
    await saveCartSession(tenantId, parsed);
    return parsed;
  } catch {
    return null;
  }
}
