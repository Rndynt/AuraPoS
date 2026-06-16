CREATE TABLE IF NOT EXISTS kds_devices (
  id varchar PRIMARY KEY,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outlet_id varchar REFERENCES outlets(id) ON DELETE SET NULL,
  device_name text,
  api_key text,
  activation_code varchar(6),
  activation_expires_at timestamptz,
  activation_attempts integer NOT NULL DEFAULT 0,
  activation_locked_until timestamptz,
  status varchar(30) NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kds_devices_tenant_idx ON kds_devices (tenant_id);
CREATE INDEX IF NOT EXISTS kds_devices_outlet_idx ON kds_devices (outlet_id);
CREATE INDEX IF NOT EXISTS kds_devices_active_api_key_idx ON kds_devices (api_key) WHERE status = 'active' AND api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS kds_devices_pending_activation_code_idx ON kds_devices (activation_code) WHERE status = 'pending' AND activation_code IS NOT NULL;
