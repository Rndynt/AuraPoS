import { Router, Request, Response } from "express";
import { Database } from "@pos/infrastructure/database";
import { TableRepository } from "@pos/infrastructure/repositories/seating/TableRepository";
import { OrderRepository } from "@pos/infrastructure/repositories/orders/OrderRepository";
import { ListTables } from "@pos/application/seating/ListTables";
import { UpdateTableStatus } from "@pos/application/seating/UpdateTableStatus";
import type { InsertTable } from "@shared/schema";

const VALID_TABLE_STATUSES = new Set(["available", "occupied", "reserved", "maintenance", "cleaning"]);

export function createTablesRouter(db: Database): Router {
  const router = Router();
  const tableRepository = new TableRepository(db);
  const orderRepository = new OrderRepository(db);

  // GET /api/tables - List tables with optional filters
  router.get("/", async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { status, floor } = req.query;
      const listTables = new ListTables(tableRepository);

      const result = await listTables.execute({
        tenantId,
        status: status as string | undefined,
        floor: floor as string | undefined,
      });

      res.json({ success: true, data: { tables: result.tables, total: result.total } });
    } catch (error) {
      console.error("Error listing tables:", error);
      res.status(500).json({ success: false, error: { message: "Failed to list tables" } });
    }
  });

  // POST /api/tables - Create new table
  router.post("/", async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { tableNumber, tableName, floor, capacity } = req.body;

      if (!tableNumber) {
        return res.status(400).json({ success: false, error: { message: "Table number is required" } });
      }

      const newTable = await tableRepository.create({
        tenantId,
        tableNumber,
        tableName,
        floor,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        status: "available",
      } as InsertTable);

      res.status(201).json({ success: true, data: newTable });
    } catch (error) {
      console.error("Error creating table:", error);
      res.status(500).json({ success: false, error: { message: "Failed to create table" } });
    }
  });

  // PATCH /api/tables/:id/status - Update table status
  router.patch("/:id/status", async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { status, currentOrderId } = req.body;

      if (!status || !VALID_TABLE_STATUSES.has(status)) {
        return res.status(400).json({ success: false, error: { message: "Valid status is required" } });
      }

      if (currentOrderId) {
        const order = await orderRepository.findById(currentOrderId, tenantId);
        if (!order) {
          return res.status(400).json({
            success: false,
            error: { message: "Current order does not belong to this tenant" },
          });
        }
      }

      const updateTableStatus = new UpdateTableStatus(tableRepository);
      const updated = await updateTableStatus.execute({
        tenantId,
        tableId: id,
        status,
        currentOrderId,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating table status:", error);
      res.status(500).json({ success: false, error: { message: "Failed to update table" } });
    }
  });

  return router;
}
