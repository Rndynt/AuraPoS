/**
 * kitchenQueue.ts — Offline local kitchen ticket queue.
 *
 * When the POS is offline and sends an order to the kitchen, the ticket is
 * persisted here in IndexedDB. The KDS page reads both server tickets (when
 * online) and local tickets (always) and merges them into one display.
 *
 * Status flow mirrors server: confirmed → preparing → ready → served
 * syncStatus: local_only → pending_sync → synced (after server ticket created)
 */

import { nanoid } from "nanoid";
import { offlineDb } from "./db";
import type { LocalKitchenTicket, KitchenTicketStatus, LocalKitchenItem } from "./types";

// ─── Create ───────────────────────────────────────────────────────────────────

export type EnqueueKitchenTicketInput = {
  tenantId: string;
  terminalId: string;
  localOrderId: string;
  serverOrderId?: string;
  orderNumber: string;
  items: LocalKitchenItem[];
  customerName?: string;
  tableNumber?: string;
  orderTypeName?: string;
  notes?: string;
};

export async function enqueueLocalKitchenTicket(
  input: EnqueueKitchenTicketInput
): Promise<LocalKitchenTicket> {
  const now = new Date().toISOString();
  const ticket: LocalKitchenTicket = {
    id: nanoid(),
    tenantId: input.tenantId,
    terminalId: input.terminalId,
    localOrderId: input.localOrderId,
    serverOrderId: input.serverOrderId,
    orderNumber: input.orderNumber,
    status: "confirmed",
    syncStatus: "local_only",
    items: input.items,
    customerName: input.customerName,
    tableNumber: input.tableNumber,
    orderTypeName: input.orderTypeName,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await offlineDb.local_kitchen_tickets.add(ticket);
  return ticket;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getLocalKitchenTickets(
  tenantId: string,
  statuses: KitchenTicketStatus[] = ["confirmed", "preparing", "ready"]
): Promise<LocalKitchenTicket[]> {
  const all = await offlineDb.local_kitchen_tickets
    .where("tenantId")
    .equals(tenantId)
    .toArray();

  return all
    .filter((t) => statuses.includes(t.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAllLocalKitchenTickets(
  tenantId: string,
  limit = 100
): Promise<LocalKitchenTicket[]> {
  const all = await offlineDb.local_kitchen_tickets
    .where("tenantId")
    .equals(tenantId)
    .toArray();
  return all
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

// ─── Update status ────────────────────────────────────────────────────────────

export async function updateLocalKitchenTicketStatus(
  id: string,
  status: KitchenTicketStatus
): Promise<void> {
  const now = new Date().toISOString();
  await offlineDb.local_kitchen_tickets.update(id, { status, updatedAt: now });
}

// ─── Mark synced (called by sync engine when server ticket is created) ─────────

export async function markKitchenTicketSynced(
  id: string,
  serverOrderId: string
): Promise<void> {
  const now = new Date().toISOString();
  await offlineDb.local_kitchen_tickets.update(id, {
    syncStatus: "synced",
    serverOrderId,
    updatedAt: now,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteLocalKitchenTicket(id: string): Promise<void> {
  await offlineDb.local_kitchen_tickets.delete(id);
}

/**
 * Purge served tickets older than `maxAgeMins` minutes. Call periodically
 * to prevent IndexedDB from growing indefinitely.
 */
export async function purgeServedKitchenTickets(
  tenantId: string,
  maxAgeMins = 120
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMins * 60_000).toISOString();
  const served = await offlineDb.local_kitchen_tickets
    .where("tenantId")
    .equals(tenantId)
    .and((t) => t.status === "served" && t.updatedAt < cutoff)
    .toArray();
  await offlineDb.local_kitchen_tickets.bulkDelete(served.map((t) => t.id));
  return served.length;
}
