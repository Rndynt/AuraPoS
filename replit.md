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