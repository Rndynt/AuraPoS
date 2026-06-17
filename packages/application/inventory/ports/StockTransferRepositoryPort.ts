import type { TransactionContext } from '../../shared/ports/UnitOfWorkPort';

export type TransferStatus = 'draft' | 'submitted' | 'received' | 'cancelled';

export interface StockTransferRecord {
  id: string;
  tenantId: string;
  transferNumber: string;
  fromOutletId: string;
  toOutletId: string;
  status: TransferStatus;
  notes: string | null;
  createdBy: string | null;
  submittedBy: string | null;
  receivedBy: string | null;
  cancelledBy: string | null;
  submittedAt: Date | null;
  receivedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransferItemRecord {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransferWithItems extends StockTransferRecord {
  items: StockTransferItemRecord[];
}

export interface CreateTransferInput {
  tenantId: string;
  transferNumber: string;
  fromOutletId: string;
  toOutletId: string;
  notes?: string | null;
  createdBy?: string | null;
  items: Array<{ productId: string; quantity: number; notes?: string | null }>;
}

export interface StockTransferRepositoryPort {
  create(input: CreateTransferInput, ctx?: TransactionContext): Promise<StockTransferWithItems>;

  findById(id: string, tenantId: string, ctx?: TransactionContext): Promise<StockTransferWithItems | null>;

  list(
    tenantId: string,
    opts?: { fromOutletId?: string; toOutletId?: string; status?: TransferStatus; limit?: number; offset?: number },
    ctx?: TransactionContext,
  ): Promise<StockTransferRecord[]>;

  updateStatus(
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
  ): Promise<StockTransferRecord | null>;
}
