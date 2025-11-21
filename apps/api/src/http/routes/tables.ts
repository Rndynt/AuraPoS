import { Router, Request, Response } from "express";
import { Database } from "@pos/infrastructure/database";
import { TableRepository } from "@pos/infrastructure/repositories/seating/TableRepository";
import { ListTables } from "@pos/application/seating/ListTables";
import { UpdateTableStatus } from "@pos/application/seating/UpdateTableStatus";
import type { InsertTable } from "@shared/schema";

export function createTablesRouter(db: Database): Router {
  const router = Router();
  const tableRepository = new TableRepository(db);

  // GET /api/tables - List tables with optional filters
  router.get("/", async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      if (!tenantId) {
        return res.status(400).json({ message: "Missing tenant ID" });
      }

      const { status, floor } = req.query;
      const listTables = new ListTables(tableRepository);
      
      const result = await listTables.execute({
        tenantId,
        status: status as string | undefined,
        floor: floor as string | undefined,
      });

      res.json({ tables: result.tables, total: result.total });
    } catch (error) {
      console.error("Error listing tables:", error);
      res.status(500).json({ message: "Failed to list tables" });
    }
  });

  // POST /api/tables - Create new table
  router.post("/", async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      if (!tenantId) {
        return res.status(400).json({ message: "Missing tenant ID" });
      }

      const { tableNumber, tableName, floor, capacity } = req.body;

      if (!tableNumber) {
        return res.status(400).json({ message: "Table number is required" });
      }

      const newTable = await tableRepository.create({
        tenantId,
        tableNumber,
        tableName,
        floor,
        capacity: capacity ? parseInt(capacity) : undefined,
        status: "available",
      } as InsertTable);

      res.json(newTable);
    } catch (error) {
      console.error("Error creating table:", error);
      res.status(500).json({ message: "Failed to create table" });
    }
  });

  // PATCH /api/tables/:id/status - Update table status
  router.patch("/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, currentOrderId } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const updateTableStatus = new UpdateTableStatus(tableRepository);
      const updated = await updateTableStatus.execute({
        tableId: id,
        status,
        currentOrderId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating table status:", error);
      res.status(500).json({ message: "Failed to update table" });
    }
  });

  return router;
}
