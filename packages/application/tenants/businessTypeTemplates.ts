/**
 * Business Type Templates
 * Defines default configurations for each business type
 */

import type { BusinessType, OrderTypeCode, FeatureCode } from '@pos/core';
import type { TenantModuleConfig } from '@pos/domain/tenants/types';

/**
 * Template for a business type containing all default settings
 */
export type BusinessTypeTemplate = {
  // Default tenant settings
  tenantDefaults: {
    /** Plan tier for this business type. Tenant starts on trial of this tier. */
    plan_tier: 'free' | 'growth' | 'pro';
    subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
    settings: Record<string, any>;
  };
  
  // Default module configuration
  moduleConfig: Omit<TenantModuleConfig, 'tenant_id' | 'updated_at'>;
  
  // Default features to enable
  features: Array<{
    feature_code: FeatureCode;
    source: 'plan_default' | 'purchase' | 'manual_grant' | 'trial';
    is_active: boolean;
  }>;
  
  // Default order types to enable
  orderTypes: OrderTypeCode[];
};

/**
 * Template map keyed by business type
 */
export const BUSINESS_TYPE_TEMPLATES: Record<BusinessType, BusinessTypeTemplate> = {
  // Cafe & restoran mulai di tier growth (trial) karena butuh KDS dan dapur.
  // Saat trial habis → downgrade ke free: fitur 'trial' source dihapus oleh billing system.
  CAFE_RESTAURANT: {
    tenantDefaults: {
      plan_tier: 'growth',
      subscription_status: 'trial',
      settings: {
        default_tax_rate: 0.1,
        default_service_charge_rate: 0.05,
        enable_tips: true,
      },
    },
    moduleConfig: {
      enable_table_management: true,
      enable_kitchen_ticket: true,
      enable_loyalty: false,
      enable_delivery: true,
      enable_inventory: false,
      enable_inventory_advanced: false,
      enable_appointments: false,
      enable_multi_location: false,
      config: {
        kitchen_display_auto_refresh: true,
        table_layout_enabled: true,
      },
    },
    features: [
      // Free features
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue', source: 'plan_default', is_active: true },
      { feature_code: 'product_variants', source: 'plan_default', is_active: true },
      { feature_code: 'partial_payment', source: 'plan_default', is_active: true },
      { feature_code: 'discounts', source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports', source: 'plan_default', is_active: true },
      // Growth features (valid because plan_tier = 'growth')
      { feature_code: 'kitchen_ticket', source: 'plan_default', is_active: true },
      { feature_code: 'kitchen_printer', source: 'plan_default', is_active: true },
      { feature_code: 'kitchen_display', source: 'plan_default', is_active: true },
      { feature_code: 'order_notifications', source: 'plan_default', is_active: true },
    ],
    orderTypes: ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'],
  },

  // Retail/minimarket butuh inventori lanjutan & loyalty → tier growth
  RETAIL_MINIMARKET: {
    tenantDefaults: {
      plan_tier: 'growth',
      subscription_status: 'trial',
      settings: {
        default_tax_rate: 0.1,
        enable_barcode_scanner: true,
        low_stock_alert_enabled: true,
      },
    },
    moduleConfig: {
      enable_table_management: false,
      enable_kitchen_ticket: false,
      enable_loyalty: true,
      enable_delivery: false,
      enable_inventory: true,
      enable_inventory_advanced: true,
      enable_appointments: false,
      enable_multi_location: false,
      config: {
        inventory_tracking_mode: 'automatic',
        low_stock_threshold: 10,
      },
    },
    features: [
      // Free features
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue', source: 'plan_default', is_active: true },
      { feature_code: 'product_variants', source: 'plan_default', is_active: true },
      { feature_code: 'partial_payment', source: 'plan_default', is_active: true },
      { feature_code: 'discounts', source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports', source: 'plan_default', is_active: true },
      // Growth features (valid because plan_tier = 'growth')
      { feature_code: 'inventory_tracking', source: 'plan_default', is_active: true },
      { feature_code: 'inventory_reports', source: 'plan_default', is_active: true },
      { feature_code: 'barcode_scanner', source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN'],
  },

  // Laundry butuh label printer & loyalty → tier growth
  LAUNDRY: {
    tenantDefaults: {
      plan_tier: 'growth',
      subscription_status: 'trial',
      settings: {
        default_tax_rate: 0.1,
        enable_item_tagging: true,
        default_turnaround_days: 3,
      },
    },
    moduleConfig: {
      enable_table_management: false,
      enable_kitchen_ticket: false,
      enable_loyalty: true,
      enable_delivery: true,
      enable_inventory: false,
      enable_inventory_advanced: false,
      enable_appointments: false,
      enable_multi_location: false,
      config: {
        tag_label_printer_enabled: true,
        pickup_reminder_enabled: true,
      },
    },
    features: [
      // Free features
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue', source: 'plan_default', is_active: true },
      { feature_code: 'discounts', source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports', source: 'plan_default', is_active: true },
      // Growth features (valid because plan_tier = 'growth')
      { feature_code: 'label_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_notifications', source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN', 'DELIVERY'],
  },

  // Service/appointment butuh order_notifications + loyalty → tier growth
  SERVICE_APPOINTMENT: {
    tenantDefaults: {
      plan_tier: 'growth',
      subscription_status: 'trial',
      settings: {
        default_tax_rate: 0.1,
        appointment_duration_minutes: 60,
        booking_buffer_minutes: 15,
      },
    },
    moduleConfig: {
      enable_table_management: false,
      enable_kitchen_ticket: false,
      enable_loyalty: true,
      enable_delivery: false,
      enable_inventory: false,
      enable_inventory_advanced: false,
      enable_appointments: true,
      enable_multi_location: false,
      config: {
        online_booking_enabled: true,
        calendar_sync_enabled: false,
      },
    },
    features: [
      // Free features
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue', source: 'plan_default', is_active: true },
      { feature_code: 'product_variants', source: 'plan_default', is_active: true },
      { feature_code: 'partial_payment', source: 'plan_default', is_active: true },
      { feature_code: 'discounts', source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports', source: 'plan_default', is_active: true },
      // Growth features (valid because plan_tier = 'growth')
      { feature_code: 'order_notifications', source: 'plan_default', is_active: true },
      { feature_code: 'analytics_dashboard', source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN'],
  },

  // PPOB/Digital butuh payment_gateway + multi_location → tier pro
  DIGITAL_PPOB: {
    tenantDefaults: {
      plan_tier: 'pro',
      subscription_status: 'trial',
      settings: {
        enable_digital_receipts: true,
        auto_process_enabled: true,
      },
    },
    moduleConfig: {
      enable_table_management: false,
      enable_kitchen_ticket: false,
      enable_loyalty: false,
      enable_delivery: false,
      enable_inventory: false,
      enable_inventory_advanced: false,
      enable_appointments: false,
      enable_multi_location: true,
      config: {
        api_integration_enabled: true,
        transaction_fee_mode: 'percentage',
      },
    },
    features: [
      // Free features
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue', source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports', source: 'plan_default', is_active: true },
      // Growth features
      { feature_code: 'analytics_dashboard', source: 'plan_default', is_active: true },
      // Pro features (valid because plan_tier = 'pro')
      { feature_code: 'payment_gateway', source: 'plan_default', is_active: true },
      { feature_code: 'api_integration', source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN'],
  },
};

/**
 * Get business type template by business type
 * @param businessType - The business type
 * @returns The template for the business type
 * @throws Error if business type is not found
 */
export function getBusinessTypeTemplate(businessType: BusinessType): BusinessTypeTemplate {
  const template = BUSINESS_TYPE_TEMPLATES[businessType];
  
  if (!template) {
    throw new Error(`No template found for business type: ${businessType}`);
  }
  
  return template;
}
