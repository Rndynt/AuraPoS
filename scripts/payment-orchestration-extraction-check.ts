import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

interface CheckResult { name: string; ok: boolean; details: string[]; }
const root = process.cwd();
const serviceSrc = join(root, 'apps/payment-orchestration-service/src');
const forbiddenImportPatterns = [
  /from ['"](?:\.\.\/)*\.\.\/api\//,
  /from ['"].*apps\/api\/src/,
  /from ['"].*packages\/application\/payments/,
  /from ['"].*packages\/domain\/payments/,
  /from ['"].*packages\/infrastructure\/payments/,
  /from ['"].*packages\/application\/orders/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === 'coverage' || name === '.turbo') continue;
      out.push(...walk(p));
    }
    else out.push(p);
  }
  return out;
}
function textFiles(dir: string): string[] { return existsSync(dir) ? walk(dir).filter((f) => /\.(ts|tsx|js|mjs|json|md)$/.test(f)) : []; }
function check(name: string, ok: boolean, details: string[] = []): CheckResult { return { name, ok, details }; }

const results: CheckResult[] = [];
const serviceFiles = textFiles(serviceSrc);
const forbiddenHits = serviceFiles.flatMap((file) => {
  const rel = relative(root, file);
  const content = readFileSync(file, 'utf8');
  return forbiddenImportPatterns.some((pattern) => pattern.test(content)) ? [rel] : [];
});
results.push(check('no forbidden embedded runtime imports', forbiddenHits.length === 0, forbiddenHits));

const repoFiles = textFiles(join(serviceSrc, 'infrastructure/repositories'));
const sharedSchemaHits = repoFiles.flatMap((file) => {
  const content = readFileSync(file, 'utf8');
  return content.includes('shared/schema') ? [relative(root, file)] : [];
});
results.push(check('repositories use service-local schema module', sharedSchemaHits.length === 0, sharedSchemaHits));

const schemaContent = readFileSync(join(serviceSrc, 'infrastructure/schema.ts'), 'utf8');
results.push(check('service schema is not a shared re-export bridge', !schemaContent.includes('shared/schema') && schemaContent.includes('pgTable')));

results.push(check('standalone migrations exist', existsSync(join(root, 'apps/payment-orchestration-service/migrations/0001_payment_orchestration_initial.sql'))));
results.push(check('worker runner exists', existsSync(join(root, 'apps/payment-orchestration-service/src/workers/run.ts'))));
results.push(check('ready endpoint exists', readFileSync(join(root, 'apps/payment-orchestration-service/src/routes/health.ts'), 'utf8').includes('/ready')));

for (const pkg of [
  'packages/payment-orchestration-core/package.json',
  'packages/payment-orchestration-client-sdk/package.json',
  'apps/payment-orchestration-service/package.json',
]) {
  results.push(check(`required package file ${pkg}`, existsSync(join(root, pkg))));
}

const extractionRoots = [
  'apps/payment-orchestration-service',
  'packages/payment-orchestration-core',
  'packages/payment-orchestration-client-sdk',
];
const randomAssets = extractionRoots.flatMap((dir) => textFiles(join(root, dir)).filter((file) => /(?:^|\/)(dist|coverage|\.turbo|logs)(?:\/|$)|\.(log|png|jpg|jpeg|gif|webp)$/.test(relative(root, file))));
results.push(check('no random assets/logs/build outputs in extraction set', randomAssets.length === 0, randomAssets.map((f) => relative(root, f))));

// ── Phase 8K: Contract/Deployment files ───────────────────────────────────────

// Error codes doc
results.push(check(
  'Phase 8K: error codes doc exists',
  existsSync(join(root, 'docs/payment-orchestration-error-codes.md')),
));

// SDK contract doc
results.push(check(
  'Phase 8K: SDK contract doc exists',
  existsSync(join(root, 'docs/payment-orchestration-sdk-contract.md')),
));

// API contract doc
results.push(check(
  'Phase 8K: API contract doc exists',
  existsSync(join(root, 'docs/payment-orchestration-api-contract.md')),
));

// OpenAPI spec
const openApiPath = join(root, 'docs/openapi/payment-orchestration.openapi.json');
let openApiValid = false;
if (existsSync(openApiPath)) {
  try {
    const parsed = JSON.parse(readFileSync(openApiPath, 'utf8'));
    openApiValid = parsed?.openapi === '3.1.0' && typeof parsed?.info?.version === 'string';
  } catch {}
}
results.push(check('Phase 8K: OpenAPI spec exists and is valid JSON', openApiValid));

// Deployment guide
results.push(check(
  'Phase 8K: deployment guide exists',
  existsSync(join(root, 'docs/payment-orchestration-deployment.md')),
));

// Worker operations guide
results.push(check(
  'Phase 8K: worker operations guide exists',
  existsSync(join(root, 'docs/payment-orchestration-worker-operations.md')),
));

// Standalone repo layout
results.push(check(
  'Phase 8K: standalone repo layout doc exists',
  existsSync(join(root, 'docs/payment-orchestration-standalone-repo-layout.md')),
));

// .env.example
const envExamplePath = join(root, 'apps/payment-orchestration-service/.env.example');
const envExampleExists = existsSync(envExamplePath);
results.push(check('Phase 8K: .env.example exists', envExampleExists));

// .env.example must not contain real secrets (no raw API keys, no real passwords)
if (envExampleExists) {
  const envContent = readFileSync(envExamplePath, 'utf8');
  const secretLeaks = [];
  // Reject if any line has a real-looking secret on the right side of =
  // Allow placeholder values containing 'replace', 'example', 'your', placeholders
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [, value] = trimmed.split('=').map(s => s.trim());
    if (!value) continue;
    // Flag if it looks like a real key (long hex/base64, not a placeholder)
    if (/^[0-9a-f]{32,}$/i.test(value) && !/replace|example|your|placeholder/i.test(value)) {
      secretLeaks.push(trimmed);
    }
  }
  results.push(check('Phase 8K: .env.example contains no real secrets', secretLeaks.length === 0, secretLeaks));
} else {
  results.push(check('Phase 8K: .env.example contains no real secrets', false, ['.env.example missing']));
}

// Dockerfile
results.push(check(
  'Phase 8K: Dockerfile exists',
  existsSync(join(root, 'apps/payment-orchestration-service/Dockerfile')),
));

// apiErrorResponse helper in routes/utils.ts
const utilsContent = readFileSync(join(serviceSrc, 'routes/utils.ts'), 'utf8');
results.push(check(
  'Phase 8K: apiErrorResponse helper in routes/utils.ts',
  utilsContent.includes('export function apiErrorResponse'),
));

// Error envelope is nested in middleware/errors.ts
const middlewareContent = readFileSync(join(serviceSrc, 'middleware/errors.ts'), 'utf8');
results.push(check(
  'Phase 8K: error middleware uses nested error envelope',
  middlewareContent.includes('"error":') || middlewareContent.includes("'error':") || middlewareContent.includes('error: {'),
));

// SDK has refreshProviderStatus
const sdkClientPath = join(root, 'packages/payment-orchestration-client-sdk/src/client.ts');
const sdkClientContent = existsSync(sdkClientPath) ? readFileSync(sdkClientPath, 'utf8') : '';
results.push(check(
  'Phase 8K: SDK has refreshProviderStatus method',
  sdkClientContent.includes('refreshProviderStatus'),
));

// SDK has getReadiness
results.push(check(
  'Phase 8K: SDK has getReadiness method',
  sdkClientContent.includes('getReadiness'),
));

// Phase 8K config phase
const envTsPath = join(serviceSrc, 'config/env.ts');
const envTsContent = existsSync(envTsPath) ? readFileSync(envTsPath, 'utf8') : '';
results.push(check(
  'Phase 8K: config phase is 8K',
  envTsContent.includes("'8K'"),
));

// Phase 8K config version
results.push(check(
  'Phase 8K: config version is 0.3.0',
  envTsContent.includes("'0.3.0'"),
));

const ok = results.every((r) => r.ok);
process.stdout.write(`${JSON.stringify({ ok, results }, null, 2)}\n`);
if (!ok) process.exitCode = 1;
