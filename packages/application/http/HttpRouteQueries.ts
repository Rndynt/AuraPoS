import type { HttpRouteRepositoryPort } from './ports/HttpRouteRepositoryPort';

export class HttpRouteQueries {
  constructor(private readonly repo: HttpRouteRepositoryPort) {}
  slugExists(slug: string) { return this.repo.slugExists(slug); }
  getTenantBySlug(slug: string) { return this.repo.getTenantBySlug(slug); }
  getTenantEntitlementProfile(tenantId: string) { return this.repo.getTenantEntitlementProfile(tenantId); }
  getCategoryNameById(tenantId: string, categoryId: string) { return this.repo.getCategoryNameById(tenantId, categoryId); }
  listActiveOutlets(tenantId: string) { return this.repo.listActiveOutlets(tenantId); }
  getOutlet(tenantId: string, outletId: string) { return this.repo.getOutlet(tenantId, outletId); }
  countActiveOutlets(tenantId: string) { return this.repo.countActiveOutlets(tenantId); }
  createOutlet(tenantId: string, body: any) { return this.repo.createOutlet(tenantId, body); }
  updateOutlet(tenantId: string, outletId: string, body: any) { return this.repo.updateOutlet(tenantId, outletId, body); }
  getOutletForDelete(tenantId: string, outletId: string) { return this.repo.getOutletForDelete(tenantId, outletId); }
  softDeleteOutlet(tenantId: string, outletId: string) { return this.repo.softDeleteOutlet(tenantId, outletId); }
  listOutletStaff(outletId: string) { return this.repo.listOutletStaff(outletId); }
  upsertOutletStaff(input: { outletId: string; userId: string; role: string }) { return this.repo.upsertOutletStaff(input); }
  deactivateOutletStaff(input: { outletId: string; userId: string }) { return this.repo.deactivateOutletStaff(input); }
  listOutletProductConfigs(tenantId: string) { return this.repo.listOutletProductConfigs(tenantId); }
  setOutletProductAvailability(input: { tenantId: string; outletId: string; productId: string; isAvailable: boolean }) { return this.repo.setOutletProductAvailability(input); }
  listTrackedProductsForStock(tenantId: string) { return this.repo.listTrackedProductsForStock(tenantId); }
  getTrackedProduct(tenantId: string, productId: string) { return this.repo.getTrackedProduct(tenantId, productId); }
  listProductSummaries(tenantId: string) { return this.repo.listProductSummaries(tenantId); }
  listTrackedProductIds(tenantId: string) { return this.repo.listTrackedProductIds(tenantId); }
  listInventoryMovements(input: any) { return this.repo.listInventoryMovements(input); }
  listInventoryMovementsByProduct(input: any) { return this.repo.listInventoryMovementsByProduct(input); }
  getInventoryMovementReport(input: any) { return this.repo.getInventoryMovementReport(input); }
}
