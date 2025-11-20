import { nanoid } from "nanoid";
import type { Product, ProductVariant } from "@pos/domain/catalog/types";
import type { Feature } from "@pos/domain/tenants/types";

// Product images - import from generated assets
import burgerImg from "@assets/generated_images/Gourmet_beef_burger_product_photo_df61270b.png";
import riceImg from "@assets/generated_images/Chicken_rice_bowl_product_photo_3ab2fbee.png";
import cappuccinoImg from "@assets/generated_images/Cappuccino_coffee_product_photo_d92cda67.png";
import lavaImg from "@assets/generated_images/Chocolate_lava_cake_product_photo_cb07f0be.png";
import pizzaImg from "@assets/generated_images/Supreme_pizza_product_photo_78bbaf57.png";
import friesImg from "@assets/generated_images/French_fries_product_photo_dc986f4d.png";
import icedLatteImg from "@assets/generated_images/Iced_caramel_latte_product_photo_1bc0e828.png";
import wingsImg from "@assets/generated_images/Fried_chicken_wings_product_photo_fce05207.png";

// Mock products //todo: remove mock functionality
export const mockProducts: Product[] = [
  {
    id: "1",
    tenant_id: "demo-tenant",
    name: "Classic Beef Burger",
    base_price: 45000,
    category: "Burger",
    image_url: burgerImg,
    has_variants: true,
    variants: [
      { id: "v1", name: "Regular", price_delta: 0, color: "#10b981" },
      { id: "v2", name: "Large", price_delta: 10000, color: "#3b82f6" },
      { id: "v3", name: "Extra Large", price_delta: 20000, color: "#f59e0b" },
    ],
    stock_tracking_enabled: false,
    is_active: true,
  },
  {
    id: "2",
    tenant_id: "demo-tenant",
    name: "Chicken Rice Bowl",
    base_price: 35000,
    category: "Rice Bowl",
    image_url: riceImg,
    has_variants: false,
    stock_tracking_enabled: true,
    stock_qty: 25,
    is_active: true,
  },
  {
    id: "3",
    tenant_id: "demo-tenant",
    name: "Cappuccino",
    base_price: 25000,
    category: "Coffee",
    image_url: cappuccinoImg,
    has_variants: true,
    variants: [
      { id: "v4", name: "Hot", price_delta: 0 },
      { id: "v5", name: "Iced", price_delta: 3000 },
    ],
    stock_tracking_enabled: false,
    is_active: true,
  },
  {
    id: "4",
    tenant_id: "demo-tenant",
    name: "Chocolate Lava Cake",
    base_price: 38000,
    category: "Dessert",
    image_url: lavaImg,
    has_variants: false,
    stock_tracking_enabled: true,
    stock_qty: 12,
    is_active: true,
  },
  {
    id: "5",
    tenant_id: "demo-tenant",
    name: "Supreme Pizza",
    base_price: 85000,
    category: "Pizza",
    image_url: pizzaImg,
    has_variants: true,
    variants: [
      { id: "v6", name: "Small", price_delta: -15000, color: "#84cc16" },
      { id: "v7", name: "Medium", price_delta: 0, color: "#3b82f6" },
      { id: "v8", name: "Large", price_delta: 20000, color: "#f59e0b" },
    ],
    stock_tracking_enabled: false,
    is_active: true,
  },
  {
    id: "6",
    tenant_id: "demo-tenant",
    name: "French Fries",
    base_price: 18000,
    category: "Snack",
    image_url: friesImg,
    has_variants: true,
    variants: [
      { id: "v9", name: "Regular", price_delta: 0 },
      { id: "v10", name: "Large", price_delta: 8000 },
    ],
    stock_tracking_enabled: false,
    is_active: true,
  },
  {
    id: "7",
    tenant_id: "demo-tenant",
    name: "Iced Caramel Latte",
    base_price: 32000,
    category: "Coffee",
    image_url: icedLatteImg,
    has_variants: false,
    stock_tracking_enabled: false,
    is_active: true,
  },
  {
    id: "8",
    tenant_id: "demo-tenant",
    name: "Chicken Wings",
    base_price: 42000,
    category: "Snack",
    image_url: wingsImg,
    has_variants: true,
    variants: [
      { id: "v11", name: "4 pcs", price_delta: 0 },
      { id: "v12", name: "8 pcs", price_delta: 18000 },
      { id: "v13", name: "12 pcs", price_delta: 30000 },
    ],
    stock_tracking_enabled: true,
    stock_qty: 30,
    is_active: true,
  },
];

// Mock features catalog //todo: remove mock functionality
type PricedFeature = Feature & { price?: number };

export const featuresCatalog: PricedFeature[] = [
  {
    code: "receipt_compact",
    name: "Compact Receipt",
    description: "Print smaller, eco-friendly receipts",
    type: "one_time",
    group: "printing",
    price: 50000,
  },
  {
    code: "remove_watermark",
    name: "Remove Watermark",
    description: "Remove branding from receipts",
    type: "one_time",
    group: "printing",
    price: 75000,
  },
  {
    code: "kitchen_ticket",
    name: "Kitchen Ticket",
    description: "Send orders directly to kitchen printer",
    type: "one_time",
    group: "kitchen",
    price: 100000,
  },
  {
    code: "partial_payment",
    name: "Partial Payment / DP",
    description: "Accept down payments for orders",
    type: "one_time",
    group: "pos",
    price: 60000,
  },
  {
    code: "queue_number",
    name: "Queue Number",
    description: "Generate queue numbers for orders",
    type: "one_time",
    group: "pos",
    price: 40000,
  },
  {
    code: "report_history_12m",
    name: "12 Month Report History",
    description: "Access sales reports up to 12 months",
    type: "subscription",
    group: "reporting",
    price: 150000,
  },
  {
    code: "products_unlimited",
    name: "Unlimited Products",
    description: "Add unlimited products to your catalog",
    type: "subscription",
    group: "pos",
    price: 100000,
  },
  {
    code: "product_variants",
    name: "Product Variants",
    description: "Add size, color variations to products",
    type: "one_time",
    group: "pos",
    price: 80000,
  },
  {
    code: "multi_device_pos",
    name: "Multi Device POS",
    description: "Use POS on multiple devices simultaneously",
    type: "subscription",
    group: "ui",
    price: 200000,
  },
];

// Helper to get active features (initially some are active for demo) //todo: remove mock functionality
export const getActiveFeatures = (): PricedFeature[] => {
  // For demo purposes, activate some features by default
  const activeCodes = ["product_variants", "kitchen_ticket"];
  return featuresCatalog.filter((f) => activeCodes.includes(f.code));
};

export const hasFeature = (features: Feature[], code: string): boolean => {
  return features.some((f) => f.code === code);
};

export const categories = [
  "Popular",
  "Burger",
  "Pizza",
  "Rice Bowl",
  "Snack",
  "Coffee",
  "Dessert",
];

export const getProductsByCategory = (category: string): Product[] => {
  if (category === "Popular") {
    return mockProducts.slice(0, 4);
  }
  return mockProducts.filter((p) => p.category === category);
};
