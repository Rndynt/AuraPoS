import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, integer, decimal, boolean, timestamp, date, json, jsonb, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "./tenants.schema";

export const outlets = pgTable("outlets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Cabang Utama"),
  slug: varchar("slug", { length: 100 }).notNull().default("main"),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("outlets_tenant_idx").on(table.tenantId),
  tenantSlugUnique: uniqueIndex("outlets_tenant_slug_unique").on(table.tenantId, table.slug),
}));

export const insertOutletSchema = createInsertSchema(outlets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectOutletSchema = createSelectSchema(outlets);
export type InsertOutlet = z.infer<typeof insertOutletSchema>;
export type Outlet = typeof outlets.$inferSelect;

// ── User Outlet Assignments ───────────────────────────────────────────────────
// Owner can access all outlets and switch active outlet from Settings.
// Manager/Cashier/Staff are locked to their assigned outlet(s).

export const userOutletAssignments = pgTable("user_outlet_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull(),
  outletId: uuid("outlet_id").notNull().references(() => outlets.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index("user_outlet_assignments_user_idx").on(table.userId),
  outletIdx: index("user_outlet_assignments_outlet_idx").on(table.outletId),
  userOutletUnique: uniqueIndex("user_outlet_assignments_unique").on(table.userId, table.outletId),
}));

export const insertUserOutletAssignmentSchema = createInsertSchema(userOutletAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(["owner", "manager", "cashier", "staff"]).default("staff"),
});
export type InsertUserOutletAssignment = z.infer<typeof insertUserOutletAssignmentSchema>;
export type UserOutletAssignment = typeof userOutletAssignments.$inferSelect;
