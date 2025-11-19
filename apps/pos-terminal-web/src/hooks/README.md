# Tenant Profile & Module Flags Usage Guide

This guide shows how to use the tenant profile system to access business type information and conditionally render UI based on enabled modules.

## Overview

The tenant profile system provides:
- **Business Type**: What kind of business is using the system (café, retail, laundry, etc.)
- **Module Configuration**: Which features/modules are enabled for this tenant
- **Feature Flags**: Active features the tenant has access to

## Using the Tenant Context

### Basic Usage

```tsx
import { useTenant } from "@/context/TenantContext";

function MyComponent() {
  const { business_type, moduleConfig, hasModule, isLoading, error } = useTenant();

  if (isLoading) {
    return <div>Loading tenant profile...</div>;
  }

  if (error) {
    return <div>Error loading profile: {error.message}</div>;
  }

  return (
    <div>
      <h1>Business Type: {business_type}</h1>
      <p>Table Management: {hasModule("enable_table_management") ? "Enabled" : "Disabled"}</p>
    </div>
  );
}
```

## Accessing Business Type

Use the `business_type` property to determine what kind of business is using the system:

```tsx
import { useTenant } from "@/context/TenantContext";

function Dashboard() {
  const { business_type } = useTenant();

  return (
    <div>
      {business_type === "CAFE_RESTAURANT" && (
        <CafeRestaurantDashboard />
      )}
      {business_type === "RETAIL_MINIMARKET" && (
        <RetailDashboard />
      )}
      {business_type === "LAUNDRY" && (
        <LaundryDashboard />
      )}
      {business_type === "SERVICE_APPOINTMENT" && (
        <AppointmentDashboard />
      )}
      {business_type === "DIGITAL_PPOB" && (
        <PPOBDashboard />
      )}
    </div>
  );
}
```

## Using the `hasModule()` Helper

The `hasModule()` function checks if a specific module is enabled for the tenant.

### Example 1: Table Management (Café/Restaurant)

Show table selection screen only if table management is enabled:

```tsx
import { useTenant } from "@/context/TenantContext";
import { TableSelector } from "@/components/pos/TableSelector";

function POSScreen() {
  const { hasModule } = useTenant();

  return (
    <div>
      {hasModule("enable_table_management") && (
        <div className="mb-4">
          <h2>Select Table</h2>
          <TableSelector />
        </div>
      )}
      
      <ProductArea />
      <CartPanel />
    </div>
  );
}
```

### Example 2: Delivery Address Fields

Show delivery address input only if delivery module is enabled:

```tsx
import { useTenant } from "@/context/TenantContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function OrderForm() {
  const { hasModule } = useTenant();

  return (
    <form>
      <div>
        <Label htmlFor="customer-name">Customer Name</Label>
        <Input id="customer-name" name="customerName" />
      </div>

      {hasModule("enable_delivery") && (
        <div className="mt-4">
          <Label htmlFor="delivery-address">Delivery Address</Label>
          <Input 
            id="delivery-address" 
            name="deliveryAddress"
            placeholder="Enter delivery address"
          />
          
          <Label htmlFor="delivery-notes">Delivery Notes</Label>
          <Input 
            id="delivery-notes" 
            name="deliveryNotes"
            placeholder="Special instructions"
          />
        </div>
      )}

      <button type="submit">Submit Order</button>
    </form>
  );
}
```

### Example 3: Loyalty Points UI

Display loyalty points section only if loyalty module is enabled:

```tsx
import { useTenant } from "@/context/TenantContext";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CartPanel() {
  const { hasModule } = useTenant();
  const cart = useCart();

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Cart Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p>Subtotal: ${cart.subtotal}</p>
            <p>Tax: ${cart.tax}</p>
            <p>Total: ${cart.total}</p>
          </div>

          {hasModule("enable_loyalty") && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-2">Loyalty Points</h3>
              <div className="flex items-center justify-between">
                <span>Points Earned:</span>
                <Badge variant="secondary">+{cart.pointsEarned}</Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>Customer Balance:</span>
                <Badge variant="default">{cart.customerPoints} pts</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Example 4: Kitchen Ticket Display

Show kitchen ticket button only if enabled:

```tsx
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

function OrderActions({ orderId }: { orderId: string }) {
  const { hasModule } = useTenant();

  return (
    <div className="flex gap-2">
      <Button variant="default">
        Print Receipt
      </Button>

      {hasModule("enable_kitchen_ticket") && (
        <Button variant="secondary">
          <Printer className="mr-2 h-4 w-4" />
          Send to Kitchen
        </Button>
      )}

      {hasModule("enable_delivery") && (
        <Button variant="outline">
          Assign Driver
        </Button>
      )}
    </div>
  );
}
```

### Example 5: Inventory Tracking

Conditionally show stock levels based on inventory module:

```tsx
import { useTenant } from "@/context/TenantContext";
import { Badge } from "@/components/ui/badge";

function ProductCard({ product }) {
  const { hasModule } = useTenant();

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>

      {hasModule("enable_inventory") && (
        <div className="mt-2">
          {product.stock > 10 && (
            <Badge variant="secondary">In Stock</Badge>
          )}
          {product.stock > 0 && product.stock <= 10 && (
            <Badge variant="default">Low Stock ({product.stock})</Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="destructive">Out of Stock</Badge>
          )}
        </div>
      )}
    </div>
  );
}
```

## Direct Access to Module Config

You can also directly access the `moduleConfig` object:

```tsx
import { useTenant } from "@/context/TenantContext";

function SettingsPanel() {
  const { moduleConfig } = useTenant();

  if (!moduleConfig) {
    return <div>Loading modules...</div>;
  }

  return (
    <div>
      <h2>Active Modules</h2>
      <ul>
        {moduleConfig.enable_table_management && <li>Table Management</li>}
        {moduleConfig.enable_kitchen_ticket && <li>Kitchen Tickets</li>}
        {moduleConfig.enable_loyalty && <li>Loyalty Program</li>}
        {moduleConfig.enable_delivery && <li>Delivery Management</li>}
        {moduleConfig.enable_inventory && <li>Inventory Tracking</li>}
        {moduleConfig.enable_appointments && <li>Appointment Scheduling</li>}
        {moduleConfig.enable_multi_location && <li>Multi-Location</li>}
      </ul>
    </div>
  );
}
```

## Available Module Flags

The following module flags are available in `TenantModuleConfig`:

- `enable_table_management` - Table seating for café/restaurant
- `enable_kitchen_ticket` - Kitchen display system
- `enable_loyalty` - Loyalty points program
- `enable_delivery` - Delivery order management
- `enable_inventory` - Stock/inventory tracking
- `enable_appointments` - Appointment scheduling (service businesses)
- `enable_multi_location` - Multiple locations support

## Using the Direct Hook

If you need to access the tenant profile without using the context:

```tsx
import { useTenantProfile } from "@/hooks/api/useTenantProfile";

function MyComponent() {
  const { data, isLoading, error } = useTenantProfile();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Tenant: {data.tenant.name}</p>
      <p>Business: {data.tenant.business_name}</p>
      <p>Type: {data.tenant.business_type}</p>
      <p>Active Features: {data.features.length}</p>
    </div>
  );
}
```

## Best Practices

1. **Always check loading state** before accessing profile data
2. **Handle errors gracefully** - show fallback UI if profile fails to load
3. **Use `hasModule()` helper** instead of directly accessing `moduleConfig` properties
4. **Cache the results** - TanStack Query automatically caches the profile data
5. **Type safety** - Use TypeScript to ensure module names are valid

## Error Handling

```tsx
import { useTenant } from "@/context/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

function FeatureSection() {
  const { hasModule, isLoading, error } = useTenant();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load tenant profile. Some features may be unavailable.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <div>Loading features...</div>;
  }

  return (
    <div>
      {hasModule("enable_loyalty") ? (
        <LoyaltyWidget />
      ) : (
        <p>Loyalty program not available</p>
      )}
    </div>
  );
}
```
