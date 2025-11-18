/**
 * Tenants Domain Models
 * Multi-tenant management and feature flag system
 */
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
};
