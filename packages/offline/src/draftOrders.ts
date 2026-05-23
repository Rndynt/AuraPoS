import { nanoid } from "nanoid";
import { offlineDb } from "./db";

export type LocalDraftOrder = {
  id: string;
  tenantId: string;
  customerName?: string;
  tableNumber?: string;
  items: unknown[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

const DRAFT_PREFIX = "draft:";

export async function listLocalDraftOrders(tenantId: string): Promise<LocalDraftOrder[]> {
  const rows = await offlineDb.local_cart_sessions.where("tenantId").equals(tenantId).toArray();
  return rows
    .filter((r: { id: string }) => r.id.startsWith(DRAFT_PREFIX))
    .map((r: { payload: unknown }) => r.payload as LocalDraftOrder)
    .sort((a: LocalDraftOrder, b: LocalDraftOrder) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveLocalDraftOrder(input: Omit<LocalDraftOrder, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<LocalDraftOrder> {
  const now = new Date().toISOString();
  const id = input.id ?? nanoid();
  const draft: LocalDraftOrder = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await offlineDb.local_cart_sessions.put({
    id: `${DRAFT_PREFIX}${id}`,
    tenantId: draft.tenantId,
    payload: draft,
    updatedAt: now,
  });

  return draft;
}

export async function deleteLocalDraftOrder(tenantId: string, id: string): Promise<void> {
  const key = `${DRAFT_PREFIX}${id}`;
  const row = await offlineDb.local_cart_sessions.get(key);
  if (!row || row.tenantId !== tenantId) return;
  await offlineDb.local_cart_sessions.delete(key);
}
