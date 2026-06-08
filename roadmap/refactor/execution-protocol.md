# Refactor Execution Protocol

Status: mandatory
Applies to: every architecture refactor phase in `roadmap/refactor`

## Purpose

This protocol prevents coding agents from doing broad, unsafe, or out-of-order refactors.

## Mandatory sequence

For every phase, the agent must:

1. Read `roadmap/refactor/main.md`.
2. Read the current phase document.
3. Inspect current code before editing.
4. Write a short affected-file list in the phase notes.
5. Implement only the current phase scope.
6. Preserve public API behavior.
7. Preserve cash and standard POS payment behavior when touching order/payment code.
8. Preserve partial payment behavior when touching payment code.
9. Preserve offline/KDS/CFD behavior when touching related files.
10. Run the validation commands listed in the phase.
11. Record validation results in the phase notes.
12. Commit only the current phase.
13. Stop after commit and wait for user approval.

## Forbidden behavior

Agents must not:

- jump phases
- combine backend architecture refactor with frontend POS split unless phase allows it
- rename endpoints without compatibility
- change DB schema outside schema phase
- delete compatibility exports before imports are migrated
- remove cash/standard POS payment flow
- weaken tenant/outlet isolation
- hide failing tests by deleting or weakening validation
- claim success without running or recording validation

## Required phase note format

Each phase implementation must update its phase document with:

```md
## Execution notes

Commit: <sha or pending>
Date: <date>

### Affected files

- path/to/file

### Validation results

- `pnpm type-check`: pass/fail/not run, reason
- phase-specific command: pass/fail/not run, reason

### Behavior preservation notes

- API contract changed: yes/no
- DB schema changed: yes/no
- Cash payment affected: yes/no
- Partial payment affected: yes/no
- Offline/KDS/CFD affected: yes/no

### Follow-up risks

- item
```

## Stop conditions

Stop immediately if:

- validation fails for reasons not scoped to the phase
- required behavior becomes ambiguous
- a change requires DB migration outside P7
- a public endpoint rename is required
- cash/standard payment behavior becomes at risk
- partial payment/idempotency/transaction safety becomes at risk

When stopped, document the blocker and do not continue to the next phase.
