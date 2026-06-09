import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, integer, decimal, boolean, timestamp, date, json, jsonb, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { outlets } from "./outlets.schema";
import { tenants } from "./tenants.schema";

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("product_categories_tenant_idx").on(table.tenantId),
  tenantNameUnique: uniqueIndex("product_categories_tenant_name_unique").on(table.tenantId, table.name),
}));

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  metadata: jsonb("metadata"),
  hasVariants: boolean("has_variants").notNull().default(false),
  stockTrackingEnabled: boolean("stock_tracking_enabled").notNull().default(false),
  stockQty: integer("stock_qty"),
  sku: text("sku"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("products_tenant_idx").on(table.tenantId),
  categoryIdx: index("products_category_idx").on(table.category),
}));

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectProductSchema = createSelectSchema(products);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ── Outlet Product Configs (Hybrid catalog — disable a product per outlet) ────

export const outletProductConfigs = pgTable("outlet_product_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  outletId: uuid("outlet_id").notNull().references(() => outlets.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  outletIdx: index("outlet_product_configs_outlet_idx").on(table.outletId),
  productIdx: index("outlet_product_configs_product_idx").on(table.productId),
  outletProductUnique: uniqueIndex("outlet_product_configs_unique").on(table.outletId, table.productId),
}));

export const insertOutletProductConfigSchema = createInsertSchema(outletProductConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOutletProductConfig = z.infer<typeof insertOutletProductConfigSchema>;
export type OutletProductConfig = typeof outletProductConfigs.$inferSelect;

export const productOptionGroups = pgTable("product_option_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  selectionType: varchar("selection_type", { length: 20 }).notNull(),
  minSelections: integer("min_selections").notNull().default(0),
  maxSelections: integer("max_selections").notNull().default(1),
  isRequired: boolean("is_required").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("product_option_groups_tenant_idx").on(table.tenantId),
  productIdx: index("product_option_groups_product_idx").on(table.productId),
}));

export const insertProductOptionGroupSchema = createInsertSchema(productOptionGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  selectionType: z.enum(["single", "multiple"]),
});

export const selectProductOptionGroupSchema = createSelectSchema(productOptionGroups);
export type InsertProductOptionGroup = z.infer<typeof insertProductOptionGroupSchema>;
export type ProductOptionGroup = typeof productOptionGroups.$inferSelect;

export const productOptions = pgTable("product_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  optionGroupId: uuid("option_group_id").notNull().references(() => productOptionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceDelta: decimal("price_delta", { precision: 10, scale: 2 }).notNull().default("0"),
  inventorySku: text("inventory_sku"),
  isAvailable: boolean("is_available").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("product_options_tenant_idx").on(table.tenantId),
  optionGroupIdx: index("product_options_option_group_idx").on(table.optionGroupId),
}));

export const insertProductOptionSchema = createInsertSchema(productOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectProductOptionSchema = createSelectSchema(productOptions);
export type InsertProductOption = z.infer<typeof insertProductOptionSchema>;
export type ProductOption = typeof productOptions.$inferSelect;
