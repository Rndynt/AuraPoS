---
name: UUID column migration
description: How FK constraints are named in this project and how to safely migrate varchar PK/FK columns to uuid type
---

## Rule
Drizzle ORM generates FK constraint names as `{table}_{col}_{ref_table}_{ref_col}_fk`, NOT PostgreSQL's default `{table}_{col}_fkey`.

**Why:** The project uses Drizzle ORM migrations which apply its own naming convention. When doing ALTER TABLE migrations that require dropping FK constraints, always try BOTH name patterns with `IF EXISTS` to handle both old and new constraints.

## How to apply
When writing a migration that alters a column type that is referenced by FK constraints:
1. DROP both `{table}_{col}_{ref_table}_{ref_col}_fk` AND `{table}_{col}_fkey` with IF EXISTS
2. ALTER the column types
3. Re-add FK constraints with explicit names

## Fix for bad outlet IDs (slug → UUID)
Use INSERT new UUID row + cascade-update all FK children + DELETE old row.
Do NOT use UPDATE on the PK directly — PostgreSQL FK constraints block in-place PK updates.
The temp slug trick: set slug = '__migrating_' + new_uuid during insert to avoid unique constraint on (tenant_id, slug), then restore after delete.
