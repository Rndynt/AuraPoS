/**
 * extraction-check.ts
 *
 * Phase 8L: Validates that the standalone northflow-payment-orchestration repo
 * is complete and self-contained.
 *
 * Checks:
 * 1. Required directories exist.
 * 2. Required package.json / tsconfig.json files present.
 * 3. Key source entry points present.
 * 4. No forbidden AuraPoS import leakage in standalone source.
 * 5. Migrations directory is not empty.
 * 6. Docs are present.
 * 7. .env.example present.
 * 8. Dockerfile present.
 *
 * Run:
 *   npx tsx --tsconfig tests/tsconfig.json scripts/extraction-check.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function check(description: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Northflow Payment Orchestration — Phase 8L Extraction Check');
console.log('═══════════════════════════════════════════════════════════════\n');

// ── Section 1: Directory structure ────────────────────────────────────────────
console.log('Section 1: Directory structure');
check('packages/core/ exists', exists('packages/core'));
check('packages/client-sdk/ exists', exists('packages/client-sdk'));
check('apps/service/ exists', exists('apps/service'));
check('migrations/ exists', exists('migrations'));
check('tests/ exists', exists('tests'));
check('docs/ exists', exists('docs'));
check('scripts/ exists', exists('scripts'));

// ── Section 2: Config files ───────────────────────────────────────────────────
console.log('\nSection 2: Config files');
check('package.json (root)', exists('package.json'));
check('pnpm-workspace.yaml', exists('pnpm-workspace.yaml'));
check('turbo.json', exists('turbo.json'));
check('tsconfig.base.json', exists('tsconfig.base.json'));
check('.env.example (root)', exists('.env.example'));
check('.gitignore', exists('.gitignore'));
check('packages/core/package.json', exists('packages/core/package.json'));
check('packages/core/tsconfig.json', exists('packages/core/tsconfig.json'));
check('packages/client-sdk/package.json', exists('packages/client-sdk/package.json'));
check('packages/client-sdk/tsconfig.json', exists('packages/client-sdk/tsconfig.json'));
check('apps/service/package.json', exists('apps/service/package.json'));
check('apps/service/tsconfig.json', exists('apps/service/tsconfig.json'));
check('apps/service/drizzle.config.ts', exists('apps/service/drizzle.config.ts'));
check('apps/service/.env.example', exists('apps/service/.env.example'));
check('apps/service/Dockerfile', exists('apps/service/Dockerfile'));
check('tests/tsconfig.json', exists('tests/tsconfig.json'));

// ── Section 3: Source entry points ───────────────────────────────────────────
console.log('\nSection 3: Source entry points');
check('packages/core/src/index.ts', exists('packages/core/src/index.ts'));
check('packages/client-sdk/src/index.ts', exists('packages/client-sdk/src/index.ts'));
check('packages/client-sdk/src/client.ts', exists('packages/client-sdk/src/client.ts'));
check('packages/client-sdk/src/errors.ts', exists('packages/client-sdk/src/errors.ts'));
check('apps/service/src/index.ts', exists('apps/service/src/index.ts'));
check('apps/service/src/app.ts', exists('apps/service/src/app.ts'));
check('apps/service/src/container.ts', exists('apps/service/src/container.ts'));
check('apps/service/src/config/env.ts', exists('apps/service/src/config/env.ts'));
check('apps/service/src/infrastructure/schema.ts', exists('apps/service/src/infrastructure/schema.ts'));
check('apps/service/src/infrastructure/db.ts', exists('apps/service/src/infrastructure/db.ts'));

// ── Section 4: Migrations not empty ──────────────────────────────────────────
console.log('\nSection 4: Migrations');
const migrationFiles = exists('migrations')
  ? readdirSync(join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql'))
  : [];
check('migrations/ contains at least one .sql file', migrationFiles.length > 0, `found: ${migrationFiles.length}`);

// ── Section 5: Docs present ───────────────────────────────────────────────────
console.log('\nSection 5: Docs');
check('docs/payment-orchestration-api-contract.md', exists('docs/payment-orchestration-api-contract.md'));
check('docs/payment-orchestration-sdk-contract.md', exists('docs/payment-orchestration-sdk-contract.md'));
check('docs/payment-orchestration-error-codes.md', exists('docs/payment-orchestration-error-codes.md'));
check('docs/payment-orchestration-deployment.md', exists('docs/payment-orchestration-deployment.md'));
check('docs/payment-orchestration-worker-operations.md', exists('docs/payment-orchestration-worker-operations.md'));
check('docs/openapi/payment-orchestration.openapi.json', exists('docs/openapi/payment-orchestration.openapi.json'));

// ── Section 6: Boundary purity (no forbidden AuraPoS imports) ─────────────────
console.log('\nSection 6: Boundary purity');

const SCOPES = ['packages/core', 'packages/client-sdk', 'apps/service'];
const FORBIDDEN_PATTERNS = [
  /from ['"]@pos\//,
  /from ['"].*apps\/api/,
  /from ['"].*packages\/application\/payments/,
  /from ['"].*packages\/domain\/payments/,
  /from ['"].*packages\/infrastructure\/payments/,
  /from ['"].*pos-terminal-web/,
  /from ['"].*shared\/schema/,
];

const allSourceFiles = SCOPES.flatMap((scope) => sourceFiles(join(ROOT, scope)));
const violations: string[] = [];

for (const file of allSourceFiles) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      violations.push(`${relative(ROOT, file)}: ${pattern}`);
    }
  }
}

check('No forbidden AuraPoS imports in standalone source', violations.length === 0,
  violations.length > 0 ? `\n    ${violations.join('\n    ')}` : undefined);

// ── Section 7: Package name consistency ───────────────────────────────────────
console.log('\nSection 7: Package name consistency');

function readPackageName(rel: string): string | null {
  const full = join(ROOT, rel);
  if (!existsSync(full)) return null;
  const pkg = JSON.parse(readFileSync(full, 'utf8')) as { name?: string };
  return pkg.name ?? null;
}

check('packages/core name = @northflow/payment-orchestration-core',
  readPackageName('packages/core/package.json') === '@northflow/payment-orchestration-core');
check('packages/client-sdk name = @northflow/payment-orchestration-client-sdk',
  readPackageName('packages/client-sdk/package.json') === '@northflow/payment-orchestration-client-sdk');
check('apps/service name = @northflow/payment-orchestration-service',
  readPackageName('apps/service/package.json') === '@northflow/payment-orchestration-service');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  Result: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
