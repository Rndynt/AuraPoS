---
name: Tenant ID design decision
description: Why tenants.id stays as varchar slug, not UUID
---

## Rule
`tenants.id` is a human-readable slug (e.g. "thamada", "kopinusantara", "demo-tenant").
It MUST remain `varchar` type in both the DB and Drizzle schema.

**Why:** Tenants are created with explicit slug IDs for readability, URL-friendliness, and easy switching in development (CURRENT_TENANT_ID in packages/core/tenant.ts). Changing to UUID would break tenant switching and all seed/fixture data.

## How to apply
- In schema.ts: `tenants` table uses `varchar("id").primaryKey()` (no default — always explicit)
- All `tenant_id` FK columns in other tables also stay `varchar` (referencing the slug)
- In migrations: never include `tenants.id` or `tenant_id` columns in UUID type conversions
- user.id (Better Auth managed) also stays varchar
