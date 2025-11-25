# POS Kasir UMKM

### Overview
This project is a web-based Point of Sale (POS) system designed for UMKM (Usaha Mikro, Kecil, dan Menengah) businesses such as restaurants, cafes, and mini-markets. It features a responsive mobile-first design, comprehensive product variant support, and a feature entitlement engine for monetization. The system aims to provide a robust, modern, and scalable POS solution, enabling small to medium businesses to efficiently manage sales and operations.

### User Preferences
- Language: Indonesian (Bahasa Indonesia)
- Currency: Indonesian Rupiah (IDR)
- Tenant: demo-tenant (hardcoded, TODO: integrate AuthCore)

### System Architecture

#### UI/UX Decisions
- **Responsive Design**: Mobile-first approach, adapting layouts for desktop, tablet, and mobile. Features a fixed 3-column layout for larger screens and a single-column with a floating cart button and bottom drawer for mobile.
- **Color Scheme**: Uses Blue-600/slate-300 for interactive elements, maintaining visual consistency.
- **Components**: Leverages shadcn/ui and Radix UI primitives for a consistent, accessible design system.
- **Product Display**: Clean product cards include images, name, price, stock status, variant counts, and inline availability toggles with visual feedback.
- **Tab-based Interfaces**: Utilized for product and variant management (e.g., "Daftar Produk" and "Perpustakaan Varian").
- **Toast System**: A context-based global notification system provides user feedback (success, error, info).
- **Kitchen Display**: Full-screen kitchen display system with responsive grid layout and status-based order cards.
- **Order List Page**: Redesigned to match table page styling with a header, status filter tabs, search functionality, and button-based order cards.
- **Detail Panels**: Consistent styling with table pages, including mobile-friendly overlays and responsive positioning.

#### Technical Implementations
- **Monorepo Structure**: Managed with pnpm workspace and TurboRepo, organizing `apps` (pos-terminal-web, api) and `packages` (application, domain, infrastructure, core, features, shared).
- **Domain-Driven Design (DDD)**: Clear separation of concerns across `application`, `domain`, `infrastructure`, and `features` packages.
- **Type Safety**: Implemented with TypeScript across the codebase for robustness and maintainability.
- **State Management**: Utilizes React hooks and TanStack Query for efficient data fetching and client-side state management, including optimistic updates for toggles.
- **API Design**: Express.js backend with a NestJS-ready structure, providing RESTful APIs.
- **Feature Entitlement Engine**: A module configuration system dynamically enables/disables UI elements and backend logic based on activated tenant features, supporting monetization.
- **Multi-tenancy**: Database schema and API endpoints support multiple tenants with different business types (e.g., CAFE_RESTAURANT, RETAIL_MINIMARKET) and module configurations.
- **Order Queue**: Integrated into the POS page above categories, displaying active orders.

#### Feature Specifications
- **Product Management**: Create, edit, and delete products, manage product variants with price adjustments, track stock, organize by category, and search. Includes inline availability toggles and confirmation dialogs for deletion.
- **Shopping Cart**: Add/remove items, adjust quantities, select variants, with real-time price calculations (including 10% tax and 5% service charge). Supports collapsible order details and a responsive cart panel/drawer.
- **Order Management**: View order lists with status filtering (all, confirmed, in_progress, completed, cancelled) and detailed order views showing customer info, items, pricing, and status.
- **Kitchen Display System**: Full-screen display at `/kitchen` with responsive order ticket grids, real-time status updates (confirmed → preparing → ready → completed), and quick actions for status changes.
- **Order Queue**: Horizontal scrollable queue of active orders displayed on the POS page.
- **Feature Flags**: Critical features like "Kitchen Ticket" and "Table Management" are feature-flag protected, controlling UI visibility and route access.
- **Core Features**: Product Variants, Kitchen Ticket.
- **Future Unlockable Features**: Compact Receipt, Remove Watermark, Partial Payment / DP, Queue Number, 12 Month Report History, Unlimited Products, Multi Device POS.

### External Dependencies
- **Frontend**: React, TypeScript, Vite, Wouter (routing), Tailwind CSS, shadcn/ui, Radix UI, Lucide React (icons), Vaul (mobile drawer).
- **Backend**: Express.js.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **Build System**: TurboRepo.
- **Package Manager**: pnpm.
- **State Management**: TanStack Query.

### Recent Fixes & Improvements (Nov 25, 2025)

#### Product & Variant Toggle Optimization
- **Problem 1 - Product Card Reordering**: Product cards were reordering when toggling availability. Products displayed alphabetically by name, but after toggle success, backend refetch would return data in database order (different sequence), causing cards to visually reorder.
  - **Root Cause**: 
    1. Toggle operation triggered optimistic cache update
    2. Mutation succeeded, `onSuccess` callback invalidated cache
    3. React Query refetched products from backend
    4. Backend returned products in database order (not alphabetical)
    5. UI updated with new order, cards appeared to "sort"
  - **Solution**: 
    - Save original product array order before toggle
    - After mutation succeeds and cache is refetched, re-map product data using product ID mapping
    - Restore original alphabetical order by matching product IDs
    - Ensures product cards maintain stable position despite backend refetch
  - **Implementation**:
    - Modified `handleToggleProductAvailability` to maintain order post-refetch
    - Modified `handleToggleVariantOptionAvailability` to maintain order post-refetch

- **Problem 2 - Variant Option Toggle Freeze & Revert**: Variant option toggle was not responding instantly (freeze), and after toggling OFF, it would revert back ON by itself after a few seconds.
  - **Root Cause**: 
    1. `useVariantsLibrary` didn't extract `available` field → caused freeze on UI
    2. `useCreateOrUpdateVariant` mutation didn't send `available` field to backend → caused data loss
    3. VariantFormData type didn't accept `available` field → type error
    4. When mutation sent without available, backend returned without available status
    5. Cache refetch brought back default (available: true), toggle reverted
  - **Solution**: 
    - Updated `useVariantsLibrary` to include `available` field when mapping options
    - Updated `VariantFormData` interface to accept `available?: boolean` in options
    - Updated optionGroup mapping to include `available: opt.available !== false`
    - Updated backend send to include available status in all option mappings
  - **Implementation**:
    - Modified `useVariantsLibrary` useMemo to extract: `available: opt.available !== false`
    - Modified `VariantFormData` type: added `available?: boolean` to options
    - Modified optionGroup building: included `available` field in options mapping
    - Modified backend payload: included `available` in all option mappings
    - Now when toggle happens: cache updates → mutation sends available → backend stores → UI persists

- **Problem 3 - Variant Option Toggle Not Persisting & Reverting (Nov 25, 2025 - FINAL FIX)**: Toggle OFF → reverts to ON automatically within seconds. Data not saved to database.
  - **Root Cause (3-layer bug)**:
    1. **Type Mismatch**: `VariantFormData` interface had `available?: boolean` but backend sends/expects `is_available`
    2. **Frontend Mutation**: `products.tsx` sent `is_available: opt.available` (correct field name)
    3. **Backend Processing**: `useVariants.ts` tried to read `opt.available` but received `opt.is_available`
       - When reading: `opt.available !== false` where `opt.available = undefined`
       - Result: `undefined !== false = true` → ALWAYS set `is_available: true`!
    4. **Data Loss**: Data never persisted to database with correct value
    5. **Cache Refetch**: When page accessed, fresh data from server showed original ON state
    6. **Revert Effect**: Toggle appeared to revert to ON by itself
  - **Solution**: 
    - Fixed type definition: `VariantFormData` options now have `is_available?: boolean`
    - Fixed mutation read: Backend now reads `opt.is_available` (not `opt.available`)
    - Entire flow now consistent: send `is_available` → receive `is_available` → persist correctly
  - **Implementation**:
    - Modified `useVariants.ts` line 31: Type definition from `available` → `is_available`
    - Modified `useVariants.ts` line 90: Read `opt.is_available !== false` (was `opt.available`)
    - Modified `useVariants.ts` line 143: Read `o.is_available !== false` (was `o.available`)
    - Modified `products.tsx` line 254: Send `is_available: opt.available` (correct)
    - Kept `invalidateQueries` (non-blocking) for smooth UI
  
- **Result**: 
  - Product cards stay in alphabetical order when toggled
  - Variant option toggle responds instantly without freeze
  - Variant option state persists after page refresh (data saved to database and synced)
  - Both product and variant toggles use optimistic cache updates with backend persistence
  - UI reflects state changes immediately with toast feedback
  - API mutations happen in background with auto-revert on error

#### Loading Animation Enhancement (Nov 25, 2025)
- **Implementation**: Added smooth loading feedback during toggle operations
  - Added `isLoading` prop to `ToggleSwitch` component
  - Track loading state per toggle (product toggles and variant option toggles independently)
  - Loading animation: gentle pulse effect + reduced opacity on circle (50%)
  - Disabled state: button shows not-allowed cursor during processing
  - Animation clears on completion or error
- **Files Modified**: 
  - `toggle-switch.tsx` - Added loading state and pulse animation
  - `products.tsx` - Track loading state with Set for product and variant toggles
  - `VariantLibrary.tsx` - Pass loading state to variant option toggles
- **User Experience**: 
  - Clear visual feedback that toggle is processing
  - Professional pulse animation (not spinner icon)
  - Prevents accidental double-clicks during mutation
  - Toast notification confirms success/error