import type { TransactionContext } from '../../shared/ports/UnitOfWorkPort';

export type OpnameStatus = 'draft' | 'submitted' | 'approved' | 'cancelled';

export interface StockOpnameRecord {
  id: string;
  tenantId: string;
  outletId: string;
  opnameNumber: string;
  status: OpnameStatus;
  notes: string | null;
  startedBy: string | null;
  submittedBy: string | null;
  approvedBy: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockOpnameItemRecord {
  id: string;
  opnameId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockOpnameWithItems extends StockOpnameRecord {
  items: StockOpnameItemRecord[];
}

export interface CreateOpnameInput {
  tenantId: string;
  outletId: string;
  opnameNumber: string;
  notes?: string | null;
  startedBy?: string | null;
}

export interface UpsertOpnameItemInput {
  opnameId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity: number;
  notes?: string | null;
}

export interface StockOpnameRepositoryPort {
  create(input: CreateOpnameInput, ctx?: TransactionContext): Promise<StockOpnameRecord>;

  findById(id: string, tenantId: string, ctx?: TransactionContext): Promise<StockOpnameWithItems | null>;

  list(
    tenantId: string,
    outletId: string,
    opts?: { status?: OpnameStatus; limit?: number; offset?: number },
    ctx?: TransactionContext,
  ): Promise<StockOpnameRecord[]>;

  upsertItem(input: UpsertOpnameItemInput, ctx?: TransactionContext): Promise<StockOpnameItemRecord>;

  updateStatus(
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
  ): Promise<StockOpnameRecord | null>;
}
