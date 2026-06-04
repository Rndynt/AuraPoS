import '../register-paths';
import { db } from '@pos/infrastructure/database';
import { sql } from 'drizzle-orm';

async function main() {
  // Migrate stale tier names to the canonical 'starter' / 'professional' / 'enterprise' values.
  const r = await db.execute(sql`UPDATE tenants SET plan_tier = 'starter' WHERE plan_tier IN ('growth', 'premium', 'standard')`);
  console.log('Fixed rows:', (r as any).rowCount);
  const rows = await db.execute(sql`SELECT id, slug, plan_tier FROM tenants ORDER BY id`);
  for (const row of (rows as any)) {
    console.log(row.slug, '->', row.plan_tier);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
