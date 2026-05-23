import { nanoid } from "nanoid";
import { offlineDb } from "./db";
import type { SyncOutboxItem } from "./types";

const MAX_RETRY = 8;

function nowIso() {
  return new Date().toISOString();
}

export async function enqueueOutbox(input: Omit<SyncOutboxItem, "id" | "status" | "attemptCount" | "createdAt" | "updatedAt">): Promise<SyncOutboxItem> {
  const now = nowIso();
  const item: SyncOutboxItem = {
    id: nanoid(),
    status: "pending",
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  await offlineDb.sync_outbox.put(item);
  return item;
}

export async function dequeuePendingOutbox(limit = 20): Promise<SyncOutboxItem[]> {
  const now = nowIso();
  const all = await offlineDb.sync_outbox.where("status").anyOf(["pending", "failed"]).toArray();
  return all
    .filter((i: SyncOutboxItem) => !i.nextRetryAt || i.nextRetryAt <= now)
    .sort((a: SyncOutboxItem, b: SyncOutboxItem) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

export async function markOutboxSyncing(id: string): Promise<void> {
  await offlineDb.sync_outbox.update(id, { status: "syncing", updatedAt: nowIso() });
}

export async function markOutboxSynced(id: string): Promise<void> {
  await offlineDb.sync_outbox.update(id, { status: "synced", updatedAt: nowIso(), lastError: undefined, nextRetryAt: undefined });
}

export async function markOutboxConflict(id: string, error: string): Promise<void> {
  await offlineDb.sync_outbox.update(id, { status: "conflict", updatedAt: nowIso(), lastError: error });
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  const row = await offlineDb.sync_outbox.get(id);
  if (!row) return;
  const attempts = (row.attemptCount ?? 0) + 1;
  const nextMs = Math.min(2 ** attempts * 1000, 5 * 60 * 1000);
  const retryAt = new Date(Date.now() + nextMs).toISOString();
  const terminal = attempts >= MAX_RETRY;

  await offlineDb.sync_outbox.update(id, {
    status: terminal ? "failed" : "failed",
    attemptCount: attempts,
    lastError: error,
    updatedAt: nowIso(),
    nextRetryAt: terminal ? undefined : retryAt,
  });
}

export async function resetOutboxForManualRetry(id: string): Promise<void> {
  await offlineDb.sync_outbox.update(id, {
    status: "pending",
    nextRetryAt: undefined,
    updatedAt: nowIso(),
  });
}
