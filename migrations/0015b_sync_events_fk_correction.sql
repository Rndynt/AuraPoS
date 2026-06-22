-- Correct sync_events foreign keys after native UUID alignment.
--
-- This is intentionally separate from 0015_native_uuid_alignment.sql so databases
-- that already attempted the alignment can safely converge without manual edits.

DO $$
BEGIN
  IF to_regclass('sync_events') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_tenant_id_tenants_id_fk;
  ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_outlet_id_outlets_id_fk;
  ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_batch_id_sync_batches_id_fk;
  ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_outlet_id_sync_batches_id_fk;

  IF to_regclass('tenants') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'sync_events'::regclass AND attname = 'tenant_id' AND NOT attisdropped)
     AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'tenants'::regclass AND attname = 'id' AND NOT attisdropped) THEN
    ALTER TABLE sync_events
      ADD CONSTRAINT sync_events_tenant_id_tenants_id_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF to_regclass('outlets') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'sync_events'::regclass AND attname = 'outlet_id' AND NOT attisdropped)
     AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'outlets'::regclass AND attname = 'id' AND NOT attisdropped) THEN
    ALTER TABLE sync_events
      ADD CONSTRAINT sync_events_outlet_id_outlets_id_fk
      FOREIGN KEY (outlet_id) REFERENCES outlets(id)
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF to_regclass('sync_batches') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'sync_events'::regclass AND attname = 'batch_id' AND NOT attisdropped)
     AND EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'sync_batches'::regclass AND attname = 'id' AND NOT attisdropped) THEN
    ALTER TABLE sync_events
      ADD CONSTRAINT sync_events_batch_id_sync_batches_id_fk
      FOREIGN KEY (batch_id) REFERENCES sync_batches(id)
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END;
$$;
