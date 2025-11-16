/**
 * Tenants Domain Models
 * Multi-tenant management and feature flag system
 */

/**
 * Feature definition available in the system
 * Features can be enabled/disabled per tenant
 */
export type Feature = {
  code: string;
  name: string;
  description?: string;
  type: "one_time" | "subscription";
  group: "printing" | "kitchen" | "pos" | "reporting" | "ui" | "integration";
  metadata?: Record<string, any>;
  is_premium?: boolean;
};

/**
 * Feature activation for a specific tenant
 * Tracks which features are enabled and their validity period
 */
export type TenantFeature = {
  id: string;
  tenant_id: string;
  feature_code: string;
  
  // Activation tracking
  activated_at: Date;
  expires_at?: Date | null;
  
  // Source of activation
  source: "plan_default" | "purchase" | "manual_grant" | "trial";
  
  // Status
  is_active: boolean;
  
  // Metadata for feature-specific configuration
  config?: Record<string, any>;
};

/**
 * Tenant entity representing a business/organization
 * Each tenant has isolated data and configurable features
 */
export type Tenant = {
  id: string;
  name: string;
  slug: string;
  
  // Business information
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  
  // Subscription & billing
  plan_tier: "free" | "starter" | "professional" | "enterprise";
  subscription_status: "active" | "trial" | "suspended" | "cancelled";
  trial_ends_at?: Date;
  
  // Settings
  timezone: string;
  currency: string;
  locale: string;
  
  // Status
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
};

/**
 * Feature flag evaluation result
 * Used to check if a feature is available for a tenant
 */
export type FeatureCheck = {
  enabled: boolean;
  feature_code: string;
  reason?: string;
  expires_at?: Date | null;
  config?: Record<string, any>;
};

/**
 * Common feature codes used across the system
 */
export const FEATURE_CODES = {
  // Printing features
  KITCHEN_PRINTER: "kitchen_printer",
  RECEIPT_PRINTER: "receipt_printer",
  LABEL_PRINTER: "label_printer",
  
  // Kitchen features
  KITCHEN_DISPLAY: "kitchen_display",
  ORDER_NOTIFICATIONS: "order_notifications",
  
  // POS features
  MULTI_VARIANT: "multi_variant",
  INVENTORY_TRACKING: "inventory_tracking",
  PARTIAL_PAYMENTS: "partial_payments",
  DISCOUNTS: "discounts",
  
  // Reporting features
  SALES_REPORTS: "sales_reports",
  INVENTORY_REPORTS: "inventory_reports",
  ANALYTICS_DASHBOARD: "analytics_dashboard",
  
  // UI features
  DARK_MODE: "dark_mode",
  CUSTOM_BRANDING: "custom_branding",
  
  // Integration features
  PAYMENT_GATEWAY: "payment_gateway",
  ACCOUNTING_SYNC: "accounting_sync",
} as const;

export type FeatureCode = typeof FEATURE_CODES[keyof typeof FEATURE_CODES];
