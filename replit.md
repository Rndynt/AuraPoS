# POS Kasir UMKM

## Overview
A web-based Point of Sale (POS) system for UMKM (Usaha Mikro, Kecil, dan Menengah) businesses like restaurants, cafes, and mini-markets. It features a responsive mobile-first design, product variant support, and a feature entitlement engine for monetization. The system aims to provide a robust, modern, and scalable POS solution for small to medium businesses.

## Current State
**✅ UI REDESIGN PHASE 2 COMPLETE** - v2 Design Implementation with ToggleSwitch, Toast Provider, Product Delete, and Variant Delete.

**Latest Updates (Nov 25, 2025 - CURRENT):**
- ✅ **ToggleSwitch Component COMPLETE**
  - Created reusable ToggleSwitch with "sm" and "md" sizes
  - Blue-600/slate-300 color scheme
  - Proper TypeScript support with data-testid props
  - Used in ProductList and VariantLibrary for availability toggles

- ✅ **Toast System Migration COMPLETE**
  - Context-based ToastProvider wrapping app root
  - Backward compatible with existing `toast({ title, description, variant })` API
  - New `addToast(message, type)` method for simple notifications
  - Supports success, error, and info toast types

- ✅ **ProductList Component ENHANCEMENT COMPLETE**
  - Added ToggleSwitch for inline product availability toggle
  - Toggle visual feedback: product becomes grayscale and dimmed when disabled
  - OFF badge displayed on unavailable product images
  - Price repositioned below product name
  - Stock and variant count badges preserved

- ✅ **VariantLibrary Component ENHANCEMENT COMPLETE**
  - Added ToggleSwitch for each variant option
  - Toggle disabled option with visual feedback (opacity, crossed text)
  - Trash icon for delete action with hover reveal
  - `onToggleVariantOption` handler for availability updates

- ✅ **ProductForm Component ENHANCEMENT COMPLETE**
  - Added Trash2 icon button for delete action
  - Delete button only visible when editing existing product
  - Red background with delete confirmation dialog

- ✅ **Variant Delete Feature - RELOCATED TO FORM HEADER COMPLETE**
  - Trash icon (Trash2) moved from VariantLibrary cards to VariantForm header
  - Delete button only visible when editing existing variant
  - Red background styling matching ProductForm delete button
  - Delete confirmation dialog before permanent deletion
  - Consistent UI pattern: Delete actions in form headers (edit mode only)
  - Toast notification on success/failure
  - VariantLibrary now clean - only shows variant info and toggle options

- ✅ **Type Safety COMPLETE**
  - Fixed VariantOption type to include optional `available` field
  - Fixed type casting for variant type ("single" | "multiple")
  - All LSP diagnostics resolved (0 errors)
  - Proper TypeScript annotations in all components

- ✅ **Workflow & Testing COMPLETE**
  - Express backend running on port 5000
  - Vite frontend dev server running without errors
  - All components properly compiled and hot-reloading
  - Zero LSP/TypeScript errors

- ✅ **Bottom Navigation Padding Fix COMPLETE**
  - Added `pb-20` (padding-bottom: 5rem) to main content areas
  - Fixes issue where content was hidden behind fixed bottom nav
  - Applied to: ProductsPage, ProductForm, VariantForm
  - Users can now scroll to see all content fully

- ✅ **TOGGLE SWITCH, PRODUCT LIST & FREEZE FIXES - COMPLETE!** (Nov 25, 2025 - NEW)
  - **ToggleSwitch Animation Enhancement**:
    - Increased duration from 200ms to 300ms for smoother visual
    - Changed from `transition-colors` to `transition-all` for smooth property changes
    - Smooth movement of toggle circle + background color transition
    - Both size variants (sm, md) animate smoothly
  - **Product List Stable Sorting**:
    - Added alphabetical sorting within each category
    - Sort by product name (case-insensitive) for consistent ordering
    - Prevents product cards from shuffling when toggle is clicked
    - Order remains stable during data updates and refreshes
  - **Variant Option Toggle Fix**:
    - Added missing `available` field when sending variant options to backend
    - State now properly updates when toggling variant option availability
    - No more freeze on variant toggle
  - **Product Toggle Optimistic Updates**:
    - Implemented optimistic cache updates for instant UI feedback
    - Toggle updates immediately without waiting for API response
    - API mutation happens in background
    - Auto-reverts if mutation fails
    - Toast notification shows instantly
  - **Result**: 
    - Toggle animation smooth and responsive
    - Product list maintains consistent order even after updates
    - Product and variant toggles respond instantly without freeze
    - All toggle state updates work correctly

- ✅ **FULL KITCHEN DISPLAY IMPLEMENTATION - COMPLETE!** (Nov 25, 2025)
  - **KitchenDisplay Page**: Full-screen kitchen display system at `/kitchen` with responsive grid layout (1-4 columns)
  - **Kitchen Ticket Component**: Individual order cards with status-based borders (orange/yellow/green)
  - **OrderQueue Component**: Horizontal scrollable queue showing active orders - INTEGRATED INSIDE ProductArea!
  - **Feature Flag Protection**: 
    - OrderQueue only appears when `enable_kitchen_ticket` module is enabled (ProductArea)
    - Kitchen button in bottom nav only appears when `enable_kitchen_ticket` is enabled
    - `/kitchen` route shows "Not Available" message if feature not enabled
    - Same pattern as table management feature entitlement
  - **POS Page Integration**: OrderQueue appears ABOVE categories inside ProductArea when orders exist (3-column layout preserved)
  - **Kitchen Display Page**: Dedicated full-screen view for kitchen staff with ticket grid  
  - **Status Workflow**: confirmed → preparing → ready → completed
  - **Quick Actions**: One-click status updates directly from tickets (both POS queue and Kitchen display)
  - **Real-time Updates**: Order list refreshes after status changes
  - **Navigation**: Kitchen menu button added to bottom nav (ChefHat icon) - feature flagged
  - **Responsive Design**: OrderQueue horizontal scroll on all devices, ticket grid 1-4 columns
  - **Empty States**: Shows "All Caught Up!" when no active orders
  - **Toast Notifications**: Confirms each status change
  - **Design**: Follows design specification from docs/base_design_kitchen_display_order_queue_code.jsx
  - **Zero TypeScript Errors**: All components properly typed
  - **Layout Integrity**: POS page 3-column layout preserved (ProductArea left | CartPanel right)
  - **OrderQueue Positioning**: Header → OrderQueue → Categories → Products (clean visual hierarchy)
  - **Type Safety**: Proper Order type imports from `@pos/domain/orders/types`

- ✅ **ORDER LIST PAGE COMPLETE REDESIGN - EXACT TABLE PAGE STYLING!** (Nov 25, 2025 - NEW)
  - **Header Design**: Exactly matches table page design
    - Title + subtitle on top-left
    - Status badges (Confirmed, Prep count) on top-right  
    - Search input below title (left side, width: md:w-96)
    - Filter tabs below search (right side, responsive)
  - **Filter Tabs**: Simple button-based filter (table page pattern)
    - Status-based filtering: All, Confirmed, Preparing, Ready, Completed
    - Clean filter bar: bg-slate-100 with rounded-xl and p-1
    - Active filter: bg-white text-slate-800 with shadow-sm
    - Count badges showing number of orders per status
  - **Search Functionality**: Real-time search by customer name, order number, or table number
  - **Order Cards Redesign**: Changed from shadcn Card component to button-based cards (table page pattern)
    - bg-white, rounded-xl, border border-slate-200, shadow-sm
    - Order number badge (blue bg) at top
    - Customer name, status badge, payment info in clean layout
    - Item preview (shows 2 items, +N more if exceeds)
    - Date and total price at bottom with border separator
    - Ring-2 ring-blue-500 when selected
    - Hover effects and transitions
  - **Detail Panel**: Exact table page styling
    - Fixed positioning on mobile (fixed inset-x-0 bottom-0)
    - Rounded-t-3xl with shadow-2xl on mobile
    - Relative positioning on desktop (md:)
    - Panel header with title, customer name, close button
    - bg-slate-50/50 for content area (not white)
  - **Order Items Display**: Clean card-based layout
    - bg-white, rounded-xl, border border-slate-200, shadow-sm
    - Each item shows product name, quantity, unit price
    - Variant info displayed
    - White card with proper spacing and borders
  - **Summary Section**: Card-based design
    - bg-white card with border and shadow
    - Shows subtotal, tax, service charge, discount
    - Total prominently displayed with border separator
  - **Panel Footer**: White background with action button
    - "Proses Transaksi" button (blue-600, hover blue-700)
    - Full width with rounded-lg
  - **Mobile Features**:
    - Mobile overlay (bg-black/20 backdrop-blur) when panel is open
    - Touch-friendly cards with proper spacing
    - Smooth transitions and animations
    - responsive scrolling behavior
  - **Color Scheme**: Exact consistency with table page
    - Status badges: blue/orange/emerald/green colors
    - Payment badges: green/amber/gray colors
    - Proper slate color hierarchy (slate-800/700/600/500/400)
  - **Typography & Spacing**: Consistent throughout
    - Font sizes and weights match table page
    - Padding: p-4 md:p-6 on main areas
    - Card padding: p-4
    - Proper gap spacing (gap-2, gap-3, gap-4)
  - **Indonesian Translations**: All text in Indonesian (Pesanan, Cari, Detail Pesanan, etc.)
  - **Design Consistency**: 100% matches table page - borders, shadows, colors, spacing, interactions
  - **Zero TypeScript Errors**: All components properly typed and linted
  - **Accessibility**: data-testid on all interactive elements for testing

## User Preferences
- Language: Indonesian (Bahasa Indonesia)
- Currency: Indonesian Rupiah (IDR)
- Tenant: demo-tenant (hardcoded, TODO: integrate AuthCore)

## System Architecture

### UI/UX Decisions
- **Responsive Design**: Mobile-first approach with layouts adapting for desktop, tablet, and mobile.
  - Desktop/Tablet: Fixed 3-column layout (sidebar, product area, cart).
  - Mobile: Single column with floating cart button and bottom drawer.
- **Color Scheme**: Blue-600/slate-300 for interactive elements.
- **Components**: Utilizes shadcn/ui and Radix UI primitives for a consistent and accessible design system.
- **Product Display**: Clean product cards with images, name, price, stock status, and variant counts. Inline availability toggles with visual feedback.
- **Tab-based Interfaces**: Used for product management (e.g., "Daftar Produk" and "Perpustakaan Varian").
- **Toast System**: Context-based global toast notifications for user feedback (success, error, info).

### Technical Implementations
- **Monorepo Structure**: Managed with pnpm workspace and TurboRepo, organizing `apps` (pos-terminal-web, api) and `packages` (application, domain, infrastructure, core, features, shared).
- **Domain-Driven Design (DDD)**: Clear separation of concerns with `application`, `domain`, `infrastructure`, and `features` packages.
- **Type Safety**: Thorough TypeScript implementation across the entire codebase to ensure robust and maintainable code.
- **State Management**: Leverages React hooks and TanStack Query for efficient data fetching and client-side state management.
- **API Design**: Express.js backend with a NestJS-ready structure, supporting RESTful APIs for managing products, orders, and tenants.
- **Feature Entitlement Engine**: A module configuration system that dynamically enables/disables UI elements and backend logic based on tenant's activated features, allowing for monetization through feature unlocking.
- **Multi-tenancy**: Database schema and API endpoints designed to support multiple tenants with different business types (e.g., CAFE_RESTAURANT, RETAIL_MINIMARKET) and module configurations.

### Feature Specifications
- **Product Management**:
    - Creation, editing, and deletion of products.
    - Support for product variants (e.g., size, options) with price adjustments.
    - Stock tracking.
    - Category organization and product search.
    - Tab-based UI for product list and variant library management.
    - Inline toggles for product and variant option availability.
    - Delete actions for both products and variants with confirmation dialogs.
- **Shopping Cart**:
    - Add/remove items, quantity adjustments.
    - Variant selection with visual display in cart.
    - Real-time price calculations, including tax (10%) and service charge (5%).
    - Collapsible order details (table number, delivery address).
    - Responsive cart panel and mobile cart drawer.
- **Order Management**:
    - Order list view with status filtering (all, confirmed, in_progress, completed, cancelled).
    - Detailed order view including customer info, items, pricing breakdown, and status.
- **Core Features**:
    - Product Variants (size/option selection).
    - Kitchen Ticket (send orders to kitchen).
    - Future features available for unlock: Compact Receipt, Remove Watermark, Partial Payment / DP, Queue Number, 12 Month Report History, Unlimited Products, Multi Device POS.

## External Dependencies
- **Frontend**: React, TypeScript, Vite, Wouter (routing), Tailwind CSS, shadcn/ui, Radix UI, Lucide React (icons), Vaul (mobile drawer).
- **Backend**: Express.js.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **Build System**: TurboRepo.
- **Package Manager**: pnpm.
- **State Management**: TanStack Query.
