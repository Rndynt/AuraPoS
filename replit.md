# POS Kasir UMKM

## Overview
A web-based Point of Sale (POS) system designed for UMKM (Usaha Mikro, Kecil, dan Menengah) businesses such as restaurants, cafes, and mini-markets. The system features a responsive 3-column layout, product variant support, and a feature entitlement engine for monetization.

## Current State
**Phase 1 Complete** - Frontend prototype with full UI/UX implementation using mock data.

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
- **Routing**: Wouter
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React hooks
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Mobile Drawer**: Vaul

## Project Structure
```
/apps
  /web          → (Future) Next.js frontend
  /api          → (Future) Express backend
/packages
  /core         → Shared types (Product, Feature, Order)
  /features     → Entitlement helpers
/client         → Current Vite+React frontend
  /src
    /components
      /pos      → POS-specific components
      /ui       → shadcn components
    /hooks      → Custom hooks (useCart, useFeatures)
    /lib        → Utilities and mock data
    /pages      → Route pages
/server         → (Future) Express server
/netlify        → (Future) Netlify functions
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

### TODO: Backend Integration
- [ ] Replace mock data with real API calls
- [ ] Implement Express backend in /apps/api
- [ ] Create Netlify function wrappers
- [ ] Add authentication via AuthCore
- [ ] Implement order persistence
- [ ] Add reporting endpoints

## Running the Application
The "Start application" workflow runs `npm run dev` which starts both the Express server and Vite dev server on port 5000.

Access the POS at: http://localhost:5000/pos

## Next Steps
See `replit-agent-tasks.md` for detailed roadmap of upcoming phases.
