import { TableRepository } from "@pos/infrastructure/repositories/seating/TableRepository";
import type { Table } from "@shared/schema";

export interface ListTablesRequest {
  tenantId: string;
  status?: string;
  floor?: string;
}

export interface ListTablesResponse {
  tables: Table[];
  total: number;
}

export class ListTables {
  constructor(private tableRepository: TableRepository) {}

  async execute(request: ListTablesRequest): Promise<ListTablesResponse> {
    const { tenantId, status, floor } = request;

    const tables = await this.tableRepository.findByTenant(tenantId, { status, floor });

    return {
      tables,
      total: tables.length,
    };
  }
}
