import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, integer, decimal, boolean, timestamp, date, json, jsonb, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { orders } from "./orders.schema";
import { outlets } from "./outlets.schema";
import { tenants } from "./tenants.schema";

export const kitchenTickets = pgTable("kitchen_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  ticketNumber: text("ticket_number").notNull(),
  tableNumber: text("table_number"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  items: json("items").notNull(),
  printedAt: timestamp("printed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("kitchen_tickets_tenant_idx").on(table.tenantId),
  outletIdx: index("kitchen_tickets_outlet_idx").on(table.outletId),
  orderIdx: index("kitchen_tickets_order_idx").on(table.orderId),
  statusIdx: index("kitchen_tickets_status_idx").on(table.status),
}));

export const insertKitchenTicketSchema = createInsertSchema(kitchenTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["pending", "preparing", "ready", "delivered"]).default("pending"),
  items: z.array(z.any()),
});

export const selectKitchenTicketSchema = createSelectSchema(kitchenTickets);
export type InsertKitchenTicket = z.infer<typeof insertKitchenTicketSchema>;
export type KitchenTicket = typeof kitchenTickets.$inferSelect;
