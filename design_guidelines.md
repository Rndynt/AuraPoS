# Design Guidelines for UMKM POS System

## Design Approach

**Selected Approach:** Design System (Material Design) with POS Industry References

**Justification:** This is a utility-focused productivity application where efficiency, clarity, and learnability are paramount. The system references successful POS interfaces like Square POS, Toast, and Shopify POS while following Material Design principles for consistent, scannable information architecture.

**Key Design Principles:**
1. Speed and efficiency - minimize clicks and cognitive load
2. Information clarity - clear pricing, variants, and stock status at a glance
3. Touch-optimized - large tap targets for quick cashier operations
4. Professional simplicity - clean, uncluttered interface suitable for UMKM context

## Typography

**Font Selection:** Inter (primary) via Google Fonts CDN
- **Display/Headers:** Inter 600 (Semibold), text-2xl to text-3xl
- **Product Names:** Inter 500 (Medium), text-base to text-lg
- **Body/Prices:** Inter 400 (Regular), text-sm to text-base
- **Labels/Metadata:** Inter 400 (Regular), text-xs to text-sm
- **Numbers/Pricing:** Inter 600 (Semibold) for emphasis, tabular-nums for alignment

## Layout System

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, and 8
- Component padding: p-4, p-6
- Section spacing: space-y-4, gap-4
- Card spacing: p-4 internally, gap-3 between elements
- List items: py-3, px-4

**Grid System:**
- Desktop/Tablet: Fixed 3-column (80px sidebar + flex content + 360px cart)
- Product grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4, gap-4
- Mobile: Single column with stacked layout

**Container Strategy:**
- Sidebar: w-20 (80px) fixed
- Cart panel: w-[360px] fixed on desktop
- Product area: flex-1 with max-width constraint
- Mobile sheet: full-width with max-h-[85vh]

## Component Library

### Navigation & Structure

**Sidebar (Desktop/Tablet):**
- Vertical icon-only navigation with 64px icon containers
- Icons: Home, LayoutDashboard, ShoppingCart, Receipt, Settings, LogOut (Lucide)
- Active state indicator (border or accent mark)
- Fixed positioning, full height

**Top Bar:**
- Height: h-16
- Search input: flex-1 with max-w-md, rounded-lg
- User/tenant info: compact display on right
- Sticky positioning for scroll persistence

**Category Tabs:**
- Horizontal scrollable tabs using ScrollArea
- Each tab: px-4 py-2, rounded-full for active state
- Categories: Popular, Burger, Pizza, Snack, Coffee, Dessert

### Product Display

**Product Cards:**
- Aspect ratio: 4:3 for product images
- Image: rounded-lg with overflow-hidden
- Card structure:
  - Product image (top)
  - Product name (text-base, font-medium, 2-line clamp)
  - Base price (text-lg, font-semibold, tabular-nums)
  - Variant indicator badge if has_variants (text-xs, px-2, py-1, rounded-full)
  - Stock status if tracking enabled (text-xs)
  - Add button (w-full, h-10)
- Card padding: p-3
- Card hover: subtle elevation change
- Tap target minimum: 44px height for buttons

**Variant Selection Modal/Dropdown:**
- Radio group for single-select variants
- Display: variant name + price delta (+Rp 1,000)
- Optional color pill indicator
- Quantity selector: minus/plus buttons with number input
- Action buttons: Cancel and Add to Cart (h-11)

### Cart Panel

**Cart Header:**
- Title "Order" with item count badge
- Clear cart action (text button)
- Spacing: p-4, border-b

**Cart Items List:**
- Each item: py-3, px-4, border-b
- Layout: Grid with image thumbnail (48px), details (flex-1), actions
- Product name: text-sm, font-medium
- Variant name: text-xs (if applicable)
- Price breakdown: base + variant delta
- Quantity controls: compact minus/plus with number display
- Remove button: icon-only, minimal style
- Note field: collapsible text area

**Cart Summary:**
- Spacing: p-4
- Line items: flex justify-between, py-2
- Subtotal, Tax, Service Charge: text-sm
- Total: text-lg, font-semibold, border-t, pt-3
- Main CTA: "Charge" button (w-full, h-12, text-base, font-semibold)

**Conditional Feature Buttons:**
- "Pay DP" button: secondary style, h-11, w-full (shown if partial_payment active)
- "Send to Kitchen" button: outline style, h-11, w-full (shown if kitchen_ticket active)
- Locked feature state: button disabled with lock icon and tooltip

### Mobile Adaptations

**Cart Bottom Sheet:**
- Trigger: Sticky button at bottom "View Cart (X items)" with Rp total
- Sheet content: Full cart panel as described above
- Sheet height: max-h-[85vh] with internal scroll
- Handle indicator at top for drag gesture

**Mobile Product Grid:**
- grid-cols-2 on mobile
- Reduced padding: p-2 for cards
- Smaller text sizes: scale down by one step

### Forms & Inputs

**Search Input:**
- Height: h-10
- Icon: Search (Lucide) left-aligned
- Placeholder: "Search products..."
- Rounded: rounded-lg
- Full width with max-w-md constraint

**Quantity Inputs:**
- Button group: 3 elements (minus, number, plus)
- Each button: w-8 h-8, rounded
- Number display: w-12, text-center, tabular-nums

**Note Field:**
- Textarea: min-h-[60px], rounded-lg, p-2
- Placeholder: "Add note (optional)..."

### Feedback & States

**Loading States:**
- Skeleton cards for product grid
- Spinner for cart actions
- Disabled state for buttons during processing

**Empty States:**
- Cart empty: centered icon + message, py-8
- No products: centered message with category suggestion
- Icon size: w-16 h-16

**Feature Locked State:**
- Disabled button appearance
- Lock icon (Lucide) prefix
- Tooltip explaining feature requirement
- "Unlock Feature" link to purchase flow

### Modals & Overlays

**Variant Selection Dialog:**
- Width: max-w-md
- Padding: p-6
- Sections separated by space-y-4
- Footer with action buttons: gap-3

**Feature Purchase Modal:**
- Feature details: icon, name, description
- Price display: prominent, text-2xl
- Purchase type indicator: one-time vs subscription badge
- CTA: "Purchase" button (h-11, w-full)

## Images

**Product Images:**
- All product cards should display product images
- Aspect ratio: 4:3 (use object-cover for consistency)
- Fallback: placeholder with product initial or generic food icon
- Location: Top of each product card, rounded-lg corners
- Quality: Optimized for web, lazy loading enabled

**Sample Product Image Types:**
- Burgers: overhead shot showing ingredients
- Rice bowls: top-down view with garnish visible
- Coffee drinks: side angle showing layers/foam
- Desserts: styled close-up with texture detail

**Empty State Illustrations:**
- Empty cart: Simple line illustration of empty shopping bag
- No products found: Magnifying glass icon with message
- Feature locked: Lock icon with key

**No Hero Section:** This is a functional application, not a marketing page. The interface begins immediately with the POS workspace.

## Spacing & Rhythm

**Vertical Spacing:**
- Section gaps: space-y-6
- Component internal spacing: space-y-4
- List item spacing: space-y-3
- Dense lists (cart items): space-y-2

**Horizontal Spacing:**
- Grid gaps: gap-4
- Button groups: gap-2 or gap-3
- Inline elements: space-x-2

## Accessibility

- Minimum touch targets: 44px × 44px
- Focus indicators: ring-2 with offset
- ARIA labels for icon-only buttons
- Semantic HTML throughout
- Keyboard navigation support for all interactions
- Screen reader announcements for cart updates