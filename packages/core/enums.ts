/**
 * Core Enums and Constants
 * Centralized type definitions used across all domains
 */

/**
 * BusinessType - Main business verticals supported by the POS system
 * 
 * Defines the primary business category which determines:
 * - Available features and modules
 * - Default order types
 * - UI/UX configurations
 */
export const BusinessType = {
  CAFE_RESTAURANT: 'CAFE_RESTAURANT',
  RETAIL_MINIMARKET: 'RETAIL_MINIMARKET',
  LAUNDRY: 'LAUNDRY',
  SERVICE_APPOINTMENT: 'SERVICE_APPOINTMENT',
  DIGITAL_PPOB: 'DIGITAL_PPOB',
} as const;

export type BusinessType = typeof BusinessType[keyof typeof BusinessType];

/**
 * OrderStatus - Order lifecycle states
 * 
 * Represents the current state of an order from creation to completion.
 * Matches schema.ts orders table status field.
 * - DRAFT: Order being created, not yet confirmed
 * - CONFIRMED: Order confirmed and sent to kitchen/processing
 * - PREPARING: Order is being prepared (kitchen/service in progress)
 * - READY: Order is ready for pickup/delivery
 * - COMPLETED: Order fulfilled and closed
 * - CANCELLED: Order cancelled by customer or staff
 */
export const OrderStatus = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * PaymentStatus - Payment states for orders
 */
export const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

/**
 * PaymentMethod - built-in manual POS payment methods only.
 */
export const PaymentMethod = {
  CASH: 'CASH',
  MANUAL_TRANSFER: 'MANUAL_TRANSFER',
  MANUAL_QRIS: 'MANUAL_QRIS',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

/**
 * OrderTypeCode - Order channel types
 */
export const OrderTypeCode = {
  DINE_IN: 'DINE_IN',
  TAKE_AWAY: 'TAKE_AWAY',
  DELIVERY: 'DELIVERY',
  WALK_IN: 'WALK_IN',
} as const;

export type OrderTypeCode = typeof OrderTypeCode[keyof typeof OrderTypeCode];

/**
 * FeatureCode - Available feature codes
 */
export const FeatureCode = {
  KITCHEN_PRINTER: 'kitchen_printer',
  RECEIPT_PRINTER: 'receipt_printer',
  LABEL_PRINTER: 'label_printer',
  KITCHEN_DISPLAY: 'kitchen_display',
  ORDER_NOTIFICATIONS: 'order_notifications',
  KITCHEN_TICKET: 'kitchen_ticket',
  PRODUCT_VARIANTS: 'product_variants',
  /** @deprecated Use PRODUCT_VARIANTS — kept for backward compatibility */
  MULTI_VARIANT: 'product_variants',
  INVENTORY_TRACKING: 'inventory_tracking',
  PARTIAL_PAYMENT: 'partial_payment',
  /** @deprecated Use PARTIAL_PAYMENT — kept for backward compatibility */
  PARTIAL_PAYMENTS: 'partial_payment',
  DISCOUNTS: 'discounts',
  ORDER_QUEUE: 'order_queue',
  BARCODE_SCANNER: 'barcode_scanner',
  SALES_REPORTS: 'sales_reports',
  INVENTORY_REPORTS: 'inventory_reports',
  ANALYTICS_DASHBOARD: 'analytics_dashboard',
  DARK_MODE: 'dark_mode',
  CUSTOM_BRANDING: 'custom_branding',
  PAYMENT_GATEWAY: 'payment_gateway',
  ACCOUNTING_SYNC: 'accounting_sync',
  API_INTEGRATION: 'api_integration',
  ONLINE_BOOKING: 'online_booking',
  CALENDAR_SYNC: 'calendar_sync',
} as const;

export type FeatureCode = typeof FeatureCode[keyof typeof FeatureCode];

/**
 * Helper type to extract enum values as a readonly array
 */
export type EnumValues<T> = T[keyof T];
