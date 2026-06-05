---
name: Payment provider test invocation
description: How to correctly run payment engine tests that import @pos/domain/payments and @pos/infrastructure paths.
---

## Rule
Always run payment engine tests with the tsconfig flag:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test <test-file>
```

## Why
`@pos/domain` package.json `exports` field does NOT include `./payments` subpath — only `.`, `./catalog`, `./orders`, `./pricing`, `./tenants`. The `./payments` subpath only resolves through tsconfig path aliases (`@pos/domain/*` → `./packages/domain/*`).

Without `--tsconfig apps/api/tsconfig.node.json`, tsx cannot resolve `@pos/domain/payments` and throws `ERR_PACKAGE_PATH_NOT_EXPORTED` immediately at module load.

## How to apply
- Any new test file in `apps/api/src/__tests__/` that imports from `@pos/domain/payments`, `@pos/infrastructure/payments/providers/*`, or any `@pos/*` subpath must be run with `--tsconfig apps/api/tsconfig.node.json`.
- Test files must also start with `import '../../register-paths'` (which is `apps/api/register-paths.ts`) to load tsconfig-paths at runtime.
- Note: `register-paths` is at `apps/api/register-paths.ts`, NOT at `apps/api/src/register-paths.ts`. The relative import from `apps/api/src/__tests__/` is `'../../register-paths'`.
