# Replit Agent POS Kasir Roadmap

## Phase 0 – Repo Setup ✓
- [x] Create folders: /apps/web, /apps/api, /packages, /netlify/functions
- [x] Install dependencies (vaul, nanoid, shadcn components)
- [x] Create shared types in /packages/core
- [x] Create feature helpers in /packages/features

## Phase 1 – Frontend Prototype (Current Phase) ✓
- [x] Build product mock data with 8 sample items (burger, rice bowl, coffee, dessert, pizza, fries, latte, wings)
- [x] Generate product images using AI
- [x] Build 3-column layout (sidebar, products, cart) for desktop/tablet
- [x] Build mobile layout (cart bottom drawer using Vaul)
- [x] Create ProductCard component with variant badges
- [x] Create ProductArea with category tabs and search
- [x] Create CartPanel with item management
- [x] Create VariantSelector dialog for products with variants
- [x] Implement cart state management with useCart hook
- [x] Implement feature state management with useFeatures hook
- [x] Show/hide UI based on features (partial_payment, kitchen_ticket)
- [x] Create responsive POS page (/pos)

## Phase 2 – Backend API (Next Steps)
- [ ] Create Express API in /apps/api
- [ ] Build product module (entity, repository, service, routes)
- [ ] Build features module with catalog seeding
- [ ] Build tenant-features module
- [ ] Implement in-memory storage for products, features, orders
- [ ] Expose API endpoints under /api prefix
- [ ] Connect frontend to real API instead of mock data

## Phase 3 – Netlify Integration
- [ ] Create netlify.toml configuration
- [ ] Build Netlify function wrapper in /netlify/functions/pos-api.ts
- [ ] Adapt Express routes to work with Netlify Functions
- [ ] Mount all routes under /.netlify/functions/pos-api/...
- [ ] Test deployment to Netlify

## Phase 4 – Orders & Payment
- [ ] Create orders module (entity, repository, service)
- [ ] Support full payment flow
- [ ] Support partial payment if feature active
- [ ] Implement kitchen ticket endpoint
- [ ] Add order history page
- [ ] Implement receipt generation

## Phase 5 – Authentication (Future)
- [ ] Integrate AuthCore for tenant identification
- [ ] Replace CURRENT_TENANT_ID hardcode with JWT-based tenant
- [ ] Add login/logout flow
- [ ] Implement multi-tenant data isolation

## Phase 6 – Production Features
- [ ] Add product image upload
- [ ] Implement stock tracking updates
- [ ] Add product limit enforcement for non-unlimited plans
- [ ] Build reporting dashboard
- [ ] Implement queue number generation
- [ ] Add receipt customization options

## Notes
- Current implementation uses Vite + React instead of Next.js monorepo due to Replit environment constraints
- All backend functionality uses mock data for now (marked with //todo: remove mock functionality)
- Frontend is fully functional and ready for user testing
- Tenant is hardcoded to "demo-tenant" (TODO: integrate AuthCore later)
