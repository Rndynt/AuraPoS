import { dequeuePendingOutbox, markOutboxConflict, markOutboxFailed, markOutboxSynced, markOutboxSyncing } from "./outbox";

export type SyncEngineResult = {
  processed: number;
  synced: number;
  failed: number;
  conflicts: number;
};

export async function runSyncEngine(token?: string): Promise<SyncEngineResult> {
  const queue = await dequeuePendingOutbox(25);
  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of queue) {
    await markOutboxSyncing(item.id);
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": item.idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: item.method === "DELETE" ? undefined : JSON.stringify(item.payload),
      });

      if (res.status === 200 || res.status === 201) {
        await markOutboxSynced(item.id);
        synced++;
        continue;
      }

      if (res.status === 409 || res.status === 422) {
        const txt = await res.text();
        await markOutboxConflict(item.id, txt || `conflict:${res.status}`);
        conflicts++;
        continue;
      }

      const txt = await res.text();
      await markOutboxFailed(item.id, txt || `failed:${res.status}`);
      failed++;
    } catch (error) {
      await markOutboxFailed(item.id, error instanceof Error ? error.message : "network_error");
      failed++;
    }
  }

  return { processed: queue.length, synced, failed, conflicts };
}
