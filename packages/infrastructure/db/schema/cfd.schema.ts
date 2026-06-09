import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, integer, decimal, boolean, timestamp, date, json, jsonb, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { orders } from "./orders.schema";
import { outlets } from "./outlets.schema";
import { tenants } from "./tenants.schema";

export const terminals = pgTable("terminals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
  terminalCode: varchar("terminal_code", { length: 128 }).notNull(),
  name: text("name").notNull().default("Cashier"),
  deviceFingerprint: text("device_fingerprint"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("terminals_tenant_idx").on(table.tenantId),
  outletIdx: index("terminals_outlet_idx").on(table.outletId),
  tenantCodeUnique: uniqueIndex("terminals_tenant_code_unique").on(table.tenantId, table.terminalCode),
}));

export const insertTerminalSchema = createInsertSchema(terminals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTerminal = z.infer<typeof insertTerminalSchema>;
export type Terminal = typeof terminals.$inferSelect;

// ── Sprint 4: Sync Batches ────────────────────────────────────────────────────

export const syncBatches = pgTable("sync_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
  terminalId: varchar("terminal_id"),
  batchSize: integer("batch_size").notNull().default(0),
  syncedCount: integer("synced_count").notNull().default(0),
  replayedCount: integer("replayed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  conflictCount: integer("conflict_count").notNull().default(0),
  appVersion: varchar("app_version", { length: 64 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("sync_batches_tenant_idx").on(table.tenantId),
  outletIdx: index("sync_batches_outlet_idx").on(table.outletId),
  terminalIdx: index("sync_batches_terminal_idx").on(table.terminalId),
}));

export const insertSyncBatchSchema = createInsertSchema(syncBatches).omit({ id: true, createdAt: true });
export type InsertSyncBatch = z.infer<typeof insertSyncBatchSchema>;
export type SyncBatch = typeof syncBatches.$inferSelect;

// ── Sprint 4: Sync Events ─────────────────────────────────────────────────────

export const syncEvents = pgTable("sync_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
  terminalId: varchar("terminal_id"),
  batchId: uuid("batch_id").references(() => syncBatches.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 50 }).notNull().default("order"),
  localEntityId: varchar("local_entity_id", { length: 128 }),
  serverEntityId: varchar("server_entity_id"),
  localOrderNumber: varchar("local_order_number", { length: 128 }),
  serverOrderNumber: text("server_order_number"),
  status: varchar("status", { length: 50 }).notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("sync_events_tenant_idx").on(table.tenantId),
  outletIdx: index("sync_events_outlet_idx").on(table.outletId),
  batchIdx: index("sync_events_batch_idx").on(table.batchId),
  localEntityIdx: index("sync_events_local_entity_idx").on(table.localEntityId),
}));

export const insertSyncEventSchema = createInsertSchema(syncEvents).omit({ id: true, createdAt: true });
export type InsertSyncEvent = z.infer<typeof insertSyncEventSchema>;
export type SyncEvent = typeof syncEvents.$inferSelect;

// ── Sprint 4: Server-Side Sync Conflicts ─────────────────────────────────────

export const serverSyncConflicts = pgTable("server_sync_conflicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "set null" }),
  terminalId: varchar("terminal_id"),
  localOrderId: varchar("local_order_id", { length: 128 }),
  serverOrderId: uuid("server_order_id"),
  conflictType: varchar("conflict_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  conflictData: jsonb("conflict_data"),
  resolution: varchar("resolution", { length: 30 }).notNull().default("pending"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("server_sync_conflicts_tenant_idx").on(table.tenantId),
  outletIdx: index("server_sync_conflicts_outlet_idx").on(table.outletId),
  terminalIdx: index("server_sync_conflicts_terminal_idx").on(table.terminalId),
}));

export const insertServerSyncConflictSchema = createInsertSchema(serverSyncConflicts).omit({ id: true, createdAt: true });
export type InsertServerSyncConflict = z.infer<typeof insertServerSyncConflictSchema>;
export type ServerSyncConflict = typeof serverSyncConflicts.$inferSelect;
