export type InventoryEntitlementConfig = {
  enableInventory?: boolean | null;
  enableInventoryAdvanced?: boolean | null;
};

/** Basic Stock (Stok Dasar) is the free/onboarding inventory entitlement. */
export function hasBasicStockEntitlement(config: InventoryEntitlementConfig | undefined): boolean {
  return config?.enableInventory === true;
}

/** Advanced inventory remains separately gated and must not be implied by Basic Stock. */
export function hasAdvancedInventoryEntitlement(config: InventoryEntitlementConfig | undefined): boolean {
  return config?.enableInventoryAdvanced === true;
}
