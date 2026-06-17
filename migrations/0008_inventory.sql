-- Inventory ledger, sync error/retry queue, balances, opname, transfer, low stock alerts.
-- Dependencies: tenants, outlets, products, orders.

CREATE TABLE "inventory_movements" (
  "id"             uuid           PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid           NOT NULL,
  "outlet_id"      uuid,
  "product_id"     uuid           NOT NULL,
  "order_id"       uuid,
  "payment_id"     uuid,
  "reference_type" varchar(50),
  "reference_id"   text,
  "metadata"       jsonb,
  "terminal_id"    varchar(255),
  "movement_type"  varchar(30)    NOT NULL,
  "quantity_delta" integer        NOT NULL,
  "quantity_before" integer,
  "quantity_after"  integer,
  "unit_cost"      numeric(10, 2),
  "notes"          text,
  "actor_id"       varchar(255),
  "created_at"     timestamp      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_movements_outlet_id_outlets_id_fk"
    FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "inventory_movements_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_movements_order_id_orders_id_fk"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE "inventory_sync_errors" (
  "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"     uuid        NOT NULL,
  "outlet_id"     uuid,
  "order_id"      uuid,
  "product_id"    uuid,
  "operation"     varchar(40) NOT NULL,
  "status"        varchar(20) NOT NULL DEFAULT 'pending',
  "payload"       jsonb       NOT NULL,
  "last_error"    text        NOT NULL,
  "retry_count"   integer     NOT NULL DEFAULT 0,
  "next_retry_at" timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at"   timestamp,
  "created_at"    timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_sync_errors_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_sync_errors_outlet_id_outlets_id_fk"
    FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "inventory_sync_errors_order_id_orders_id_fk"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "inventory_sync_errors_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action
);

-- ── Per-outlet stock balance (Advanced Stock) ─────────────────────────────────
-- Single source of truth for current stock quantity per product per outlet.
-- Single-outlet tenants have one row per tracked product (their default outlet).
-- advanced stock reads/writes here; products.stock_qty remains for basic compat.

CREATE TABLE "inventory_balances" (
  "id"                  uuid      PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"           uuid      NOT NULL,
  "outlet_id"           uuid      NOT NULL,
  "product_id"          uuid      NOT NULL,
  "quantity"            integer   NOT NULL DEFAULT 0,
  "reserved_quantity"   integer   NOT NULL DEFAULT 0,
  "low_stock_threshold" integer,
  "last_movement_id"    uuid,
  "last_counted_at"     timestamp,
  "created_at"          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_balances_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_balances_outlet_id_outlets_id_fk"
    FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_balances_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action
);

-- ── Stock Opname ──────────────────────────────────────────────────────────────

CREATE TABLE "stock_opnames" (
  "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid         NOT NULL,
  "outlet_id"      uuid         NOT NULL,
  "opname_number"  varchar(50)  NOT NULL,
  "status"         varchar(20)  NOT NULL DEFAULT 'draft',
  "notes"          text,
  "started_by"     text,
  "submitted_by"   text,
  "approved_by"    text,
  "started_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_at"   timestamp,
  "approved_at"    timestamp,
  "cancelled_at"   timestamp,
  "created_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_opnames_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "stock_opnames_outlet_id_outlets_id_fk"
    FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "stock_opname_items" (
  "id"                uuid      PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "opname_id"         uuid      NOT NULL,
  "product_id"        uuid      NOT NULL,
  "system_quantity"   integer   NOT NULL,
  "counted_quantity"  integer   NOT NULL DEFAULT 0,
  "variance_quantity" integer   NOT NULL DEFAULT 0,
  "notes"             text,
  "created_at"        timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_opname_items_opname_id_stock_opnames_id_fk"
    FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "stock_opname_items_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action
);

-- ── Stock Transfer ────────────────────────────────────────────────────────────
-- Requires: inventory_advanced_stock + multi_location

CREATE TABLE "stock_transfers" (
  "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid         NOT NULL,
  "transfer_number"  varchar(50)  NOT NULL,
  "from_outlet_id"   uuid         NOT NULL,
  "to_outlet_id"     uuid         NOT NULL,
  "status"           varchar(20)  NOT NULL DEFAULT 'draft',
  "notes"            text,
  "created_by"       text,
  "submitted_by"     text,
  "received_by"      text,
  "cancelled_by"     text,
  "submitted_at"     timestamp,
  "received_at"      timestamp,
  "cancelled_at"     timestamp,
  "created_at"       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transfers_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "stock_transfers_from_outlet_id_outlets_id_fk"
    FOREIGN KEY ("from_outlet_id") REFERENCES "public"."outlets"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "stock_transfers_to_outlet_id_outlets_id_fk"
    FOREIGN KEY ("to_outlet_id") REFERENCES "public"."outlets"("id") ON DELETE restrict ON UPDATE no action
);

CREATE TABLE "stock_transfer_items" (
  "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transfer_id" uuid      NOT NULL,
  "product_id"  uuid      NOT NULL,
  "quantity"    integer   NOT NULL,
  "notes"       text,
  "created_at"  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk"
    FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "stock_transfer_items_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action
);

-- ── Low Stock Alerts ──────────────────────────────────────────────────────────

CREATE TABLE "inventory_low_stock_alerts" (
  "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid         NOT NULL,
  "outlet_id"        uuid         NOT NULL,
  "product_id"       uuid         NOT NULL,
  "threshold"        integer      NOT NULL,
  "current_quantity" integer      NOT NULL,
  "status"           varchar(20)  NOT NULL DEFAULT 'open',
  "acknowledged_by"  text,
  "acknowledged_at"  timestamp,
  "resolved_at"      timestamp,
  "created_at"       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_low_stock_alerts_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_low_stock_alerts_outlet_id_outlets_id_fk"
    FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "inventory_low_stock_alerts_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action
);




-- ── Indexes ───────────────────────────────────────────────────────────────────

-- inventory_movements
CREATE INDEX "inventory_movements_tenant_idx"
  ON "inventory_movements" ("tenant_id");
CREATE INDEX "inventory_movements_outlet_idx"
  ON "inventory_movements" ("outlet_id");
CREATE INDEX "inventory_movements_product_idx"
  ON "inventory_movements" ("product_id");
CREATE INDEX "inventory_movements_order_idx"
  ON "inventory_movements" ("order_id");
CREATE INDEX "inventory_movements_payment_idx"
  ON "inventory_movements" ("payment_id");
CREATE INDEX "inventory_movements_reference_idx"
  ON "inventory_movements" ("reference_type", "reference_id");
-- Idempotency: one sale/return ledger row per (order, product, movement_type).
CREATE UNIQUE INDEX "inventory_movements_order_product_movement_unique"
  ON "inventory_movements" ("order_id", "product_id", "movement_type")
  WHERE "order_id" IS NOT NULL;

-- inventory_sync_errors
CREATE INDEX "inventory_sync_errors_tenant_idx"
  ON "inventory_sync_errors" ("tenant_id");
CREATE INDEX "inventory_sync_errors_status_next_retry_idx"
  ON "inventory_sync_errors" ("status", "next_retry_at");
CREATE INDEX "inventory_sync_errors_order_idx"
  ON "inventory_sync_errors" ("order_id");
CREATE INDEX "inventory_sync_errors_product_idx"
  ON "inventory_sync_errors" ("product_id");

-- inventory_balances
CREATE UNIQUE INDEX "inventory_balances_tenant_outlet_product_unique"
  ON "inventory_balances" ("tenant_id", "outlet_id", "product_id");
CREATE INDEX "inventory_balances_tenant_idx"
  ON "inventory_balances" ("tenant_id");
CREATE INDEX "inventory_balances_outlet_idx"
  ON "inventory_balances" ("outlet_id");
CREATE INDEX "inventory_balances_product_idx"
  ON "inventory_balances" ("product_id");
CREATE INDEX "inventory_balances_tenant_outlet_idx"
  ON "inventory_balances" ("tenant_id", "outlet_id");

-- stock_opnames
CREATE INDEX "stock_opnames_tenant_idx"
  ON "stock_opnames" ("tenant_id");
CREATE INDEX "stock_opnames_outlet_idx"
  ON "stock_opnames" ("outlet_id");
CREATE INDEX "stock_opnames_status_idx"
  ON "stock_opnames" ("status");
CREATE UNIQUE INDEX "stock_opnames_tenant_number_unique"
  ON "stock_opnames" ("tenant_id", "opname_number");

-- stock_opname_items
CREATE INDEX "stock_opname_items_opname_idx"
  ON "stock_opname_items" ("opname_id");
CREATE INDEX "stock_opname_items_product_idx"
  ON "stock_opname_items" ("product_id");
CREATE UNIQUE INDEX "stock_opname_items_opname_product_unique"
  ON "stock_opname_items" ("opname_id", "product_id");

-- stock_transfers
CREATE INDEX "stock_transfers_tenant_idx"
  ON "stock_transfers" ("tenant_id");
CREATE INDEX "stock_transfers_from_outlet_idx"
  ON "stock_transfers" ("from_outlet_id");
CREATE INDEX "stock_transfers_to_outlet_idx"
  ON "stock_transfers" ("to_outlet_id");
CREATE INDEX "stock_transfers_status_idx"
  ON "stock_transfers" ("status");
CREATE UNIQUE INDEX "stock_transfers_tenant_number_unique"
  ON "stock_transfers" ("tenant_id", "transfer_number");

-- stock_transfer_items
CREATE INDEX "stock_transfer_items_transfer_idx"
  ON "stock_transfer_items" ("transfer_id");
CREATE INDEX "stock_transfer_items_product_idx"
  ON "stock_transfer_items" ("product_id");

-- inventory_low_stock_alerts
CREATE INDEX "inventory_low_stock_alerts_tenant_idx"
  ON "inventory_low_stock_alerts" ("tenant_id");
CREATE INDEX "inventory_low_stock_alerts_outlet_idx"
  ON "inventory_low_stock_alerts" ("outlet_id");
CREATE INDEX "inventory_low_stock_alerts_product_idx"
  ON "inventory_low_stock_alerts" ("product_id");
CREATE INDEX "inventory_low_stock_alerts_status_idx"
  ON "inventory_low_stock_alerts" ("status");
