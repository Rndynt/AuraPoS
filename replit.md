# AuraPoS - Multi-Tenant Point of Sale System

## Overview
AuraPoS is a modern, multi-tenant Point of Sale (POS) management system designed for cafés, restaurants, and retail businesses, supporting dine-in, takeaway, and delivery orders. Its primary purpose is to provide a robust and flexible solution for order and payment processing with a focus on real-time operations and data isolation.

Key capabilities include:
- Full order lifecycle management (draft → confirmed → preparing → completed)
- Multi-tenant architecture with complete data isolation
- Kitchen Display System (KDS) with real-time ticket management
- Flexible payment processing (full/partial, multiple methods)
- Dynamic table management for dine-in service
- 1-click quick charge for counter service
- Atomic order+payment transactions
- Responsive design for various devices.

## User Preferences
I prefer iterative development with a focus on delivering functional, tested features in small increments. Please ask before making major architectural changes or introducing new external dependencies. I value clear, concise communication and prefer detailed explanations for complex logic or design decisions. I expect the agent to maintain the established coding standards and adhere to the project's technology stack.

## Recent Fixes (Nov 29, 2025 - Current Session)

### ✅ Hub Navigation Button Fix
- Changed Hub button navigation from "/" to "/hub" in UnifiedBottomNav
- Fixes incorrect POS page display when clicking Hub button

### ✅ Table Occupancy Status Detection
- Created `getActualTableStatus()` function checking ACTIVE ORDERS instead of database status
- Table = "occupied" if has active orders (status ≠ completed/cancelled)
- Occupancy counters updated to use real-time status
- Fixed header & filter tabs to reflect actual occupancy

### ✅ Continue Order - Cart Count Display
- Removed duplicate loadOrder() call from tables-management.tsx
- POS page now handles order loading exclusively via useEffect
- Cart count shows immediately when continuing order from table

### ✅ Continue Order - Cart Items Scrolling  
- Fixed items container by adding `flex-1 min-h-0` (CartPanel & MobileCartDrawer)
- Items container now grows to fill space and scrolls when content exceeds bounds
- Supports unlimited items with smooth scrolling

### ✅ Continue Order - Toast Error Messages
- Added optional chaining for all order responses (`orderResult.order?.id`)
- Fallback to order ID if order_number missing
- Fixed LSP errors in partial payment handler

### ✅ Product Images Loading When Continuing Order
- Added product enrichment in pos.tsx after loading order
- Creates Map of fetched products indexed by ID
- Enriches cart items with full product data including `image_url`
- Ensures images display properly even if API response doesn't include them

### ✅ Table Order Details - Show All Items
- Removed slice(0,3) limitation and show all items
- Removed "+X more items" text
- Users now see complete item list with all order details

### ✅ Table Order Details - Show Variant & Option Details
- Each order item now displays complete details:
  - **Product name + quantity** (bold)
  - **Variant name** (if exists) - prefixed with bullet point
  - **Selected options** (if exist) - each on separate line with bullet point
- Light gray background cards for better readability
- Handles multiple field name variations (camelCase and snake_case)

### ✅ Paid Order - Hide Continue Order Button
- If order.paymentStatus === "paid", the "Continue Order" button is completely hidden
- Only UNPAID orders show the "Continue Order" button
- Users must create a new order for tables with paid orders
- Clean, intuitive UX - no disabled states

### ✅ Feature Flag System - Table Management & Kitchen Display
- **Problem**: Table Management and Kitchen Display features were still accessible even when disabled in tenant_module_configurations
- **Solution**: Implemented multi-layer feature flag checks:
  1. **Route Protection** (App.tsx): 
     - Created `ProtectedTablesRoute` and `ProtectedKitchenRoute` components
     - Routes render NotFound (404) if feature is disabled in `hasModule()` check
  2. **Navigation UI** (UnifiedBottomNav.tsx):
     - Added `isTablesEnabled` flag check for mobile bottom nav
     - Tables button only shows if `hasModule("enable_table_management")` is true
  3. **Sidebar** (Sidebar.tsx):
     - Already had feature flag checks for both table management and kitchen display
- **Result**: Feature flags now work across ALL access points - routes are protected AND UI buttons hide when disabled in tenant config

### ✅ Product Variant Selection - Responsive Drawer + Dialog
- **Mobile/Tablet (< 1024px)**: Shows as **Drawer** (slides from bottom)
  - Smooth UX for touch devices
  - Easy to dismiss with swipe
  - Matches CartPanel styling: white bg, slate borders, blue actions
- **Desktop (≥ 1024px)**: Shows as **Dialog** (centered modal)
  - Traditional focused experience
  - Efficient space use on larger screens
- **Styling**: Completely unified with CartPanel
  - White background (bg-white)
  - Slate borders and accents (slate-100, slate-200, slate-50)
  - Blue primary actions (blue-600, blue-700)
  - Consistent rounded corners (rounded-xl, rounded-2xl)
- **Implementation**: 
  - Uses `useIsMobile()` hook for responsive logic
  - Content component shared between Drawer and Dialog
  - Maintains all variant/option selection logic

## System Architecture

### UI/UX Decisions
The frontend is built with React 19, TypeScript, Vite, and TailwindCSS for a responsive design that adapts across mobile, tablet, and desktop. UI components are built using `shadcn/ui` (Radix primitives + Tailwind) and `Lucide React` for icons.
- **Mobile (< 768px)**: Bottom navigation, slide-out cart, drawer panels.
- **Tablet (768-1024px)**: Split view with a collapsible cart, drawer panels.
- **Desktop (> 1024px)**: Full sidebar layout, centered dialogs.
- The system simplifies user interaction by auto-selecting the first order type and required product options where applicable, and ensures "Simpan" (draft save) works independently without dialogs. Payment dialogs are designed for a streamlined flow, appearing before order creation and adapting to full-screen on mobile.

### Technical Implementations
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, React Query, React Hook Form, Zod validation.
- **Backend**: Express.js, TypeScript, Node.js 20, using a middleware pattern, repository pattern for data access, and a use case layer for business logic.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema definitions and data access.
- **Build**: Turborepo for monorepo management.
- **Order Flow**: Orders progress through DRAFT, CONFIRMED, IN_PROGRESS, and COMPLETED states. Payment recording supports partial payments, and quick charge allows atomic order creation and payment.
- **Data Isolation**: All core tables include `tenant_id` for multi-tenant isolation, ensuring queries are filtered by tenant context and preventing cross-tenant data visibility.
- **Feature Flags**: Multi-tenant feature management via `tenant_module_configurations` table, checked at route and UI layer using `hasModule()` from TenantContext.

### Feature Specifications
- **POS Terminal (`/pos`)**: Product browsing, shopping cart management, order type selection, customer/table assignment, payment method selection, quick charge, partial payment, real-time order queue.
- **Kitchen Display (`/kitchen`)**: Real-time order ticket queue, ticket status management, item preparation tracking, ready notification system. Feature flag: `enable_kitchen_ticket`
- **Table Management (`/tables`)**: Dynamic table layout, occupancy status, order continuation from tables. Feature flag: `enable_table_management`
- **Order Queue Panel**: Real-time order display with payment status visibility, integrated into the POS sidebar.
- **Business Type Templates**: Script for quick setup of various business types (Cafe/Restaurant, Retail, Laundry, Service, Digital/PPOB) with default order types and configurations.

### System Design Choices
- The project follows a modular structure with `apps/` for frontend and backend, `packages/` for shared domain logic, and `shared/` for database schema.
- Uses `Turborepo` for monorepo management.
- Core utilities are centralized in `packages/core/utils/` for consistency.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **HTTP Client**: Node-fetch
- **UI Libraries**: shadcn/ui (based on Radix primitives), Lucide React (for icons)
