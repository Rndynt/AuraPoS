import { IUseCase } from "@pos/application/types";
import { TableRepository } from "@pos/infrastructure/repositories/seating/TableRepository";
import type { Table } from "@shared/schema";

export interface UpdateTableStatusRequest {
  tableId: string;
  status: string;
  currentOrderId?: string;
}

export class UpdateTableStatus implements IUseCase<UpdateTableStatusRequest, Table> {
  constructor(private tableRepository: TableRepository) {}

  async execute(request: UpdateTableStatusRequest): Promise<Table> {
    const { tableId, status, currentOrderId } = request;

    const table = await this.tableRepository.updateStatus(tableId, status, currentOrderId);

    return table;
  }
}
