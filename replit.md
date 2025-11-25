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

- ✅ **FULL KITCHEN DISPLAY IMPLEMENTATION - COMPLETE!** (Nov 25, 2025 - NEW)
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
