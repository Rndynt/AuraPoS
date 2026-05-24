import Dexie, { type Table } from "dexie";
import { OFFLINE_DB_NAME } from "./schema";
import type { LocalOrder, LocalOrderItem, LocalPayment, LocalPrintJob, LocalProduct, LocalKitchenTicket, SyncConflict, SyncOutboxItem, TerminalIdentity } from "./types";

export class AuraPosOfflineDb extends Dexie {
  local_tenants!: Table<{ id: string; tenantId: string; syncStatus: string }, string>;
  local_features!: Table<{ id: string; tenantId: string; code: string; enabled: boolean; syncStatus: string }, string>;
  local_products!: Table<LocalProduct, string>;
  local_categories!: Table<{ id: string; tenantId: string; name: string; syncStatus: string }, string>;
  local_order_types!: Table<{ id: string; tenantId: string; name: string; syncStatus: string }, string>;
  local_tables!: Table<{ id: string; tenantId: string; name: string; status: string; syncStatus: string }, string>;
  local_terminal!: Table<TerminalIdentity, string>;
  local_cart_sessions!: Table<{ id: string; tenantId: string; payload: unknown; updatedAt: string }, string>;
  local_orders!: Table<LocalOrder, string>;
  local_order_items!: Table<LocalOrderItem, string>;
  local_order_payments!: Table<LocalPayment, string>;
  local_print_jobs!: Table<LocalPrintJob, string>;
  local_kitchen_tickets!: Table<LocalKitchenTicket, string>;
  sync_outbox!: Table<SyncOutboxItem, string>;
  sync_attempts!: Table<{ id: string; outboxId: string; status: string; error?: string; createdAt: string }, string>;
  sync_conflicts!: Table<SyncConflict, string>;
  sync_meta!: Table<{ key: string; value: string; updatedAt: string }, string>;

  constructor() {
    super(OFFLINE_DB_NAME);

    // Version 1 — original schema
    this.version(1).stores({
      local_tenants: "id, tenantId, syncStatus",
      local_features: "id, tenantId, code, syncStatus",
      local_products: "id, tenantId, syncStatus, updatedAt",
      local_categories: "id, tenantId, syncStatus",
      local_order_types: "id, tenantId, syncStatus",
      local_tables: "id, tenantId, status, syncStatus",
      local_terminal: "terminalId, tenantId, updatedAt",
      local_cart_sessions: "id, tenantId, updatedAt",
      local_orders: "localId, tenantId, terminalId, syncStatus, idempotencyKey, createdAtLocal",
      local_order_items: "id, localOrderId, tenantId, syncStatus",
      local_order_payments: "id, localOrderId, tenantId, syncStatus, idempotencyKey",
      local_print_jobs: "id, tenantId, terminalId, localOrderId, status, syncStatus",
      sync_outbox: "id, tenantId, terminalId, entityType, status, createdAt",
      sync_attempts: "id, outboxId, status, createdAt",
      sync_conflicts: "id, tenantId, localEntityId, conflictType, createdAt",
      sync_meta: "key, updatedAt",
    });

    // Version 2 — adds local_kitchen_tickets for offline KDS
    this.version(2).stores({
      local_tenants: "id, tenantId, syncStatus",
      local_features: "id, tenantId, code, syncStatus",
      local_products: "id, tenantId, syncStatus, updatedAt",
      local_categories: "id, tenantId, syncStatus",
      local_order_types: "id, tenantId, syncStatus",
      local_tables: "id, tenantId, status, syncStatus",
      local_terminal: "terminalId, tenantId, updatedAt",
      local_cart_sessions: "id, tenantId, updatedAt",
      local_orders: "localId, tenantId, terminalId, syncStatus, idempotencyKey, createdAtLocal",
      local_order_items: "id, localOrderId, tenantId, syncStatus",
      local_order_payments: "id, localOrderId, tenantId, syncStatus, idempotencyKey",
      local_print_jobs: "id, tenantId, terminalId, localOrderId, status, syncStatus",
      local_kitchen_tickets: "id, tenantId, terminalId, localOrderId, status, syncStatus, createdAt",
      sync_outbox: "id, tenantId, terminalId, entityType, status, createdAt",
      sync_attempts: "id, outboxId, status, createdAt",
      sync_conflicts: "id, tenantId, localEntityId, conflictType, createdAt",
      sync_meta: "key, updatedAt",
    });
  }
}

export const offlineDb = new AuraPosOfflineDb();
