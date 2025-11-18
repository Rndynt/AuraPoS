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
 * - COMPLETED: Order fulfilled and closed
 * - CANCELLED: Order cancelled by customer or staff
 */
export const OrderStatus = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * PaymentStatus - Payment states for orders
 * 
 * Tracks the payment completion status:
 * - UNPAID: No payment received
 * - PARTIAL: Partial payment received (down payment scenario)
 * - PAID: Fully paid
 */
export const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

/**
 * PaymentMethod - Available payment methods
 * 
 * Types of payment methods accepted by the system:
 * - CASH: Cash payment
 * - CARD: Credit/debit card payment
 * - EWALLET: Digital wallet (GoPay, OVO, DANA, etc.)
 * - OTHER: Other payment methods
 */
export const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  EWALLET: 'ewallet',
  OTHER: 'other',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

/**
 * OrderTypeCode - Order channel types
 * 
 * Defines how the order was placed and fulfillment method:
 * - DINE_IN: Customer dining in at the restaurant
 * - TAKE_AWAY: Customer picks up order to take away
 * - DELIVERY: Order delivered to customer address
 * - WALK_IN: Walk-in retail purchase (minimarket/retail)
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
 * 
 * Feature flags that can be enabled/disabled per tenant:
 * - PRODUCT_VARIANTS: Product variant/options support
 * - PARTIAL_PAYMENT: Allow partial/down payments
 * - KITCHEN_TICKET: Kitchen ticket printing
 * - STOCK_TRACKING: Inventory stock tracking
 * - ORDER_HISTORY: Order history and reports
 */
export const FeatureCode = {
  PRODUCT_VARIANTS: 'product_variants',
  PARTIAL_PAYMENT: 'partial_payment',
  KITCHEN_TICKET: 'kitchen_ticket',
  STOCK_TRACKING: 'stock_tracking',
  ORDER_HISTORY: 'order_history',
} as const;

export type FeatureCode = typeof FeatureCode[keyof typeof FeatureCode];

/**
 * Helper type to extract enum values as a readonly array
 */
export type EnumValues<T> = T[keyof T];
