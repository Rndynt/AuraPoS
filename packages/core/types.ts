// Product types
export type ProductVariant = {
  id: string;
  name: string;
  price_delta?: number;
  color?: string | null;
  stock_override?: number | null;
};

export type Product = {
  id: string;
  tenant_id: string;
  name: string;
  base_price: number;
  category: string;
  image_url?: string;
  has_variants: boolean;
  variants?: ProductVariant[];
  stock_tracking_enabled: boolean;
  stock_qty?: number;
  sku?: string;
  is_active: boolean;
};

// Feature types
export type Feature = {
  code: string;
  name: string;
  description?: string;
  type: "one_time" | "subscription";
  group: "printing" | "kitchen" | "pos" | "reporting" | "ui";
  metadata?: Record<string, any>;
};

export type TenantFeature = {
  tenant_id: string;
  feature_code: string;
  activated_at: Date;
  expires_at?: Date | null;
  source: "plan_default" | "purchase" | "manual_grant";
};

// Order types
export type OrderItem = {
  product_id: string;
  product_name: string;
  base_price: number;
  variant_id?: string;
  variant_name?: string;
  variant_price_delta?: number;
  qty: number;
  note?: string;
};

export type Order = {
  id: string;
  tenant_id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  service_charge: number;
  total_amount: number;
  paid_amount: number;
  status: "paid" | "partial" | "unpaid";
  created_at: Date;
};
