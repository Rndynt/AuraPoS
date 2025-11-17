# POS Kasir UMKM

## Overview
A web-based Point of Sale (POS) system designed for UMKM (Usaha Mikro, Kecil, dan Menengah) businesses such as restaurants, cafes, and mini-markets. The system features a fully responsive mobile-first design, product variant support, and a feature entitlement engine for monetization.

## Current State
**✅ Fully Operational** - Monorepo migrated, database configured, and fully responsive UI implemented.

**Latest Updates (Nov 17, 2025):**
- ✅ Database setup complete (PostgreSQL + seeded data)
- ✅ Responsive mobile/tablet/desktop layout
- ✅ Clean product card redesign
- ✅ Mobile hamburger menu navigation

### Completed Features
- ✅ Responsive 3-column POS layout (sidebar, product area, cart)
- ✅ Mobile-optimized interface with bottom drawer cart
- ✅ Product catalog with 8 sample items across categories
- ✅ Product variant selection (size, price adjustments)
- ✅ Shopping cart with real-time calculations
- ✅ Feature-based UI (shows/hides buttons based on active features)
- ✅ Category filtering and product search
- ✅ Stock tracking display
- ✅ Professional product imagery

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express (NestJS-ready structure)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Build System**: TurboRepo
- **Package Manager**: pnpm workspace (runs on npm currently)
- **Routing**: Wouter
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React hooks + TanStack Query
- **UI Components**: Radix UI primitives (shadcn/ui)
- **Icons**: Lucide React
- **Mobile Drawer**: Vaul

## Project Structure
```
/
├── apps/
│   ├── pos-terminal-web/     → Vite + React PWA (POS Terminal)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── pos/     → POS-specific components
│   │   │   │   └── ui/      → shadcn components (40+)
│   │   │   ├── hooks/       → useCart, useFeatures, API hooks
│   │   │   ├── lib/         → Utilities
│   │   │   └── pages/       → Route pages
│   │   ├── package.json      → @pos/terminal-web
│   │   └── vite.config.ts
│   │
│   ├── api/                  → Express Backend (NestJS-ready)
│   │   ├── src/
│   │   │   ├── http/
│   │   │   │   ├── controllers/  → API controllers
│   │   │   │   ├── middleware/   → Tenant, error handling
│   │   │   │   └── routes/       → Route definitions
│   │   │   ├── index.ts      → Server entry point
│   │   │   └── seed.ts       → Database seeding
│   │   └── package.json      → @pos/api
│   │
│   └── web/                  → Next.js (minimal, future use)
│
├── packages/                 → DDD Layers
│   ├── application/         → Use Cases (GetProducts, CreateOrder, etc.)
│   ├── domain/              → Domain Models (Product, Order, Tenant, etc.)
│   ├── infrastructure/      → Repositories + Database
│   ├── core/                → Shared Types
│   └── features/            → Feature Flags
│
├── shared/                  → Drizzle Schemas
├── migrations/              → Database Migrations
├── docs/                    → Documentation
├── pnpm-workspace.yaml      → Workspace config
├── turbo.json               → TurboRepo config
└── package.json             → Root package
```

## Features

### Product Management
- Support for product variants (sizes, options)
- Price deltas for variants
- Optional stock tracking
- Category organization
- Product search functionality

### Shopping Cart
- Add/remove items
- Quantity adjustments
- Variant selection
- Real-time price calculations
- Tax (10%) and service charge (5%)

### Feature Entitlement System
Current active features (demo):
- ✅ **Product Variants** - Size/option selection
- ✅ **Kitchen Ticket** - Send orders to kitchen

Available features to unlock:
- Compact Receipt
- Remove Watermark
- Partial Payment / DP
- Queue Number
- 12 Month Report History (subscription)
- Unlimited Products (subscription)
- Multi Device POS (subscription)

### Responsive Design
- **Desktop/Tablet**: Fixed 3-column layout (80px sidebar + flex content + 360px cart)
- **Mobile**: Single column with floating cart button and bottom drawer

## User Preferences
- Language: Indonesian (Bahasa Indonesia)
- Currency: Indonesian Rupiah (IDR)
- Tenant: demo-tenant (hardcoded, TODO: integrate AuthCore)

## Development Notes

### Mock Data
All current functionality uses mock data marked with `//todo: remove mock functionality`:
- 8 sample products with images
- 9 features in catalog
- 2 active features by default (product_variants, kitchen_ticket)
- In-memory cart state

### Database Setup (REQUIRED)

⚠️ **CRITICAL**: The application is currently non-functional due to missing database configuration.

**Steps to Fix:**

1. **Set up Replit PostgreSQL:**
   ```bash
   # Use Replit's Database tool to create a PostgreSQL instance
   # Or set DATABASE_URL manually in Secrets
   ```

2. **Run Migrations:**
   ```bash
   npm run db:push
   ```

3. **Seed Sample Data:**
   ```bash
   npm run db:seed
   ```

4. **Verify:**
   - Visit http://localhost:5000/api/health (should return 200 OK)
   - Visit http://localhost:5000 (should show products instead of errors)

**Current Errors Without Database:**
```
[500] Failed to get products: Cannot read properties of null (reading 'map')
[500] Failed to get active features: Cannot read properties of null (reading 'map')
```

These errors will disappear once DATABASE_URL is configured.

### TODO: Post-Migration Tasks
- [x] Monorepo migration to pnpm/TurboRepo
- [x] Restructure apps (client→apps/pos-terminal-web, server→apps/api)
- [ ] **Configure DATABASE_URL** (CRITICAL - blocking all API functionality)
- [ ] Extract shared UI to packages/ui/
- [ ] Complete NestJS migration
- [ ] Add authentication via AuthCore
- [ ] Implement multi-variant product system
- [ ] Add automated testing
- [ ] Implement order submission flow

## Running the Application

**Current Status:** ✅ Server Running | ❌ API Non-Functional (Missing DATABASE_URL)

The "Start application" workflow runs:
```bash
npm run dev  # Starts Express + Vite on port 5000
```

**Access Points:**
- Frontend: http://localhost:5000 (loads but shows API errors)
- API Health: http://localhost:5000/api/health
- API Docs: See `/docs/comprehensive-architecture-analysis.md`

**⚠️ Before Using:**
Configure DATABASE_URL (see Database Setup section above)

## Documentation

- **Architecture Analysis:** `/docs/comprehensive-architecture-analysis.md` - In-depth analysis of current architecture, domain boundaries, and migration plan
- **Migration Report:** `/docs/migration-report.md` - Detailed report of completed monorepo migration
- **POS Architecture (Indonesian):** `/docs/pos-architecture-analysis.md` - Original architecture recommendations

## Recent Changes (November 17, 2025)

### Phase 1: Project Setup & Database Configuration
**Monorepo Migration Completed:**
- ✅ Restructured to pnpm workspace + TurboRepo
- ✅ Moved `client/` → `apps/pos-terminal-web/`
- ✅ Consolidated `server/` → `apps/api/src/`
- ✅ Preserved all DDD packages (application, domain, infrastructure, core, features)
- ✅ Application runs on port 5000 with Vite HMR

**Database Setup:**
- ✅ Created Replit PostgreSQL database
- ✅ Pushed schema using Drizzle Kit
- ✅ Seeded database with 8 products and demo tenant
- ✅ Fixed Tailwind CSS configuration paths
- ✅ All API endpoints now working (200 OK)

### Phase 2: Responsive UI Improvements
**Mobile-First Responsive Design:**
- ✅ **Sidebar Navigation**
  - Desktop: Fixed left sidebar (80px width)
  - Mobile: Hamburger menu button (top-left) with slide-out drawer
  - Smooth Sheet animation with full menu labels on mobile
  
- ✅ **ProductCardV2 Redesign**
  - Removed hardcoded variant selectors (Cup Size, Ice Level)
  - Clean, minimal design: image + name + price + "Variants" badge + button
  - All variant selection moved to modal dialog
  - Compact 16:9 product images
  
- ✅ **ProductOptionsDialog - Fully Responsive**
  - Mobile: 95vw width, compact padding, responsive text sizes
  - Tablet/Desktop: max-w-lg with comfortable spacing
  - Buttons stack vertically on mobile, horizontal on desktop
  - Price breakdown adapts to screen size
  
- ✅ **Layout Adjustments**
  - Top bar: Space for hamburger button on mobile (pl-16)
  - Category tabs: Responsive sizing and horizontal scroll
  - Product grid: 2 cols (mobile) → 3 cols (tablet) → 4 cols (desktop)
  - Mobile cart button: Full-width, compact, with responsive text
  - Bottom padding for floating cart button (pb-20 on mobile)

**Breakpoints:**
- Mobile: < 768px (sm)
- Tablet: 768px - 1024px (md)
- Desktop: > 1024px (lg)
