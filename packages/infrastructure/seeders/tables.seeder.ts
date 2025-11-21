import { Database } from "@pos/infrastructure/database";
import { TableRepository } from "@pos/infrastructure/repositories/seating/TableRepository";

export async function seedTables(db: Database, tenantId: string): Promise<void> {
  const tableRepository = new TableRepository(db);

  const sampleTables = [
    { tenantId, tableNumber: "1", tableName: "Front Window", floor: "Ground Floor", capacity: 2, status: "available" as const },
    { tenantId, tableNumber: "2", tableName: "Corner", floor: "Ground Floor", capacity: 4, status: "available" as const },
    { tenantId, tableNumber: "3", tableName: "Middle", floor: "Ground Floor", capacity: 4, status: "available" as const },
    { tenantId, tableNumber: "4", tableName: "Back", floor: "Ground Floor", capacity: 6, status: "available" as const },
    { tenantId, tableNumber: "A1", tableName: "Terrace", floor: "Ground Floor", capacity: 2, status: "available" as const },
    { tenantId, tableNumber: "A2", tableName: "Terrace Lounge", floor: "Ground Floor", capacity: 4, status: "available" as const },
    { tenantId, tableNumber: "VIP-1", tableName: "VIP Room", floor: "2nd Floor", capacity: 8, status: "available" as const },
    { tenantId, tableNumber: "5", tableName: "Standard", floor: "2nd Floor", capacity: 4, status: "available" as const },
    { tenantId, tableNumber: "6", tableName: "Standard", floor: "2nd Floor", capacity: 4, status: "available" as const },
    { tenantId, tableNumber: "B1", tableName: "Meeting Room", floor: "2nd Floor", capacity: 6, status: "available" as const },
  ];

  await tableRepository.bulkCreate(sampleTables);
  console.log(`✓ Seeded ${sampleTables.length} tables for tenant ${tenantId}`);
}
