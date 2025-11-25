# POS Kasir UMKM

## Overview
A web-based Point of Sale (POS) system for UMKM (Usaha Mikro, Kecil, dan Menengah) businesses like restaurants, cafes, and mini-markets. It features a responsive mobile-first design, product variant support, and a feature entitlement engine for monetization. The system aims to provide a robust, modern, and scalable POS solution for small to medium businesses.

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