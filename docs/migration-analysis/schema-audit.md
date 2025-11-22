# Schema & API Audit Report

## Executive Summary
✅ **No schema changes required!** Current database schema fully supports all base-design.md requirements.

## Data Shape Comparison

### Products
**base-design.md requirements:**
- Product name, price, category, stock, image
- Variants with options (radio/checkbox types)
- Stock tracking

**Current schema support:**
- ✅ All fields present in `products` table
- ✅ Product.option_groups for modern variant system
- ✅ Product.variants for legacy compatibility  
- ✅ stock_tracking_enabled + stock_qty

**UI Mapping:**
- Display stock: use `product.stock_qty` when `stock_tracking_enabled`
- Category chips: derive from `product.category` (client-side)
- Variant modal: use `product.option_groups`

### Orders
**base-design.md requirements:**
- Order number, items with variants, totals
- Order types (dine-in, takeaway, delivery)
- Customer name, table number
- Payment status

**Current schema support:**
- ✅ All fields in `orders` table
- ✅ OrderType with isOnPremise, needTableNumber flags
- ✅ Payment tracking with partial payment support
- ✅ Kitchen tickets for order preparation

**UI Mapping:**
- Order type selector: fetch via `useOrderTypes()` hook
- Cart summary: use subtotal, tax_amount, service_charge, total
- Payment: use payment_status and paid_amount

### Tables
**base-design.md requirements:**
- Table number/name, capacity
- Status (available, occupied, reserved, maintenance)
- Current orders

**Current schema support:**
- ✅ All fields in `tables` table
- ✅ Status enum matches design requirements
- ✅ currentOrderId for linking active orders
- ✅ Floor, capacity for organization

**UI Mapping:**
- Table grid: fetch via `useTables()` hook
- Table detail: join with orders via currentOrderId
- Status badges: map status string to colors

## Missing UI Elements (Not Data)
These are purely presentational and handled client-side:

1. **Category Icons** - Map category names to lucide-react icons
2. **Status Colors** - Define color mapping for table/order statuses  
3. **Product Badges** - Display helpers (stock count, has variants indicator)
4. **Currency Formatter** - formatIDR helper function

## API Endpoints Status
All required endpoints exist:
- ✅ GET /api/catalog/products
- ✅ GET /api/orders
- ✅ POST /api/orders
- ✅ GET /api/tables
- ✅ GET /api/tenants/order-types

## Recommendations
1. **No schema migrations needed** - Proceed with UI migration
2. **Create utility mappers** - Category→Icon, Status→Color
3. **Leverage existing hooks** - useProducts, useOrders, useTables
4. **Feature flag new UI** - Roll out incrementally per view
