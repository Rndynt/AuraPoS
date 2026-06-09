export interface SeatingTable {
  id: string;
  tenantId: string;
  tableNumber: string;
  capacity: number | null;
  tableName?: string | null;
  status: string;
  floor?: string | null;
  currentOrderId?: string | null;
  outletId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TableRepositoryPort {
  findByTenant(
    tenantId: string,
    filters?: { status?: string; floor?: string; outletId?: string },
  ): Promise<SeatingTable[]>;
}

export interface ListTablesRequest {
  tenantId: string;
  status?: string;
  floor?: string;
  outletId?: string;
}

export interface ListTablesResponse {
  tables: SeatingTable[];
  total: number;
}

export class ListTables {
  constructor(private tableRepository: TableRepositoryPort) {}

  async execute(request: ListTablesRequest): Promise<ListTablesResponse> {
    const { tenantId, status, floor, outletId } = request;

    const tables = await this.tableRepository.findByTenant(tenantId, { status, floor, outletId });

    return {
      tables,
      total: tables.length,
    };
  }
}
