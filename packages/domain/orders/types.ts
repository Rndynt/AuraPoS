/**
 * Orders Domain Models
 * Core business entities for order management and payment processing
 */

/**
 * Represents a selected option/modifier for an order item
 * e.g., "Extra Shot (+$0.50)" or "Less Sugar (Free)"
 */
export type SelectedOption = {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price_delta: number;
  /**
   * Nested modifier groups chosen after selecting this option
   */
  child_groups?: SelectedOptionGroup[];
};

/**
 * A collection of selected options that belong to the same option group
 * Supports layered modifier configurations (groups unlocked by parent options)
 */
export type SelectedOptionGroup = {
  group_id: string;
  group_name: string;
  selection_type?: "single" | "multiple";
  selected_options: SelectedOption[];
};

/**
 * Single item in an order with full variant and modifier information
 * Uniqueness determined by: product_id + variant_id + serialized(selectedOptions)
 */
export type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  base_price: number;
  
  // Legacy variant support
  variant_id?: string;
  variant_name?: string;
  variant_price_delta?: number;

  // Modern multi-variant support
  selected_options?: SelectedOption[];
  selected_option_groups?: SelectedOptionGroup[];
  
  // Quantity and pricing
  quantity: number;
  item_subtotal: number;
  
  // Additional info
  notes?: string;
  status?: "pending" | "preparing" | "ready" | "delivered";
};

/**
 * Payment information for an order
 */
export type OrderPayment = {
  id: string;
  order_id: string;
  amount: number;
  payment_method: "cash" | "card" | "ewallet" | "other";
  payment_status: "pending" | "completed" | "failed" | "refunded";
  transaction_ref?: string;
  paid_at?: Date;
  notes?: string;
};

/**
 * Core Order entity representing a customer transaction
 * Supports partial payments and multi-tenant isolation
 */
export type Order = {
  id: string;
  tenant_id: string;
  
  // Order type and sales channel
  order_type_id?: string;
  sales_channel?: "POS" | "WHATSAPP" | "WEBSITE" | "MARKETPLACE" | "GOFOOD" | "GRABFOOD" | "PHONE" | "OTHER";
  
  // Order items
  items: OrderItem[];
  
  // Pricing breakdown
  subtotal: number;
  tax_amount: number;
  service_charge_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Payment tracking
  paid_amount: number;
  payment_status: "paid" | "partial" | "unpaid";
  payments?: OrderPayment[];
  
  // Order metadata
  order_number: string;
  status: "draft" | "confirmed" | "completed" | "cancelled";
  customer_name?: string;
  table_number?: string;
  notes?: string;
  
  // Timestamps
  created_at: Date;
  updated_at?: Date;
  completed_at?: Date;
};

/**
 * Kitchen ticket for order preparation
 * Represents items sent to kitchen display or printer
 */
export type KitchenTicket = {
  id: string;
  order_id: string;
  tenant_id: string;
  items: OrderItem[];
  table_number?: string;
  priority: "normal" | "high" | "urgent";
  status: "pending" | "preparing" | "ready" | "delivered";
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
};

/**
 * Order Type defines the mode of service across different business verticals
 * Examples: Dine In, Take Away, Delivery, Walk-In, PPOB, etc.
 */
export type OrderType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isOnPremise: boolean;
  needTableNumber: boolean;
  needAddress: boolean;
  allowScheduled: boolean;
  isDigitalProduct: boolean;
  affectsServiceCharge: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
};

/**
 * Tenant-specific order type configuration
 * Allows enabling/disabling specific order types per tenant
 */
export type TenantOrderType = {
  id: string;
  tenant_id: string;
  order_type_id: string;
  is_enabled: boolean;
  config?: Record<string, any>;
  created_at: Date;
  updated_at?: Date;
};
