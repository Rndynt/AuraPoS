import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, integer, decimal, boolean, timestamp, date, json, jsonb, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { outlets } from "./outlets.schema";
import { tenants } from "./tenants.schema";

export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  tableNumber: varchar("table_number").notNull(),
  tableName: text("table_name"),
  floor: varchar("floor"),
  capacity: integer("capacity"),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  currentOrderId: uuid("current_order_id"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("tables_tenant_idx").on(table.tenantId),
  outletIdx: index("tables_outlet_idx").on(table.outletId),
  statusIdx: index("tables_status_idx").on(table.status),
  uniqueTablePerOutlet: uniqueIndex("tables_unique_per_outlet").on(table.tenantId, table.outletId, table.tableNumber),
}));

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;
