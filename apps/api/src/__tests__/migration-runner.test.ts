import '../../register-paths';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { createMigrationFailure, isAlreadyAppliedMigrationError } = await import('../migrations/migrationRunner');

describe('migration runner failure semantics', () => {
  it('does not classify legacy tenant id cast failures as already-applied drift', () => {
    const error = Object.assign(new Error('Cannot cast tenants.id to uuid; invalid value: thamada'), {
      code: '22P02',
    });

    assert.equal(isAlreadyAppliedMigrationError(error), false);
  });

  it('creates an actionable non-zero failure summary for failed migrations', () => {
    const failure = createMigrationFailure({
      applied: 0,
      skipped: 14,
      errors: 1,
      failedMigration: '0015_native_uuid_alignment.sql',
      failedMessage: 'Cannot cast tenants.id to uuid; invalid value: thamada',
    });

    assert.match(failure.message, /DB migrations failed/);
    assert.match(failure.message, /errors: 1/);
    assert.match(failure.message, /0015_native_uuid_alignment\.sql/);
    assert.match(failure.message, /thamada/);
  });
});
