import '../../register-paths';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const migrationSql = fs.readFileSync(new URL('../../../../migrations/0015_native_uuid_alignment.sql', import.meta.url), 'utf8');

describe('0015 native uuid migration repair preflight', () => {
  it('repairs legacy slug tenant ids before UUID cast checks run', () => {
    assert.match(migrationSql, /aurapos_tenant_id_repair/);
    assert.match(migrationSql, /gen_random_uuid\(\)/);
    assert.match(migrationSql, /UPDATE tenants t\s+SET id = r\.new_id::text/s);
    assert.match(migrationSql, /child SET tenant_id = repair\.new_id::text/);
  });

  it('preserves slug separately from tenants.id', () => {
    assert.match(migrationSql, /SET slug = COALESCE\(NULLIF\(t\.slug, ''\), r\.old_id\)/);
  });
});
