# agents.md – Global Rules for All Projects

This document acts as a **permanent system prompt** and **global rulebook** for all AI agents and human contributors working in this repository.

Do **not** delete this file. Any major change to this document must be intentional and well-understood.

---

## 0. Priority & Context Hierarchy

When making decisions or changes in this project, the **order of priority** is:

1. Existing **codebase and architecture**  
   (current behavior that is already running in production / main branch)
2. **Architecture and specification documents**, such as:  
   - `README.md`  
   - Files under `docs/` (if any)  
   - Other domain or architecture docs (e.g. `ARCHITECTURE.md`, `API_SPEC.md`)
3. **This file – `agents.md`**  
   (global rules for agents and contributors)
4. **Task/feature tracking documents**, such as:  
   - `features_checklist.md`  
   - Other task lists or specification files
5. **Incoming task instructions**  
   (chat instructions, tickets, issues, ad-hoc requests)

If a task instruction conflicts with rules in this file, the agent MUST:

- Detect and **explain** the conflict, and  
- Choose the solution that is **safest** and **least damaging** to the existing architecture and behavior,  
  unless the user explicitly accepts the trade-off.

---

## 1. General Development Principles

All changes (by humans or AI agents) must follow these principles:

1. **Minimal & Focused**
   - Aim to complete 1–2 clear goals per session / commit.
   - Avoid giant refactors if the user only requested a small fix.

2. **Prefer Backward Compatibility**
   - Do not change existing production behavior without a strong reason.
   - If a breaking change is necessary, document it clearly and visibly.

3. **Explicit Over Implicit**
   - It is better for code to be slightly longer but clear in intent.
   - Avoid hidden “magic” that is difficult to trace.

4. **Test-Aware / Test-Driven When Possible**
   - If tests already exist, do not “fix” failures by deleting the tests.
   - When adding important features, try to add or update tests.

5. **Consistency of Style**
   - Follow the patterns and conventions already used in this repository:
     - Naming
     - Folder structure
     - Framework usage
   - Do not import random styles from other projects if they conflict.

6. **Security & Data Protection**
   - Never commit secrets, API keys, tokens, or passwords.
   - Always validate external input and check permissions when user/role context exists.

---

## 2. Required Behavior for All AI Agents

Every AI agent working on this repository MUST follow this workflow:

1. **Initialize Context**
   - Read `README.md`.
   - Read this file: `agents.md` from top to bottom.
   - If present, read `features_checklist.md`.
   - Read any obviously relevant files under `docs/`.

2. **Understand the Task**
   - Summarize the task internally in 2–5 bullet points:
     - What is being requested?
     - Which parts of the codebase are likely involved?
     - Are there high-risk areas (security, multi-tenant, billing, etc.)?

3. **Locate Relevant Code**
   - Search for the most relevant existing modules/components before writing new ones.
   - Respect boundaries already defined in the project (domain/app/infra, etc.).

4. **Check for Duplicate Work**
   - Look at `features_checklist.md` (or similar) to see if the task is already done or in progress.
   - Review recent commits/history if available to see if a similar change was recently made.
   - If the work has already been done:
     - Verify the implementation.
     - Fix issues or gaps instead of duplicating.

5. **Plan Before Coding**
   - Write a short internal plan:
     - Which files will be changed or created?
     - What types of changes (new functions, endpoints, small refactors)?
   - Avoid touching unrelated areas of the code.

6. **Apply Changes**
   - Implement the minimal changes needed to solve the task.
   - Avoid large-scale refactors unless explicitly requested.

7. **Run or Simulate Tests (When Possible)**
   - If test commands or scripts exist (e.g., `npm test`, `phpunit`, etc.), run them.
   - If tests cannot be executed, at least:
     - Ensure imports/types are correct.
     - Manually check main logic branches for obvious errors.

8. **Update Documentation & Checklists**
   - If behavior or APIs are changed:
     - Update `features_checklist.md` or the relevant task tracking file.
     - Add or adjust notes in `README.md` / `docs/` if the change is conceptual or significant.

9. **Summarize Changes**
   - Before finishing, create a concise summary:
     - Which files were changed.
     - What behavior has been added/modified.
     - Any known impact or risk to other parts of the system.

10. **Do Not Remove / Weaken Core Rules**
    - Do not delete or significantly alter key rules in `agents.md` without explicit instructions.
    - For major changes to this file, clearly describe what changed and why.

---

## 3. Important Context Files (When Present)

Agents must recognize and respect the following files and directories:

- `README.md` – general project overview and how to run it.
- `agents.md` – this file, global rules for agents and contributors.
- `features_checklist.md` – feature list and implementation status.
- `docs/` – architecture, domain, and API documentation.
- API definition files (e.g., OpenAPI/Swagger specs).
- `*.env.example` – example environment variables allowed in documentation.

These files **must not** be deleted or drastically changed without explicit instruction.

---

## 4. Generic Architecture Conventions

These rules are generic and may be applied to any project unless they conflict with explicit project-specific architecture.

1. **Separate Concerns**
   - Keep a clear separation between:
     - Domain / business logic.
     - Application layer (controllers, handlers, use cases).
     - Infrastructure (database, HTTP server, message queue, file storage, etc.).

2. **One-Way Dependencies**
   - Domain should not depend directly on frameworks (Laravel, Express, Next.js, etc.) when possible.
   - Preferred dependency direction:  
     domain ← application ← infrastructure / UI.

3. **Error Handling**
   - Use meaningful error types/messages, not generic strings.
   - Log important errors in a consistent place.
   - Avoid exposing sensitive technical details to clients.

4. **Logging**
   - Avoid excessive logging in production.
   - Never log sensitive data (passwords, tokens, card numbers, etc.).

5. **Configuration**
   - Environment-specific values must be in configuration or environment variables, not hardcoded.
   - Keep configuration centralized and discoverable.

---

## 5. Multi-Tenant & Configuration Rules (If Project Is Multi-Tenant)

If this project supports multiple tenants, the following rules are **mandatory**:

1. **No Hardcoded Tenant IDs**
   - Never hardcode a tenant ID in source code.
   - Tenant must always come from:
     - Request/session/token context, or
     - A dedicated mechanism such as a `CURRENT_TENANT_ID` variable or similar.

2. **Tenant Data Isolation**
   - Every database query/update/delete that deals with tenant data must:
     - Filter by tenant, or
     - Use a tenant-aware abstraction.
   - Do not mix data from different tenants unless it is by design and clearly documented.

3. **Tenant Boundaries**
   - Domain functions that depend on tenant context should:
     - Receive tenant/context explicitly as a parameter, or
     - Use a well-defined context mechanism (not random global state).

4. **Migrations & Seeders**
   - Seeders for demo or test environments can create multiple tenants,
     but production should not rely on hardcoded demo tenants.
   - If changing multi-tenant structure (e.g. adding `tenant_id`), document the impact.

---

## 6. Minimal Security Practices

These rules apply to all project types (web, API, CLI, etc.):

1. **Input Validation**
   - Do not trust external input.
   - Validate:
     - Types
     - Length
     - Formats
     - Value ranges

2. **Authentication & Authorization**
   - If users/roles/tenants exist:
     - Check permissions for critical operations (update, delete, financial transactions, etc.).
   - Do not bypass auth or security middleware unless explicitly for testing and clearly marked.

3. **Secrets & Credentials**
   - API keys, tokens, passwords, and other secrets must only exist in:
     - Environment variables, or
     - A dedicated secret manager.
   - Never commit secrets to the repository, even in comments.

4. **Dependencies**
   - Avoid adding large dependencies for trivial tasks.
   - Prefer libraries that are:
     - Well maintained
     - Popular / widely used
     - Licensed appropriately

---

## 7. Git & Commits

If an agent is allowed to create commits or pull requests:

1. **Small, Focused Commits**
   - Each commit should represent a logical change:
     - A bugfix
     - A single feature
     - A specific refactor
   - Avoid mixing unrelated changes in one commit.

2. **Clear Commit Messages**
   - Use short, descriptive messages such as:
     - `fix: handle null price in product card`
     - `feat: add tenant-aware order listing`
     - `refactor: extract payment service interface`

3. **Do Not Rewrite Shared History**
   - Do not force-push or rewrite shared history without explicit instructions.

If the agent cannot create commits:

- Provide a clear summary of which files to change and how.
- Describe the conceptual diff so a human can implement the changes safely.

---

## 8. Tests & Documentation

1. **Tests**
   - If tests fail after a change:
     - First investigate whether the new change caused the failure.
     - Do not immediately delete or disable tests.
   - If the official behavior changes:
     - Update tests so they accurately describe the new expected behavior.

2. **Documentation**
   - If changes affect:
     - Public APIs
     - Data structures
     - Domain logic
     - Architecture
     then update relevant documentation:
     - `README.md`
     - `docs/`
     - Diagrams or specs
   - For new features, consider adding a short “How to use” section:
     - Brief description
     - Example request/response (for APIs)
     - Important notes/limitations

---

## 9. Actions Agents MUST NOT Take (Unless Explicitly Requested)

Agents must **not** do the following unless there is a very explicit request and the consequences are understood:

1. Delete or significantly weaken core rules in `agents.md`.
2. Change the project’s license.
3. Add large dependencies or frameworks without a strong, explained reason.
4. Reformat the entire codebase just to change style preferences.
5. Perform massive restructures of folder hierarchy or architecture without explicit approval.
6. Disable or remove security checks, validations, or permission checks just to “make it work”.

---

## 10. Extending `agents.md` for This Specific Project

This file defines **global rules** that apply to all projects using this template.

For **project-specific rules** (domain, services, naming conventions, etc.), add them **below** this section with a new heading, for example:

## Project-Specific Rules: POS Cashier

- All modules (products, orders, tenant-features, etc.) MUST use a tenant context such as CURRENT_TENANT_ID when reading or writing data.
- Do not hardcode tenant IDs anywhere in the codebase.
- Any feature that touches payments must:
  - Validate amounts and currency.
  - Log critical failures.
  - Never skip permission checks.

(You can add more project-specific rules here.)

When adding project-specific rules:

- Ensure they do **not** silently conflict with the general rules above.  
- If they intentionally override a general rule, state it clearly so agents and contributors understand the exception.

---

## Project-Specific Rules: AuraPoS
- Gunakan **pnpm** sebagai package manager utama dan Turbo untuk orkestrasi workspace; hindari mencampur `npm`/`yarn` untuk menghindari inkonsistensi lockfile.
- Ikuti pedoman desain pada `design_guidelines.md` saat mengubah UI/UX di aplikasi POS, terutama komponen kasir.
- Fitur autentikasi/login/register tidak menjadi fokus tugas umum; jangan ubah kecuali ada instruksi eksplisit.
- POS terminal menggunakan wouter + React Query; pertahankan pola layout `MainLayout` dan `UnifiedBottomNav` untuk konsistensi lintas halaman.
- Ketika menambah/menyentuh logika order atau pembayaran, pastikan tetap menghormati flag fitur (mis. `partial_payment`, `kitchen_ticket`) dan validasi jenis order sebelum membuat/menyimpan transaksi.
