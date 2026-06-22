-- P9.8 follow-up: guarantee POS order types are system-owned defaults.
--
-- Cashiers must never be blocked by missing tenant_order_types rows. This
-- migration repairs both pieces of data:
-- 1. Master order_types rows exist and are active.
-- 2. Existing tenants get enabled default tenant_order_types from business type.
--
-- It is intentionally idempotent and does not require manual database edits.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('order_types') IS NULL OR to_regclass('tenant_order_types') IS NULL OR to_regclass('tenants') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO order_types (
    id,
    code,
    name,
    description,
    is_on_premise,
    need_table_number,
    need_address,
    allow_scheduled,
    is_digital_product,
    affects_service_charge,
    is_active,
    created_at,
    updated_at
  ) VALUES
    (
      gen_random_uuid(),
      'DINE_IN',
      'Dine In',
      'Makan di tempat',
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    (
      gen_random_uuid(),
      'TAKE_AWAY',
      'Take Away',
      'Bawa pulang',
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    (
      gen_random_uuid(),
      'DELIVERY',
      'Delivery',
      'Antar ke alamat',
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    (
      gen_random_uuid(),
      'WALK_IN',
      'Walk In',
      'Transaksi langsung di toko',
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_on_premise = EXCLUDED.is_on_premise,
    need_table_number = EXCLUDED.need_table_number,
    need_address = EXCLUDED.need_address,
    allow_scheduled = EXCLUDED.allow_scheduled,
    is_digital_product = EXCLUDED.is_digital_product,
    affects_service_charge = EXCLUDED.affects_service_charge,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

  WITH expected_defaults AS (
    SELECT
      t.id AS tenant_id,
      ot.id AS order_type_id
    FROM tenants t
    JOIN order_types ot ON ot.code = ANY (
      CASE t.business_type
        WHEN 'CAFE_RESTAURANT' THEN ARRAY['DINE_IN', 'TAKE_AWAY', 'DELIVERY']::text[]
        WHEN 'RETAIL_MINIMARKET' THEN ARRAY['WALK_IN']::text[]
        WHEN 'LAUNDRY' THEN ARRAY['WALK_IN', 'DELIVERY']::text[]
        WHEN 'SERVICE_APPOINTMENT' THEN ARRAY['WALK_IN']::text[]
        WHEN 'DIGITAL_PPOB' THEN ARRAY['WALK_IN']::text[]
        ELSE ARRAY['TAKE_AWAY']::text[]
      END
    )
    WHERE t.is_active = true
      AND ot.is_active = true
  )
  UPDATE tenant_order_types tot
  SET is_enabled = true,
      updated_at = CURRENT_TIMESTAMP
  FROM expected_defaults ed
  WHERE tot.tenant_id = ed.tenant_id
    AND tot.order_type_id = ed.order_type_id;

  WITH expected_defaults AS (
    SELECT
      t.id AS tenant_id,
      ot.id AS order_type_id
    FROM tenants t
    JOIN order_types ot ON ot.code = ANY (
      CASE t.business_type
        WHEN 'CAFE_RESTAURANT' THEN ARRAY['DINE_IN', 'TAKE_AWAY', 'DELIVERY']::text[]
        WHEN 'RETAIL_MINIMARKET' THEN ARRAY['WALK_IN']::text[]
        WHEN 'LAUNDRY' THEN ARRAY['WALK_IN', 'DELIVERY']::text[]
        WHEN 'SERVICE_APPOINTMENT' THEN ARRAY['WALK_IN']::text[]
        WHEN 'DIGITAL_PPOB' THEN ARRAY['WALK_IN']::text[]
        ELSE ARRAY['TAKE_AWAY']::text[]
      END
    )
    WHERE t.is_active = true
      AND ot.is_active = true
  )
  INSERT INTO tenant_order_types (
    id,
    tenant_id,
    outlet_id,
    order_type_id,
    is_enabled,
    config,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    ed.tenant_id,
    NULL,
    ed.order_type_id,
    true,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM expected_defaults ed
  WHERE NOT EXISTS (
    SELECT 1
    FROM tenant_order_types existing
    WHERE existing.tenant_id = ed.tenant_id
      AND existing.order_type_id = ed.order_type_id
      AND existing.outlet_id IS NULL
  );
END;
$$;
