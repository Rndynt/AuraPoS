import type {
  InventorySyncErrorPort,
  InventorySyncErrorRecord,
  RecordInventorySyncErrorInput,
} from '@pos/application/inventory/ports';
import { errorMessage } from '@pos/application/inventory/inventorySyncErrors';
import type { TransactionContext } from '@pos/application/shared/ports';
import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import { inventorySyncErrors } from '../../../../shared/schema';
import { db, type DbClient } from '../../database';
import { DrizzleUnitOfWork } from '../../unit-of-work';

function toInventorySyncErrorRecord(record: unknown): InventorySyncErrorRecord {
  return record as InventorySyncErrorRecord;
}

export class DrizzleInventorySyncErrorRepository implements InventorySyncErrorPort {
  constructor(private readonly database = db) {}

  private client(context?: TransactionContext): DbClient {
    return DrizzleUnitOfWork.fromContext(context) ?? this.database;
  }

  async recordInventorySyncError(
    input: RecordInventorySyncErrorInput,
    context?: TransactionContext,
  ): Promise<InventorySyncErrorRecord> {
    const [record] = await this.client(context)
      .insert(inventorySyncErrors)
      .values({
        tenantId: input.tenantId,
        outletId: input.outletId ?? null,
        orderId: input.orderId ?? null,
        productId: input.productId ?? null,
        operation: input.operation,
        status: 'pending',
        payload: input.payload as any,
        lastError: errorMessage(input.error),
        retryCount: 0,
        nextRetryAt: input.nextRetryAt ?? new Date(),
      })
      .returning();

    return toInventorySyncErrorRecord(record);
  }

  async markInventorySyncErrorRetrying(
    id: string,
    context?: TransactionContext,
  ): Promise<InventorySyncErrorRecord | undefined> {
    const [record] = await this.client(context)
      .update(inventorySyncErrors)
      .set({ status: 'retrying', updatedAt: new Date() })
      .where(eq(inventorySyncErrors.id, id))
      .returning();
    return record ? toInventorySyncErrorRecord(record) : undefined;
  }

  async markInventorySyncErrorResolved(
    id: string,
    context?: TransactionContext,
  ): Promise<InventorySyncErrorRecord | undefined> {
    const [record] = await this.client(context)
      .update(inventorySyncErrors)
      .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(inventorySyncErrors.id, id))
      .returning();
    return record ? toInventorySyncErrorRecord(record) : undefined;
  }

  async markInventorySyncErrorFailed(
    id: string,
    error: unknown,
    retryDelayMs: number,
    maxRetries: number,
    context?: TransactionContext,
  ): Promise<InventorySyncErrorRecord | undefined> {
    const [record] = await this.client(context)
      .update(inventorySyncErrors)
      .set({
        status: sql`CASE WHEN ${inventorySyncErrors.retryCount} + 1 >= ${maxRetries} THEN 'failed' ELSE 'pending' END` as any,
        retryCount: sql`${inventorySyncErrors.retryCount} + 1` as any,
        lastError: errorMessage(error),
        nextRetryAt: new Date(Date.now() + retryDelayMs),
        updatedAt: new Date(),
      })
      .where(eq(inventorySyncErrors.id, id))
      .returning();
    return record ? toInventorySyncErrorRecord(record) : undefined;
  }

  async listDueInventorySyncErrors(
    limit: number,
    context?: TransactionContext,
  ): Promise<InventorySyncErrorRecord[]> {
    const records = await this.client(context)
      .select()
      .from(inventorySyncErrors)
      .where(
        and(
          eq(inventorySyncErrors.status, 'pending'),
          lte(inventorySyncErrors.nextRetryAt, new Date()),
          isNull(inventorySyncErrors.resolvedAt),
        ),
      )
      .orderBy(asc(inventorySyncErrors.createdAt))
      .limit(limit);
    return records.map(toInventorySyncErrorRecord);
  }
}
