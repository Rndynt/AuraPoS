import type {
  StockTransferRecord,
  StockTransferItemRecord,
  StockTransferWithItems,
  StockTransferRepositoryPort,
  CreateTransferInput,
  TransferStatus,
} from '@pos/application/inventory/ports';
import { and, eq, desc, or } from 'drizzle-orm';
import { stockTransfers, stockTransferItems } from '@pos/infrastructure/db/schema';
import { db, type DbClient } from '../../database';
import { DrizzleUnitOfWork } from '../../unit-of-work';
import type { TransactionContext } from '@pos/application/shared/ports/UnitOfWorkPort';

function mapTransfer(row: typeof stockTransfers.$inferSelect): StockTransferRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    transferNumber: row.transferNumber,
    fromOutletId: row.fromOutletId,
    toOutletId: row.toOutletId,
    status: row.status as TransferStatus,
    notes: row.notes ?? null,
    createdBy: row.createdBy ?? null,
    submittedBy: row.submittedBy ?? null,
    receivedBy: row.receivedBy ?? null,
    cancelledBy: row.cancelledBy ?? null,
    submittedAt: row.submittedAt ?? null,
    receivedAt: row.receivedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapItem(row: typeof stockTransferItems.$inferSelect): StockTransferItemRecord {
  return {
    id: row.id,
    transferId: row.transferId,
    productId: row.productId,
    quantity: row.quantity,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getClient(ctx?: TransactionContext): DbClient {
  return DrizzleUnitOfWork.fromContext(ctx) ?? db;
}

export class DrizzleStockTransferRepository implements StockTransferRepositoryPort {
  async create(input: CreateTransferInput, ctx?: TransactionContext): Promise<StockTransferWithItems> {
    const work = async (client: DbClient): Promise<StockTransferWithItems> => {
      const [transfer] = await client
        .insert(stockTransfers)
        .values({
          tenantId: input.tenantId,
          transferNumber: input.transferNumber,
          fromOutletId: input.fromOutletId,
          toOutletId: input.toOutletId,
          notes: input.notes ?? null,
          createdBy: input.createdBy ?? null,
          updatedAt: new Date(),
        })
        .returning();

      const itemRows = await client
        .insert(stockTransferItems)
        .values(
          input.items.map((item) => ({
            transferId: transfer.id,
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes ?? null,
            updatedAt: new Date(),
          })),
        )
        .returning();

      return { ...mapTransfer(transfer), items: itemRows.map(mapItem) };
    };

    const txClient = DrizzleUnitOfWork.fromContext(ctx);
    if (txClient) return work(txClient);
    return db.transaction(work);
  }

  async findById(id: string, tenantId: string, ctx?: TransactionContext): Promise<StockTransferWithItems | null> {
    const client = getClient(ctx);
    const [transfer] = await client
      .select()
      .from(stockTransfers)
      .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)))
      .limit(1);

    if (!transfer) return null;

    const items = await client
      .select()
      .from(stockTransferItems)
      .where(eq(stockTransferItems.transferId, id));

    return { ...mapTransfer(transfer), items: items.map(mapItem) };
  }

  async list(
    tenantId: string,
    opts: { fromOutletId?: string; toOutletId?: string; outletId?: string; scope?: 'all' | 'source' | 'destination' | 'involved'; status?: TransferStatus; limit?: number; offset?: number } = {},
    ctx?: TransactionContext,
  ): Promise<StockTransferRecord[]> {
    const client = getClient(ctx);
    const conditions = [eq(stockTransfers.tenantId, tenantId)];
    if (opts.outletId && opts.scope && opts.scope !== 'all') {
      if (opts.scope === 'source') conditions.push(eq(stockTransfers.fromOutletId, opts.outletId));
      if (opts.scope === 'destination') conditions.push(eq(stockTransfers.toOutletId, opts.outletId));
      if (opts.scope === 'involved') conditions.push(or(eq(stockTransfers.fromOutletId, opts.outletId), eq(stockTransfers.toOutletId, opts.outletId))!);
    } else {
      if (opts.fromOutletId) conditions.push(eq(stockTransfers.fromOutletId, opts.fromOutletId));
      if (opts.toOutletId) conditions.push(eq(stockTransfers.toOutletId, opts.toOutletId));
    }
    if (opts.status) conditions.push(eq(stockTransfers.status, opts.status));

    const rows = await client
      .select()
      .from(stockTransfers)
      .where(and(...conditions))
      .orderBy(desc(stockTransfers.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0);

    return rows.map(mapTransfer);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: TransferStatus,
    meta: {
      submittedBy?: string;
      receivedBy?: string;
      cancelledBy?: string;
      submittedAt?: Date;
      receivedAt?: Date;
      cancelledAt?: Date;
    },
    ctx?: TransactionContext,
  ): Promise<StockTransferRecord | null> {
    const client = getClient(ctx);
    const [updated] = await client
      .update(stockTransfers)
      .set({
        status,
        submittedBy: meta.submittedBy ?? undefined,
        receivedBy: meta.receivedBy ?? undefined,
        cancelledBy: meta.cancelledBy ?? undefined,
        submittedAt: meta.submittedAt ?? undefined,
        receivedAt: meta.receivedAt ?? undefined,
        cancelledAt: meta.cancelledAt ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(stockTransfers.id, id), eq(stockTransfers.tenantId, tenantId)))
      .returning();
    return updated ? mapTransfer(updated) : null;
  }
}
