import { nanoid } from "nanoid";
import { offlineDb } from "./db";
import type { TerminalIdentity } from "./types";

const KEY = "aurapos_terminal_id";

export async function getOrCreateTerminalIdentity(tenantId: string): Promise<TerminalIdentity> {
  const existing = await offlineDb.local_terminal.where("tenantId").equals(tenantId).first();
  if (existing) return existing;
  const local = localStorage.getItem(KEY);
  const now = new Date().toISOString();
  const shortTenantId = tenantId.slice(0, 6).toUpperCase();
  const terminalId = local ?? `TERM-${shortTenantId}-${nanoid(6).toUpperCase()}`;
  const created: TerminalIdentity = { tenantId, terminalId, terminalName: "Cashier 1", createdAt: now, updatedAt: now };
  await offlineDb.local_terminal.put(created);
  localStorage.setItem(KEY, terminalId);
  return created;
}
