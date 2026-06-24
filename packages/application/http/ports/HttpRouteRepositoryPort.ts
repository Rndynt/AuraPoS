export interface HttpRouteRepositoryPort {
  slugExists(slug: string): Promise<boolean>;
  getTenantBySlug(slug: string): Promise<any | null>;
  getTenantEntitlementProfile(tenantId: string): Promise<any | null>;
  getCategoryNameById(tenantId: string, categoryId: string): Promise<string | null>;
  listActiveOutlets(tenantId: string): Promise<any[]>;
  getOutlet(tenantId: string, outletId: string): Promise<any | null>;
  countActiveOutlets(tenantId: string): Promise<number>;
  createOutlet(tenantId: string, body: any): Promise<any>;
  updateOutlet(tenantId: string, outletId: string, body: any): Promise<any | null>;
  getOutletForDelete(tenantId: string, outletId: string): Promise<any | null>;
  softDeleteOutlet(tenantId: string, outletId: string): Promise<void>;
  listOutletStaff(outletId: string): Promise<any[]>;
  upsertOutletStaff(input: { outletId: string; userId: string; role: string }): Promise<any>;
  deactivateOutletStaff(input: { outletId: string; userId: string }): Promise<void>;
  listOutletProductConfigs(tenantId: string): Promise<any[]>;
  setOutletProductAvailability(input: { tenantId: string; outletId: string; productId: string; isAvailable: boolean }): Promise<any | null>;
  listTrackedProductsForStock(tenantId: string): Promise<any[]>;
  getTrackedProduct(tenantId: string, productId: string): Promise<{ id: string; stockTrackingEnabled: boolean } | null>;
  listProductSummaries(tenantId: string): Promise<any[]>;
  listTrackedProductIds(tenantId: string): Promise<string[]>;
  listInventoryMovements(input: any): Promise<any[]>;
  listInventoryMovementsByProduct(input: any): Promise<any[]>;
  getInventoryMovementReport(input: any): Promise<any>;
}
