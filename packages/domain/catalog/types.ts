/**
 * Catalog Domain Models
 * Core business entities for product catalog management
 */

/**
 * Represents a single option within an option group (e.g., "Large", "Extra Shot")
 */
export type ProductOption = {
  id: string;
  name: string;
  price_delta: number;
  inventory_sku?: string;
  is_available?: boolean;
  /**
   * Nested modifier groups that become available after selecting this option
   * Enables layered option configurations (e.g., choose sauce → choose toppings)
   */
  child_groups?: ProductOptionGroup[];
};

/**
 * Represents a group of related options (e.g., "Size", "Sugar Level", "Add-ons")
 * Supports both single-select (radio) and multi-select (checkbox) behavior
 */
export type ProductOptionGroup = {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  min_selections: number;
  max_selections: number;
  options: ProductOption[];
  is_required: boolean;
  display_order: number;
};

/**
 * Legacy variant model for backward compatibility
 * Will be replaced by ProductOptionGroup in future versions
 */
export type ProductVariant = {
  id: string;
  name: string;
  price_delta?: number;
  color?: string | null;
  stock_override?: number | null;
};

/**
 * Core Product entity in the catalog domain
 * Enhanced to support multi-variant configuration through option groups
 */
export type Product = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  base_price: number;
  category: string;
  image_url?: string;
  
  // Multi-vertical metadata for business-specific attributes
  metadata?: {
    service_duration_minutes?: number;
    weight_based?: boolean;
    weight_unit?: 'kg' | 'lbs' | 'gr';
    sku_type?: 'physical' | 'digital' | 'service' | 'ppob';
    [key: string]: any;
  };
  
  // Legacy variant support
  has_variants: boolean;
  variants?: ProductVariant[];
  
  // Modern multi-variant support via option groups
  option_groups?: ProductOptionGroup[];
  
  // Inventory management
  stock_tracking_enabled: boolean;
  stock_qty?: number;
  sku?: string;
  
  // Status and metadata
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Product category for organizing catalog
 */
export type ProductCategory = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
};
