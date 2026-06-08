# P3 S1-S3 — UnitOfWork and Transaction Boundary

Status: planned
Purpose: preserve atomic order/payment/inventory behavior while removing DB knowledge from application use cases.

## Goal

Introduce a stable `UnitOfWorkPort` so transactional use cases remain safe without directly depending on Drizzle/PostgreSQL.

Critical behavior to preserve:

- Payment row locking.
- Idempotency replay.
- Partial payment remaining balance calculation.
- Atomic create-and-pay.
- Strict inventory movement inside the same transaction when required.
- No double stock deduction or reversal.

## S1 — Define transaction context

Application layer owns a framework-free abstraction:

```ts
export type TransactionContext = unknown;

export interface UnitOfWorkPort {
  transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
```

Repositories that need transaction support accept optional `tx?: TransactionContext`.

## S2 — Implement Drizzle UnitOfWork adapter

Infrastructure owns the real DB implementation:

```txt
packages/infrastructure/db/DrizzleUnitOfWork.ts
```

Responsibilities:

- Open Drizzle transaction.
- Pass transaction object as `TransactionContext`.
- Keep rollback/commit behavior unchanged.
- Avoid leaking Drizzle types back into application imports.

## S3 — Migrate transactional use cases

Primary candidates:

```txt
RecordPayment
CreateAndPayOrder
SyncOfflineOrder
ConfirmOrder inventory strict path
CancelOrder stock reversal path
```

Use cases should depend on:

```txt
UnitOfWorkPort
OrderRepositoryPort
OrderPaymentRepositoryPort
Inventory ports
OrderNumberSequencePort
```

## Hard rules

- Do not remove row-lock semantics from payment flows.
- Do not rely on in-memory concurrency tests as final proof of DB safety.
- Do not compute paid/remaining status outside the transaction if it can race.
- Do not create duplicate payments on retry with the same idempotency key.
- Do not complete operational order lifecycle automatically just because payment is paid unless existing explicit behavior requires it.

## Validation commands

```bash
pnpm --filter @pos/application type-check
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api test
pnpm type-check
```

If DB-backed tests exist, run the payment concurrency/idempotency tests. If not, add a task note for DB-backed concurrency coverage before production.

## Definition of done

- Transaction-safe use cases no longer inject raw DB clients.
- UnitOfWork adapter owns Drizzle transaction detail.
- Payment/order/inventory atomic behavior is preserved.
- Idempotency and row-lock behavior are explicitly covered by tests or documented as pending DB-backed test work.
