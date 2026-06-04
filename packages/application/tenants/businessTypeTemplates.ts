/**
 * Business Type Templates
 * Defines default configurations for each business type.
 *
 * BILLING SAFETY RULE:
 * Business type templates determine default workflows, starter catalog, order types,
 * and UI recommendations — they must NEVER grant paid plan access.
 * Every template uses plan_tier: 'free'. Paid features/modules appear as
 * locked/recommended in Marketplace but are never seeded as active entitlements.
 */

import type { BusinessType, OrderTypeCode, FeatureCode } from '@pos/core';
import type { TenantModuleConfig } from '@pos/domain/tenants/types';

/**
 * Template for a business type containing all default settings
 */
export type BusinessTypeTemplate = {
  tenantDefaults: {
    /** Plan tier for onboarding. Must always be 'free' — billing system upgrades separately. */
    plan_tier: 'free' | 'growth' | 'pro';
    subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
    settings: Record<string, any>;
  };

  moduleConfig: Omit<TenantModuleConfig, 'tenant_id' | 'updated_at'>;

  features: Array<{
    feature_code: FeatureCode;
    source: 'plan_default' | 'purchase' | 'manual_grant' | 'trial';
    is_active: boolean;
  }>;

  orderTypes: OrderTypeCode[];
};

/**
 * Template map keyed by business type.
 *
 * All templates use plan_tier: 'free' and only seed features allowed
 * by PLAN_FEATURE_MAP.free. Paid modules default to false — they appear
 * as upgrade recommendations in Marketplace only.
 */
export const BUSINESS_TYPE_TEMPLATES: Record<BusinessType, BusinessTypeTemplate> = {
  CAFE_RESTAURANT: {
    tenantDefaults: {
      plan_tier: 'free',
      subscription_status: 'active',
      settings: {
        default_tax_rate: 0.1,
        default_service_charge_rate: 0.05,
        enable_tips: true,
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
      enable_multi_location: false,
      config: {
        kitchen_display_auto_refresh: false,
        table_layout_enabled: false,
      },
    },
    features: [
      { feature_code: 'receipt_printer',  source: 'plan_default', is_active: true },
      { feature_code: 'order_queue',      source: 'plan_default', is_active: true },
      { feature_code: 'product_variants', source: 'plan_default', is_active: true },
      { feature_code: 'partial_payment',  source: 'plan_default', is_active: true },
      { feature_code: 'discounts',        source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports',    source: 'plan_default', is_active: true },
    ],
    orderTypes: ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'],
  },

  RETAIL_MINIMARKET: {
    tenantDefaults: {
      plan_tier: 'free',
      subscription_status: 'active',
      settings: {
        default_tax_rate: 0.1,
        enable_barcode_scanner: false,
        low_stock_alert_enabled: false,
      },
    },
    moduleConfig: {
      enable_table_management: false,
      enable_kitchen_ticket: false,
      enable_loyalty: false,
      enable_delivery: false,
      enable_inventory: true,
      enable_inventory_advanced: false,
      enable_appointments: false,
      enable_multi_location: false,
      config: {
        inventory_tracking_mode: 'manual',
        low_stock_threshold: 10,
      },
    },
    features: [
      { feature_code: 'receipt_printer',  source: 'plan_default', is_active: true },
      { feature_code: 'order_queue',      source: 'plan_default', is_active: true },
      { feature_code: 'product_variants', source: 'plan_default', is_active: true },
      { feature_code: 'partial_payment',  source: 'plan_default', is_active: true },
      { feature_code: 'discounts',        source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports',    source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN'],
  },

  LAUNDRY: {
    tenantDefaults: {
      plan_tier: 'free',
      subscription_status: 'active',
      settings: {
        default_tax_rate: 0.1,
        enable_item_tagging: false,
        default_turnaround_days: 3,
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
      enable_multi_location: false,
      config: {
        tag_label_printer_enabled: false,
        pickup_reminder_enabled: false,
      },
    },
    features: [
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue',     source: 'plan_default', is_active: true },
      { feature_code: 'discounts',       source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports',   source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN'],
  },

  SERVICE_APPOINTMENT: {
    tenantDefaults: {
      plan_tier: 'free',
      subscription_status: 'active',
      settings: {
        default_tax_rate: 0.1,
        appointment_duration_minutes: 60,
        booking_buffer_minutes: 15,
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
      enable_multi_location: false,
      config: {
        online_booking_enabled: false,
        calendar_sync_enabled: false,
      },
    },
    features: [
      { feature_code: 'receipt_printer',  source: 'plan_default', is_active: true },
      { feature_code: 'order_queue',      source: 'plan_default', is_active: true },
      { feature_code: 'product_variants', source: 'plan_default', is_active: true },
      { feature_code: 'partial_payment',  source: 'plan_default', is_active: true },
      { feature_code: 'discounts',        source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports',    source: 'plan_default', is_active: true },
    ],
    orderTypes: ['WALK_IN'],
  },

  DIGITAL_PPOB: {
    tenantDefaults: {
      plan_tier: 'free',
      subscription_status: 'active',
      settings: {
        enable_digital_receipts: true,
        auto_process_enabled: false,
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
      enable_multi_location: false,
      config: {
        api_integration_enabled: false,
        transaction_fee_mode: 'percentage',
      },
    },
    features: [
      { feature_code: 'receipt_printer', source: 'plan_default', is_active: true },
      { feature_code: 'order_queue',     source: 'plan_default', is_active: true },
      { feature_code: 'sales_reports',   source: 'plan_default', is_active: true },
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
