import type {
  StockOpnameRecord,
  StockOpnameItemRecord,
  StockOpnameWithItems,
  StockOpnameRepositoryPort,
  CreateOpnameInput,
  UpsertOpnameItemInput,
  OpnameStatus,
} from '@pos/application/inventory/ports';
import { and, eq, desc } from 'drizzle-orm';
import { stockOpnames, stockOpnameItems } from '@pos/infrastructure/db/schema';
import { db, type DbClient } from '../../database';
import { DrizzleUnitOfWork } from '../../unit-of-work';
import type { TransactionContext } from '@pos/application/shared/ports/UnitOfWorkPort';

function mapOpname(row: typeof stockOpnames.$inferSelect): StockOpnameRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    outletId: row.outletId,
    opnameNumber: row.opnameNumber,
    status: row.status as OpnameStatus,
    notes: row.notes ?? null,
    startedBy: row.startedBy ?? null,
    submittedBy: row.submittedBy ?? null,
    approvedBy: row.approvedBy ?? null,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapItem(row: typeof stockOpnameItems.$inferSelect): StockOpnameItemRecord {
  return {
    id: row.id,
    opnameId: row.opnameId,
    productId: row.productId,
    systemQuantity: row.systemQuantity,
    countedQuantity: row.countedQuantity,
    varianceQuantity: row.varianceQuantity,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getClient(ctx?: TransactionContext): DbClient {
  return DrizzleUnitOfWork.fromContext(ctx) ?? db;
}

export class DrizzleStockOpnameRepository implements StockOpnameRepositoryPort {
  async create(input: CreateOpnameInput, ctx?: TransactionContext): Promise<StockOpnameRecord> {
    const client = getClient(ctx);
    const [row] = await client
      .insert(stockOpnames)
      .values({
        tenantId: input.tenantId,
        outletId: input.outletId,
        opnameNumber: input.opnameNumber,
        notes: input.notes ?? null,
        startedBy: input.startedBy ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapOpname(row);
  }

  async findById(id: string, tenantId: string, ctx?: TransactionContext): Promise<StockOpnameWithItems | null> {
    const client = getClient(ctx);
    const [opname] = await client
      .select()
      .from(stockOpnames)
      .where(and(eq(stockOpnames.id, id), eq(stockOpnames.tenantId, tenantId)))
      .limit(1);

    if (!opname) return null;

    const items = await client
      .select()
      .from(stockOpnameItems)
      .where(eq(stockOpnameItems.opnameId, id));

    return { ...mapOpname(opname), items: items.map(mapItem) };
  }

  async list(
    tenantId: string,
    outletId: string,
    opts: { status?: OpnameStatus; limit?: number; offset?: number } = {},
    ctx?: TransactionContext,
  ): Promise<StockOpnameRecord[]> {
    const client = getClient(ctx);
    const conditions = [
      eq(stockOpnames.tenantId, tenantId),
      eq(stockOpnames.outletId, outletId),
    ];
    if (opts.status) conditions.push(eq(stockOpnames.status, opts.status));

    const rows = await client
      .select()
      .from(stockOpnames)
      .where(and(...conditions))
      .orderBy(desc(stockOpnames.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0);

    return rows.map(mapOpname);
  }

  async upsertItem(input: UpsertOpnameItemInput, ctx?: TransactionContext): Promise<StockOpnameItemRecord> {
    const client = getClient(ctx);
    const variance = input.countedQuantity - input.systemQuantity;

    const [row] = await client
      .insert(stockOpnameItems)
      .values({
        opnameId: input.opnameId,
        productId: input.productId,
        systemQuantity: input.systemQuantity,
        countedQuantity: input.countedQuantity,
        varianceQuantity: variance,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockOpnameItems.opnameId, stockOpnameItems.productId],
        set: {
          systemQuantity: input.systemQuantity,
          countedQuantity: input.countedQuantity,
          varianceQuantity: variance,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return mapItem(row);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: OpnameStatus,
    meta: {
      submittedBy?: string;
      approvedBy?: string;
      submittedAt?: Date;
      approvedAt?: Date;
      cancelledAt?: Date;
    },
    ctx?: TransactionContext,
  ): Promise<StockOpnameRecord | null> {
    const client = getClient(ctx);
    const [updated] = await client
      .update(stockOpnames)
      .set({
        status,
        submittedBy: meta.submittedBy ?? undefined,
        approvedBy: meta.approvedBy ?? undefined,
        submittedAt: meta.submittedAt ?? undefined,
        approvedAt: meta.approvedAt ?? undefined,
        cancelledAt: meta.cancelledAt ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(stockOpnames.id, id), eq(stockOpnames.tenantId, tenantId)))
      .returning();
    return updated ? mapOpname(updated) : null;
  }
}
