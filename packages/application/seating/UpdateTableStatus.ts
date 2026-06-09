import type { SeatingTable } from './ListTables';

export interface UpdateTableStatusRepositoryPort {
  updateStatus(
    tenantId: string,
    tableId: string,
    status: string,
    currentOrderId?: string,
    outletId?: string,
  ): Promise<SeatingTable>;
}

export interface UpdateTableStatusRequest {
  tenantId: string;
  tableId: string;
  status: string;
  currentOrderId?: string;
  outletId?: string;
}

export class UpdateTableStatus {
  constructor(private tableRepository: UpdateTableStatusRepositoryPort) {}

  async execute(request: UpdateTableStatusRequest): Promise<SeatingTable> {
    const { tenantId, tableId, status, currentOrderId, outletId } = request;

    const table = await this.tableRepository.updateStatus(
      tenantId,
      tableId,
      status,
      currentOrderId,
      outletId
    );

    return table;
  }
}
