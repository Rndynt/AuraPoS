/**
 * Pricing Domain Models
 * Business logic for pricing calculations, discounts, and taxes
 */

/**
 * Tax configuration for a tenant
 */
export type TaxConfig = {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  type: "percentage" | "fixed";
  is_inclusive: boolean;
  is_active: boolean;
};

/**
 * Service charge configuration
 */
export type ServiceChargeConfig = {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  type: "percentage" | "fixed";
  apply_to: "subtotal" | "after_tax";
  is_active: boolean;
};

/**
 * Discount rule definition
 */
export type DiscountRule = {
  id: string;
  tenant_id: string;
  code?: string;
  name: string;
  type: "percentage" | "fixed" | "buy_x_get_y";
  value: number;
  
  // Applicability
  applies_to: "order" | "category" | "product";
  applicable_ids?: string[];
  
  // Conditions
  min_purchase_amount?: number;
  min_quantity?: number;
  
  // Validity
  valid_from?: Date;
  valid_until?: Date;
  is_active: boolean;
  
  // Usage limits
  max_uses_per_customer?: number;
  max_total_uses?: number;
  current_uses?: number;
};

/**
 * Applied discount on an order
 */
export type AppliedDiscount = {
  discount_rule_id: string;
  discount_name: string;
  discount_type: "percentage" | "fixed" | "buy_x_get_y";
  discount_value: number;
  amount_saved: number;
};

/**
 * Price calculation breakdown
 * Shows how the final price is computed
 */
export type PriceCalculation = {
  // Item pricing
  base_price: number;
  variant_delta: number;
  options_delta: number;
  item_price: number;
  quantity: number;
  item_subtotal: number;
  
  // Order-level pricing
  order_subtotal: number;
  discounts: AppliedDiscount[];
  total_discount: number;
  subtotal_after_discount: number;
  
  // Taxes and charges
  tax_amount: number;
  service_charge_amount: number;
  
  // Final total
  total_amount: number;
};

/**
 * Pricing strategy for dynamic pricing
 */
export type PricingStrategy = {
  id: string;
  tenant_id: string;
  name: string;
  type: "time_based" | "demand_based" | "customer_segment";
  rules: Record<string, any>;
  is_active: boolean;
};
