# AGENTS.md — AuraPoS Agent Rules

This file is the permanent instruction file for AI coding agents working in this repository.

The expected filename is `AGENTS.md`. Do not rename it to lowercase.

---

## 1. Core Rule

The agent must follow the user's actual task while protecting:

- security
- secrets
- tenant isolation
- payment/order data integrity
- existing architecture
- build/type/test stability
- documentation accuracy

If the user asks to execute a checklist, roadmap, audit document, backlog, issue list, TODO list, or implementation plan, the agent must not stop after one small item. The agent must execute the tasklist dynamically and continue to the next safe actionable task automatically.

---

## 2. Priority Order

When instructions conflict, follow this order:

1. Safety, security, secrets, data integrity, and tenant isolation
2. Explicit user instruction for the current task
3. Existing production behavior and architecture
4. Active plan in `PLANS.md`, if relevant
5. Project documentation under `docs/`
6. This `AGENTS.md`
7. Checklist/tasklist documents
8. Agent assumptions

If the user explicitly says to execute all tasks, continue all tasks, implement the checklist, or do not work one-by-one, then Dynamic Tasklist Execution Mode is active.

---

## 3. Required Startup Behavior

Before coding, the agent must read:

1. `AGENTS.md`
2. `PLANS.md` if it exists
3. `README.md`
4. the active tasklist/checklist/roadmap/audit document mentioned by the user
5. relevant files under `docs/`
6. relevant source files before creating or changing code

The agent must inspect existing implementation before adding new logic.

Do not duplicate existing code.

---

## 4. PLANS.md / ExecPlan Rule

For any broad, multi-step, multi-file, or risky task, the agent must use `PLANS.md` as the execution plan.

Use `PLANS.md` when the task involves:

- many checklist items
- multiple modules
- frontend and backend changes
- database/schema changes
- auth/RBAC
- tenant isolation
- order/payment/refund/inventory/reporting logic
- documentation synchronization
- large refactor
- testing strategy
- unknown implementation status

The agent must:

1. Read `PLANS.md` before starting.
2. Create or update the active plan section.
3. List task phases.
4. Track completed, partial, blocked, and not attempted tasks.
5. Update the plan after each meaningful implementation phase.
6. Keep the plan honest.
7. Do not mark work complete unless code and validation support it.

If `PLANS.md` does not exist, create it using the structure in this repository.

---

## 5. Normal Task Mode

For normal small tasks:

- keep changes focused
- avoid unrelated refactors
- follow existing architecture
- run relevant validation
- update docs if behavior changes

This mode is only for narrow tasks.

If the user asks to execute a tasklist or checklist, do not use Normal Task Mode. Use Dynamic Tasklist Execution Mode.

---

## 6. Dynamic Tasklist Execution Mode

This mode applies when the user asks to execute tasks from:

- checklist
- audit document
- roadmap
- TODO file
- backlog
- implementation plan
- sprint list
- milestone list
- GitHub issue list
- copied task description
- markdown tasklist

The agent must treat the mentioned document as the active execution source.

The agent must dynamically read the tasklist structure. Do not hardcode only P0/P1. The document may use:

- P0 / P1 / P2 / P3
- Sprint 1 / Sprint 2 / Sprint 3
- Phase 1 / Phase 2 / Phase 3
- Milestone
- TODO
- Checklist
- Roadmap
- Priority labels
- section order only

Execution rules:

1. Read the full active tasklist before coding.
2. Read `PLANS.md` and update it with an execution plan.
3. Detect task groups, priorities, dependencies, blockers, affected files, and validation needs.
4. Execute in this order:
   - security/data-integrity/tenant-isolation risks
   - build/type/test blockers
   - dependency prerequisites
   - highest priority actionable tasks
   - lower priority tasks after higher priority work is stable
5. Do not stop after one checklist item.
6. Continue to the next safe actionable task automatically.
7. Do not ask the user what to do next unless genuinely blocked.
8. If a task is too large, split it into safe phases and continue.
9. If a task is blocked, document the blocker and continue another safe task.
10. Do not mark a task complete unless implementation exists and validation was attempted.
11. Update the source checklist honestly.

Checklist status rules:

- `[x]` means implemented and validated.
- `[ ]` means not implemented.
- Partial work stays `[ ]` with a note.
- Blocked work stays `[ ]` with blocker reason.
- Do not delete unfinished checklist items.

---

## 7. Subagent / Spawn Agent Rules

When the task is broad, multi-file, or touches independent areas, the agent must use subagents if the environment supports them.

Spawn subagents for separate workstreams such as:

- backend/API
- database/schema/migrations
- frontend/UI
- tests/validation
- documentation
- security/tenant isolation
- payment/order lifecycle
- inventory/reporting
- auth/RBAC

Use subagents when:

1. the tasklist has many independent sections
2. the codebase is large
3. multiple modules must be audited
4. frontend and backend changes are both needed
5. documentation must be synchronized
6. tests must be designed while code is inspected
7. security or tenant isolation is involved

Each subagent must return:

- files inspected
- findings
- recommended changes
- risks
- validation needed
- documentation that must be updated

The main agent must merge all subagent findings into one implementation plan in `PLANS.md`.

If the environment does not support real subagents, simulate them as named workstreams:

- Backend workstream
- Frontend workstream
- Database workstream
- Tests workstream
- Documentation workstream
- Security workstream

Do not use lack of real subagent support as a reason to stop. Continue with simulated workstreams.

---

## 8. Documentation Sync Rules

Documentation must stay synchronized with actual code.

Update documentation when a change affects:

- public API behavior
- request body
- response body
- error shape
- database schema
- migrations
- domain lifecycle
- business rules
- auth/session/JWT
- RBAC/permissions
- tenant isolation
- payment logic
- order lifecycle
- refund/void flow
- inventory logic
- reporting logic
- audit logs
- frontend user flow
- environment variables
- setup commands
- build/test/deploy commands
- feature status

Depending on the change, update:

1. active tasklist/checklist document
2. relevant docs under `docs/`
3. `README.md` only if setup, commands, env, or main behavior changed
4. API docs if endpoint behavior changed
5. schema/migration docs if database changed
6. `PLANS.md` execution progress

Documentation honesty rules:

The agent must not:

- claim production-ready unless validation proves it
- mark mock/static features as complete
- hide partial implementation
- delete known limitations unless actually fixed
- write docs that contradict code
- update only the checklist while ignoring affected docs
- mark `[x]` just because work started

Use honest status wording:

- Implemented
- Partially implemented
- Blocked
- Not implemented
- Implemented but not covered by automated tests
- Validated with type-check
- Validated with build
- Pending integration tests

---

## 9. Progress Report Format

At the end of every tasklist execution batch, the agent must report:

## Execution Summary

### Completed
- [x] Task name
  - Files changed:
  - What changed:
  - Validation:

### Partially Completed
- [ ] Task name
  - Completed part:
  - Remaining work:
  - Reason not fully complete:

### Blocked
- [ ] Task name
  - Blocker:
  - Required next step:

### Not Attempted
- [ ] Task name
  - Reason:

### Validation
- Command:
- Result:
- Notes:

### Documentation Updated
- File:
- What was updated:

### PLANS.md Updated
- Section:
- What changed:

### Recommended Next Batch
- Next safest task:
- Why:

The agent must also update the source checklist and `PLANS.md` when appropriate.

---

## 10. Development Rules

Follow the existing architecture.

Prefer separation between:

- domain/business logic
- application/use cases
- infrastructure/repositories/database
- API routes/controllers
- frontend UI/hooks/client code

Do not put business logic randomly inside route handlers if a use case/service already exists.

Do not duplicate existing logic.

Search first.

Do not add large dependencies for simple tasks.

Do not reformat the entire codebase just for style.

Do not perform massive folder restructures unless explicitly requested.

---

## 11. Multi-Tenant Rules

AuraPoS is multi-tenant. Tenant isolation is mandatory.

Rules:

1. Do not hardcode tenant IDs in production code.
2. Tenant must come from request/session/token/context.
3. Any tenant-owned database read/update/delete must filter by tenant.
4. Do not allow cross-tenant access by ID guessing.
5. Payment, order, table, product, report, inventory, and staff data must be tenant-aware.
6. If a mutation touches tenant-owned data, validate ownership.
7. If tenant isolation cannot be guaranteed, block the task or implement the missing guard first.
8. Add tests for cross-tenant access when practical.

---

## 12. Security Rules

Never commit:

- API keys
- passwords
- tokens
- private keys
- secrets
- real credentials

Security-sensitive operations must validate permission when auth/RBAC exists or is being added.

Sensitive operations include:

- payment
- refund
- void
- order close
- inventory adjustment
- employee management
- tenant settings
- reporting/export
- role assignment
- data deletion

Do not remove validation just to make tests pass.

Do not bypass auth or tenant middleware unless the code is explicitly test/demo-only and clearly documented.

---

## 13. Payment and Order Integrity Rules

Any task touching order/payment must be handled carefully.

Rules:

1. Avoid orphaned orders.
2. Avoid duplicate payments.
3. Avoid overpayment from race conditions.
4. Prefer DB transactions for create+pay and record-payment flows.
5. Use idempotency keys where retry is possible.
6. Validate payment amount, currency, method, tenant, and order ownership.
7. Do not let kitchen/fulfillment actions close financial settlement unless explicitly designed.
8. Keep fulfillment status and payment status conceptually separate.
9. Do not claim atomicity unless DB transaction or equivalent consistency guarantee exists.

---

## 14. Testing and Validation

AuraPoS uses pnpm.

Prefer these commands when relevant:

- pnpm type-check
- pnpm build
- pnpm test
- pnpm lint

Run the most relevant validation after changes.

If validation cannot be run, document why.

Do not claim validation passed if it was not run.

If a command fails:

1. inspect the failure
2. determine whether the change caused it
3. fix if related
4. document unrelated pre-existing failures honestly

Do not delete tests to make validation pass.

---

## 15. Git and Commit Rules

If commits are allowed:

- use small logical commits
- prefer clear commit messages
- do not mix unrelated changes
- do not force-push unless explicitly requested

Good commit examples:

- fix: enforce tenant-aware table status updates
- feat: add transaction-safe create-and-pay flow
- test: cover cross-tenant order access
- docs: sync order lifecycle documentation

If commits are not allowed, provide a clear summary of changed files and conceptual diff.

---

## 16. Project-Specific Rules: AuraPoS

AuraPoS-specific rules:

1. Use pnpm as the package manager.
2. Use Turbo workspace orchestration where configured.
3. Avoid mixing npm, yarn, and pnpm.
4. Follow existing monorepo structure:
   - apps/api
   - apps/pos-terminal-web
   - apps/web
   - packages/domain
   - packages/application
   - packages/infrastructure
   - packages/core
   - shared
   - docs
5. POS terminal uses React, Vite, wouter, and React Query. Preserve existing patterns.
6. Follow existing layout patterns such as MainLayout and UnifiedBottomNav when changing POS UI.
7. Follow design_guidelines.md when changing UI/UX if the file exists.
8. Do not change auth/login/register unless the user asks or the active tasklist requires it.
9. When touching order/payment logic, respect tenant feature flags such as:
   - partial_payment
   - kitchen_ticket
10. Validate order type before saving payment/order behavior.
11. Keep restaurant pay-later workflow valid unless the task explicitly changes it.
12. Do not treat unpaid fulfillment as automatically invalid. Dine-in may be served before payment.
13. Financial close/settlement must be stricter than kitchen/fulfillment status.

---

## 17. Agent Completion Rules

Before finishing, the agent must provide:

1. summary of completed work
2. files changed
3. validation commands and results
4. docs updated
5. `PLANS.md` updated
6. incomplete/blocked tasks
7. next recommended batch

The agent must not end with vague statements like:

- done
- fixed
- should work

The final response must be specific and traceable.

---

## 18. When Blocked

If blocked, the agent must explain:

1. exact blocker
2. affected task
3. why it cannot safely continue that task
4. what was completed before the blocker
5. what task it continued with instead, if possible

The agent should continue with another safe actionable task when possible.

Do not stop the whole run just because one task is blocked.

---

## 19. User Intent Triggers

If the user says:

- kerjakan semua task
- execute semua checklist
- lanjutkan semua yang belum
- bereskan tasklist
- implement semua di dokumen
- jangan satu-satu
- continue sampai selesai
- buat semua sesuai tasklist
- update semua checklist
- audit lalu implement

then Dynamic Tasklist Execution Mode is active.

In that mode, the agent must:

1. read the active tasklist
2. read or update `PLANS.md`
3. spawn subagents if supported
4. otherwise simulate subagents as workstreams
5. continue through the tasklist automatically
6. update documentation accurately
7. update the source checklist honestly
8. stop only when blocked or when no more safe actionable tasks remain in the current run
EOF

cat > PLANS.md <<'EOF'
# PLANS.md — AuraPoS Execution Plans

This file is used by AI coding agents to plan, track, and continue broad implementation work.

Agents must update this file when executing large tasklists, audit documents, roadmaps, or multi-step implementation requests.

Do not use this file as fake progress. Keep it honest and synchronized with code.

---

## Active Plan Template

Use this structure for every broad task.

## Plan: <task or document name>

### Source

- Tasklist:
- User request:
- Date started:
- Current status:

### Goal

Describe the real goal of this execution batch.

### Context Read

- [ ] AGENTS.md
- [ ] PLANS.md
- [ ] README.md
- [ ] Active tasklist/checklist
- [ ] Relevant docs
- [ ] Relevant source files

### Workstreams

Use real subagents if supported. If not supported, simulate these as internal workstreams.

#### Backend/API Workstream

- Scope:
- Files inspected:
- Findings:
- Tasks:
- Risks:
- Validation:

#### Database/Schema Workstream

- Scope:
- Files inspected:
- Findings:
- Tasks:
- Risks:
- Validation:

#### Frontend/UI Workstream

- Scope:
- Files inspected:
- Findings:
- Tasks:
- Risks:
- Validation:

#### Tests/Validation Workstream

- Scope:
- Files inspected:
- Findings:
- Tasks:
- Risks:
- Validation:

#### Documentation Workstream

- Scope:
- Files inspected:
- Findings:
- Tasks:
- Risks:
- Validation:

#### Security/Tenant Isolation Workstream

- Scope:
- Files inspected:
- Findings:
- Tasks:
- Risks:
- Validation:

### Execution Order

1. Safety/security/data-integrity/tenant-isolation blockers
2. Build/type/test blockers
3. Dependency prerequisites
4. Highest priority actionable tasks
5. Lower priority actionable tasks
6. Documentation sync
7. Validation
8. Final checklist update

### Progress

#### Completed

- [ ] Task:
  - Files changed:
  - Validation:
  - Docs updated:

#### Partially Completed

- [ ] Task:
  - Completed:
  - Remaining:
  - Reason:

#### Blocked

- [ ] Task:
  - Blocker:
  - Required next step:

#### Not Attempted

- [ ] Task:
  - Reason:

### Validation Log

- Command:
- Result:
- Notes:

### Documentation Updates

- File:
- Change:

### Checklist Updates

- File:
- Change:

### Continuation Notes

Write exactly where the next agent should continue.

---

## Active Plans

Add new active plans below this line.
