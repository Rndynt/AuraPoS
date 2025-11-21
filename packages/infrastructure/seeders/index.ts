import type { Database } from "@pos/infrastructure/database";

export async function runSeeders(db: Database, tenantId: string) {
  console.log(`Running seeders for tenant: ${tenantId}`);

  try {
    // Import seeders dynamically to avoid circular dependencies
    const { seedTables } = await import("./tables.seeder");
    
    await seedTables(db, tenantId);
    console.log("✓ All seeders completed successfully");
  } catch (error) {
    console.error("Error running seeders:", error);
    throw error;
  }
}
