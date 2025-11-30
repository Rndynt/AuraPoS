/**
 * Database Seed Script
 * Populates initial data for products, features, and tenant features
 * 
 * Usage: npm run db:seed
 */

import 'dotenv/config';
import { db } from '@pos/infrastructure/database';
import { 
  tenants, 
  products, 
  productOptionGroups, 
  productOptions,
  tenantFeatures,
  tenantModuleConfigs,
  tables,
  orders,
  orderItems,
  orderItemModifiers,
  orderPayments,
  kitchenTickets,
  users,
  orderTypes,
  tenantOrderTypes,
} from '@shared/schema';
import type { 
  InsertTenant, 
  InsertProduct, 
  InsertProductOptionGroup, 
  InsertProductOption,
  InsertTenantFeature,
  InsertTenantModuleConfig,
  InsertTable,
  InsertOrderType,
  InsertTenantOrderType,
} from '@shared/schema';
import { sql, eq } from 'drizzle-orm';

// Product images paths
const PRODUCT_IMAGES = {
  burger: '/generated_images/Gourmet_beef_burger_product_photo_df61270b.png',
  rice: '/generated_images/Chicken_rice_bowl_product_photo_3ab2fbee.png',
  cappuccino: '/generated_images/Cappuccino_coffee_product_photo_d92cda67.png',
  lava: '/generated_images/Chocolate_lava_cake_product_photo_cb07f0be.png',
  pizza: '/generated_images/Supreme_pizza_product_photo_78bbaf57.png',
  fries: '/generated_images/French_fries_product_photo_dc986f4d.png',
  icedLatte: '/generated_images/Iced_caramel_latte_product_photo_1bc0e828.png',
  wings: '/generated_images/Fried_chicken_wings_product_photo_fce05207.png',
};

// Feature codes to seed
const FEATURE_CODES = [
  'product_variants',
  'partial_payment',
  'kitchen_ticket',
  'stock_tracking',
  'order_history',
];

// Features to enable for demo tenant
const DEMO_TENANT_FEATURES = [
  'product_variants',
  'partial_payment',
  'kitchen_ticket',
];

/**
 * Clear all data from the database in the correct order (respecting FK constraints)
 */
async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  try {
    // Works with both local PostgreSQL and Neon cloud via Drizzle ORM
    await db.execute(sql`TRUNCATE TABLE order_item_modifiers, order_payments, kitchen_tickets, order_items, orders, tenant_order_types, order_types, product_options, product_option_groups, products, tenant_features, tenants, users CASCADE`);
    
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

/**
 * Seed the demo tenant
 */
async function seedTenant(): Promise<string> {
  console.log('🏢 Seeding tenant...');
  
  const tenantData = {
    id: 'demo-tenant',
    name: 'Demo Restaurant',
    slug: 'demo-tenant',
    businessName: 'Demo Restaurant & Cafe',
    businessAddress: '123 Main Street, City, Country',
    businessPhone: '+1234567890',
    businessEmail: 'demo@restaurant.com',
    planTier: 'premium',
    subscriptionStatus: 'active',
    timezone: 'UTC',
    currency: 'IDR',
    locale: 'id-ID',
    isActive: true,
  };
  
  const [tenant] = await db.insert(tenants).values(tenantData).returning();
  console.log(`✅ Tenant created: ${tenant.slug} (${tenant.id})`);
  
  return tenant.id;
}

/**
 * Seed products with option groups (converting from legacy variant format)
 */
async function seedProducts(tenantId: string) {
  console.log('🍔 Seeding products with option groups...');
  
  // Product 1: Classic Beef Burger with Size options
  const [burger] = await db.insert(products).values({
    tenantId,
    name: 'Classic Beef Burger',
    description: 'Juicy beef patty with fresh vegetables and special sauce',
    basePrice: '45000',
    category: 'Burger',
    imageUrl: PRODUCT_IMAGES.burger,
    hasVariants: true,
    stockTrackingEnabled: false,
    isActive: true,
  } as InsertProduct).returning();
  
  const [burgerSizeGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: burger.id,
    name: 'Size',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    displayOrder: 0,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: burgerSizeGroup.id,
      name: 'Regular',
      priceDelta: '0',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: burgerSizeGroup.id,
      name: 'Large',
      priceDelta: '10000',
      isAvailable: true,
      displayOrder: 1,
    },
    {
      tenantId,
      optionGroupId: burgerSizeGroup.id,
      name: 'Extra Large',
      priceDelta: '20000',
      isAvailable: true,
      displayOrder: 2,
    },
  ] as InsertProductOption[]);
  
  console.log(`✅ Created: ${burger.name} with Size options`);
  
  // Product 2: Cappuccino with Temperature options and Add-ons (multi-select)
  const [cappuccino] = await db.insert(products).values({
    tenantId,
    name: 'Cappuccino',
    description: 'Rich espresso with steamed milk and foam',
    basePrice: '25000',
    category: 'Coffee',
    imageUrl: PRODUCT_IMAGES.cappuccino,
    hasVariants: true,
    stockTrackingEnabled: false,
    isActive: true,
  } as InsertProduct).returning();
  
  const [cappuccinoTempGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: cappuccino.id,
    name: 'Temperature',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    displayOrder: 0,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: cappuccinoTempGroup.id,
      name: 'Hot',
      priceDelta: '0',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: cappuccinoTempGroup.id,
      name: 'Iced',
      priceDelta: '3000',
      isAvailable: true,
      displayOrder: 1,
    },
  ] as InsertProductOption[]);
  
  // Add multi-select Add-ons group
  const [cappuccinoAddonsGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: cappuccino.id,
    name: 'Add-ons',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 3,
    isRequired: false,
    displayOrder: 1,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: cappuccinoAddonsGroup.id,
      name: 'Extra Shot',
      priceDelta: '8000',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: cappuccinoAddonsGroup.id,
      name: 'Oat Milk',
      priceDelta: '5000',
      isAvailable: true,
      displayOrder: 1,
    },
    {
      tenantId,
      optionGroupId: cappuccinoAddonsGroup.id,
      name: 'Caramel Syrup',
      priceDelta: '6000',
      isAvailable: true,
      displayOrder: 2,
    },
  ] as InsertProductOption[]);
  
  console.log(`✅ Created: ${cappuccino.name} with Temperature and Add-ons options`);
  
  // Product 3: Supreme Pizza with Size options
  const [pizza] = await db.insert(products).values({
    tenantId,
    name: 'Supreme Pizza',
    description: 'Loaded with premium toppings and cheese',
    basePrice: '85000',
    category: 'Pizza',
    imageUrl: PRODUCT_IMAGES.pizza,
    hasVariants: true,
    stockTrackingEnabled: false,
    isActive: true,
  } as InsertProduct).returning();
  
  const [pizzaSizeGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: pizza.id,
    name: 'Size',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    displayOrder: 0,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: pizzaSizeGroup.id,
      name: 'Small',
      priceDelta: '-15000',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: pizzaSizeGroup.id,
      name: 'Medium',
      priceDelta: '0',
      isAvailable: true,
      displayOrder: 1,
    },
    {
      tenantId,
      optionGroupId: pizzaSizeGroup.id,
      name: 'Large',
      priceDelta: '20000',
      isAvailable: true,
      displayOrder: 2,
    },
  ] as InsertProductOption[]);
  
  console.log(`✅ Created: ${pizza.name} with Size options`);
  
  // Product 4: French Fries with Size options
  const [fries] = await db.insert(products).values({
    tenantId,
    name: 'French Fries',
    description: 'Crispy golden fries seasoned to perfection',
    basePrice: '18000',
    category: 'Snack',
    imageUrl: PRODUCT_IMAGES.fries,
    hasVariants: true,
    stockTrackingEnabled: false,
    isActive: true,
  } as InsertProduct).returning();
  
  const [friesSizeGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: fries.id,
    name: 'Size',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    displayOrder: 0,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: friesSizeGroup.id,
      name: 'Regular',
      priceDelta: '0',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: friesSizeGroup.id,
      name: 'Large',
      priceDelta: '8000',
      isAvailable: true,
      displayOrder: 1,
    },
  ] as InsertProductOption[]);
  
  console.log(`✅ Created: ${fries.name} with Size options`);
  
  // Product 5: Chicken Rice Bowl (no variants)
  const [rice] = await db.insert(products).values({
    tenantId,
    name: 'Chicken Rice Bowl',
    description: 'Grilled chicken with steamed rice and vegetables',
    basePrice: '35000',
    category: 'Rice Bowl',
    imageUrl: PRODUCT_IMAGES.rice,
    hasVariants: false,
    stockTrackingEnabled: true,
    stockQty: 25,
    sku: 'RICE-BOWL-001',
    isActive: true,
  } as InsertProduct).returning();
  
  console.log(`✅ Created: ${rice.name} (no variants, stock tracked)`);
  
  // Product 6: Chocolate Lava Cake (no variants)
  const [lava] = await db.insert(products).values({
    tenantId,
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with molten center',
    basePrice: '38000',
    category: 'Dessert',
    imageUrl: PRODUCT_IMAGES.lava,
    hasVariants: false,
    stockTrackingEnabled: true,
    stockQty: 12,
    sku: 'DESSERT-LAVA-001',
    isActive: true,
  } as InsertProduct).returning();
  
  console.log(`✅ Created: ${lava.name} (no variants, stock tracked)`);
  
  // Product 7: Iced Caramel Latte with multi-select Add-ons
  const [icedLatte] = await db.insert(products).values({
    tenantId,
    name: 'Iced Caramel Latte',
    description: 'Smooth espresso with caramel and cold milk',
    basePrice: '32000',
    category: 'Coffee',
    imageUrl: PRODUCT_IMAGES.icedLatte,
    hasVariants: true,
    stockTrackingEnabled: false,
    isActive: true,
  } as InsertProduct).returning();
  
  const [latteAddonsGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: icedLatte.id,
    name: 'Add-ons',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 3,
    isRequired: false,
    displayOrder: 0,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: latteAddonsGroup.id,
      name: 'Extra Shot',
      priceDelta: '8000',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: latteAddonsGroup.id,
      name: 'Oat Milk',
      priceDelta: '5000',
      isAvailable: true,
      displayOrder: 1,
    },
    {
      tenantId,
      optionGroupId: latteAddonsGroup.id,
      name: 'Extra Caramel',
      priceDelta: '4000',
      isAvailable: true,
      displayOrder: 2,
    },
  ] as InsertProductOption[]);
  
  console.log(`✅ Created: ${icedLatte.name} with Add-ons options`);
  
  // Product 8: Chicken Wings with Portion size
  const [wings] = await db.insert(products).values({
    tenantId,
    name: 'Chicken Wings',
    description: 'Crispy fried chicken wings with your choice of sauce',
    basePrice: '42000',
    category: 'Snack',
    imageUrl: PRODUCT_IMAGES.wings,
    hasVariants: true,
    stockTrackingEnabled: true,
    stockQty: 30,
    sku: 'WINGS-001',
    isActive: true,
  } as InsertProduct).returning();
  
  const [wingsPortionGroup] = await db.insert(productOptionGroups).values({
    tenantId,
    productId: wings.id,
    name: 'Portion',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    displayOrder: 0,
  } as InsertProductOptionGroup).returning();
  
  await db.insert(productOptions).values([
    {
      tenantId,
      optionGroupId: wingsPortionGroup.id,
      name: '4 pcs',
      priceDelta: '0',
      isAvailable: true,
      displayOrder: 0,
    },
    {
      tenantId,
      optionGroupId: wingsPortionGroup.id,
      name: '8 pcs',
      priceDelta: '18000',
      isAvailable: true,
      displayOrder: 1,
    },
    {
      tenantId,
      optionGroupId: wingsPortionGroup.id,
      name: '12 pcs',
      priceDelta: '30000',
      isAvailable: true,
      displayOrder: 2,
    },
  ] as InsertProductOption[]);
  
  console.log(`✅ Created: ${wings.name} with Portion options`);
  
  console.log('✅ All products seeded successfully');
}

/**
 * Seed order types master data
 */
async function seedOrderTypes() {
  console.log('📋 Seeding order types...');
  
  const orderTypesData: InsertOrderType[] = [
    // Cafe / Restaurant oriented
    {
      code: 'DINE_IN',
      name: 'Dine In',
      description: 'Customer dining in at the restaurant',
      isOnPremise: true,
      needTableNumber: true,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: false,
      affectsServiceCharge: true,
      isActive: true,
    },
    {
      code: 'TAKE_AWAY',
      name: 'Take Away',
      description: 'Customer picks up order to take away',
      isOnPremise: true,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'DELIVERY',
      name: 'Delivery',
      description: 'Order delivered to customer address',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: true,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'DRIVE_THRU',
      name: 'Drive Thru',
      description: 'Customer orders from vehicle',
      isOnPremise: true,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    // Retail / Minimarket / Swalayan
    {
      code: 'WALK_IN',
      name: 'Walk In',
      description: 'Customer walks in and purchases directly',
      isOnPremise: true,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'SELF_CHECKOUT',
      name: 'Self Checkout',
      description: 'Customer uses self-service kiosk',
      isOnPremise: true,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'PICKUP_STORE',
      name: 'Pickup at Store',
      description: 'Customer orders online and picks up at store',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'PPOB',
      name: 'PPOB',
      description: 'Bill payment, pulsa, token, etc.',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: true,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'DIGITAL_PRODUCT',
      name: 'Digital Product',
      description: 'Digital goods purchase',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: true,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'PREORDER',
      name: 'Pre-order',
      description: 'Advance order for future fulfillment',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    // Laundry
    {
      code: 'DROPOFF',
      name: 'Drop Off',
      description: 'Customer drops off laundry',
      isOnPremise: true,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: false,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'PICKUP_DELIVERY',
      name: 'Pickup & Delivery',
      description: 'Pickup laundry from customer and deliver back',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: true,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'EXPRESS',
      name: 'Express',
      description: 'Express service with faster turnaround',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: true,
      isActive: true,
    },
    // Services / Appointment-based
    {
      code: 'APPOINTMENT',
      name: 'Appointment',
      description: 'Scheduled appointment for service',
      isOnPremise: true,
      needTableNumber: false,
      needAddress: false,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
    {
      code: 'SUBSCRIPTION',
      name: 'Subscription',
      description: 'Recurring service subscription',
      isOnPremise: false,
      needTableNumber: false,
      needAddress: true,
      allowScheduled: true,
      isDigitalProduct: false,
      affectsServiceCharge: false,
      isActive: true,
    },
  ];
  
  const createdOrderTypes = await db.insert(orderTypes).values(orderTypesData).returning();
  
  console.log(`✅ Created ${createdOrderTypes.length} order types:`);
  createdOrderTypes.forEach(ot => console.log(`   - ${ot.code}: ${ot.name}`));
  
  return createdOrderTypes;
}

/**
 * Seed tenant order types for demo tenant (restaurant use case)
 */
async function seedTenantOrderTypes(tenantId: string, createdOrderTypes: any[]) {
  console.log('🏪 Enabling order types for demo tenant...');
  
  // For a cafe/restaurant type tenant, enable these order types
  const restaurantOrderTypes = ['DINE_IN', 'TAKE_AWAY', 'DELIVERY'];
  
  const tenantOrderTypesData: InsertTenantOrderType[] = createdOrderTypes
    .filter(ot => restaurantOrderTypes.includes(ot.code))
    .map(ot => ({
      tenantId,
      orderTypeId: ot.id,
      isEnabled: true,
    }));
  
  await db.insert(tenantOrderTypes).values(tenantOrderTypesData);
  
  console.log(`✅ Enabled ${tenantOrderTypesData.length} order types for demo tenant:`);
  restaurantOrderTypes.forEach(code => console.log(`   - ${code}`));
}

/**
 * Seed tenant module configs (feature flags for UI modules)
 */
async function seedTenantModuleConfigs(tenantId: string) {
  console.log('⚙️ Seeding tenant module configs...');
  
  const moduleConfigs: InsertTenantModuleConfig = {
    tenantId,
    enableTableManagement: true,
    enableKitchenTicket: true,
    enableLoyalty: false,
    enableDelivery: false,
    enableInventory: false,
    enableAppointments: false,
    enableMultiLocation: false,
  };
  
  await db.insert(tenantModuleConfigs).values(moduleConfigs).onConflictDoUpdate({
    target: tenantModuleConfigs.tenantId,
    set: moduleConfigs,
  });
  
  console.log(`✅ Module configs enabled for demo tenant:`);
  console.log(`   - Table Management: ${moduleConfigs.enableTableManagement}`);
  console.log(`   - Kitchen Ticket: ${moduleConfigs.enableKitchenTicket}`);
}

/**
 * Seed demo tables for restaurant floor plan
 */
async function seedTables(tenantId: string) {
  console.log('🪑 Seeding demo tables...');
  
  const demoTables: InsertTable[] = [
    { tenantId, tableNumber: '1', tableName: 'Window Seat A', floor: 'Ground', capacity: 2, status: 'available' },
    { tenantId, tableNumber: '2', tableName: 'Window Seat B', floor: 'Ground', capacity: 2, status: 'available' },
    { tenantId, tableNumber: '3', tableName: 'Corner Table', floor: 'Ground', capacity: 4, status: 'available' },
    { tenantId, tableNumber: '4', tableName: 'Center Table 1', floor: 'Ground', capacity: 4, status: 'available' },
    { tenantId, tableNumber: '5', tableName: 'Center Table 2', floor: 'Ground', capacity: 4, status: 'available' },
    { tenantId, tableNumber: '6', tableName: 'VIP Table', floor: 'Ground', capacity: 6, status: 'available' },
    { tenantId, tableNumber: 'A1', tableName: 'Upper Terrace 1', floor: '2nd Floor', capacity: 2, status: 'available' },
    { tenantId, tableNumber: 'A2', tableName: 'Upper Terrace 2', floor: '2nd Floor', capacity: 4, status: 'available' },
    { tenantId, tableNumber: 'B1', tableName: 'Lounge Area', floor: '2nd Floor', capacity: 6, status: 'maintenance' },
    { tenantId, tableNumber: 'B2', tableName: 'Private Dining', floor: '2nd Floor', capacity: 8, status: 'available' },
  ];
  
  await db.insert(tables).values(demoTables);
  
  console.log(`✅ Created ${demoTables.length} demo tables for floor plan`);
}

/**
 * Seed open (unpaid) orders for demo tables to test Continue Order feature
 */
async function seedOpenOrders(tenantId: string) {
  console.log('🛒 Seeding demo open orders for Continue Order testing...');
  
  try {
    // Get products
    const productsData = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.tenantId, tenantId),
    });
    
    if (productsData.length === 0) {
      console.log('   ℹ️  No products found, skipping open orders');
      return;
    }

    // Get first tenant order type (should be DINE_IN for demo)
    const tenantOrderType = await db.query.tenantOrderTypes.findFirst({
      where: (tot, { eq }) => eq(tot.tenantId, tenantId),
    });

    if (!tenantOrderType) {
      console.log('   ℹ️  No order type found for tenant, skipping open orders');
      return;
    }

    const testOrders = [
      {
        tableNumber: '1',
        customerName: 'John Doe',
        items: [
          { productName: 'Classic Beef Burger', qty: 2, price: 45000 },
          { productName: 'Cappuccino', qty: 1, price: 35000 },
        ],
      },
      {
        tableNumber: '2',
        customerName: 'Jane Smith',
        items: [
          { productName: 'Chicken Rice Bowl', qty: 1, price: 55000 },
          { productName: 'Iced Caramel Latte', qty: 2, price: 40000 },
        ],
      },
      {
        tableNumber: '3',
        customerName: 'Bob Johnson',
        items: [
          { productName: 'Supreme Pizza', qty: 1, price: 85000 },
          { productName: 'Fried Chicken Wings', qty: 1, price: 65000 },
        ],
      },
    ];

    for (const testOrder of testOrders) {
      const subtotal = testOrder.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const taxRate = 0.1;
      const serviceChargeRate = 0.05;
      const tax = subtotal * taxRate;
      const serviceCharge = subtotal * serviceChargeRate;
      const total = subtotal + tax + serviceCharge;

      const [order] = await db.insert(orders).values({
        tenantId,
        orderTypeId: tenantOrderType.orderTypeId,
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'confirmed',
        paymentStatus: 'unpaid',
        tableNumber: testOrder.tableNumber,
        customerName: testOrder.customerName,
        subtotal,
        taxAmount: tax,
        serviceCharge: serviceCharge,
        total,
        notes: 'Test order for Continue Order feature',
      }).returning();

      // Add order items
      for (const item of testOrder.items) {
        const product = productsData.find(p => p.name === item.productName);
        if (product) {
          await db.insert(orderItems).values({
            orderId: order.id,
            productId: product.id,
            productName: item.productName,
            unitPrice: item.price.toString(),
            quantity: item.qty,
            itemSubtotal: (item.price * item.qty).toString(),
          });
        }
      }

      console.log(`   ✓ Order for table ${testOrder.tableNumber} (${testOrder.customerName}): Rp ${total.toLocaleString('id-ID')}`);
    }

    // Update table statuses to occupied for tables with orders
    for (const testOrder of testOrders) {
      const tableToUpdate = await db.query.tables.findFirst({
        where: (t, { eq }) => eq(t.tableNumber, testOrder.tableNumber),
      });
      if (tableToUpdate) {
        await db.update(tables).set({ status: 'occupied' }).where(eq(tables.id, tableToUpdate.id));
      }
    }

    console.log(`✅ Created ${testOrders.length} demo open orders for testing`);
  } catch (error) {
    console.error('❌ Error seeding open orders:', error);
    throw error;
  }
}

/**
 * Seed tenant features for demo tenant
 */
async function seedTenantFeatures(tenantId: string) {
  console.log('🎯 Seeding tenant features...');
  
  const featureData: InsertTenantFeature[] = DEMO_TENANT_FEATURES.map(featureCode => ({
    tenantId,
    featureCode,
    source: 'plan_default' as const,
    isActive: true,
  }));
  
  await db.insert(tenantFeatures).values(featureData);
  
  console.log(`✅ Enabled ${DEMO_TENANT_FEATURES.length} features for demo tenant:`);
  DEMO_TENANT_FEATURES.forEach(code => console.log(`   - ${code}`));
}

/**
 * Seed INDONESIAN LAUNDRY tenant with realistic Indonesian services & pricing
 */
async function seedIndonesianLaundryTenant(createdOrderTypes: any[]) {
  console.log('\n🧺 Creating INDONESIAN LAUNDRY Demo Tenant...');
  
  const tenantData = {
    id: 'laundry-indo',
    name: 'Cucian Cepat Indonesia',
    slug: 'laundry-indo',
    businessName: 'PT Cucian Cepat Indonesia - Layanan Laundry Profesional',
    businessAddress: 'Jl. Merdeka No. 123, Jakarta Selatan 12345',
    businessPhone: '+62812-3456-7890',
    businessEmail: 'layanan@cucianc epat.id',
    planTier: 'professional',
    subscriptionStatus: 'active',
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
    locale: 'id-ID',
    isActive: true,
  };
  
  const [tenant] = await db.insert(tenants).values(tenantData).returning();
  console.log(`✅ Tenant created: ${tenant.slug}`);
  
  // Enable laundry order types
  const laundryOrderTypes = ['DROPOFF', 'PICKUP_DELIVERY', 'EXPRESS'];
  const tenantOrderTypesData: InsertTenantOrderType[] = createdOrderTypes
    .filter(ot => laundryOrderTypes.includes(ot.code))
    .map(ot => ({
      tenantId: tenant.id,
      orderTypeId: ot.id,
      isEnabled: true,
    }));
  
  await db.insert(tenantOrderTypes).values(tenantOrderTypesData);
  console.log(`✅ Enabled ${tenantOrderTypesData.length} laundry order types`);
  
  // Seed Indonesian laundry services with realistic pricing
  const serviceProducts = [
    { 
      name: 'Cuci Satuan', 
      price: 9500, 
      desc: 'Layanan cuci biasa - Harga per kg, Waktu: 3-5 hari kerja' 
    },
    { 
      name: 'Cuci + Setrika', 
      price: 12000, 
      desc: 'Cuci dan setrika lengkap - Per kg, Waktu: 2-3 hari kerja' 
    },
    { 
      name: 'Cuci Kilat', 
      price: 18000, 
      desc: 'Layanan express - Per kg, Waktu: 1 hari kerja (order sebelum jam 10 pagi)' 
    },
    { 
      name: 'Setrika Saja', 
      price: 6000, 
      desc: 'Layanan setrika untuk kain yang sudah bersih - Per kg' 
    },
    { 
      name: 'Dry Cleaning', 
      price: 45000, 
      desc: 'Pembersihan profesional untuk gaun, jas, blazer - Per item' 
    },
    { 
      name: 'Cuci Sprai & Sarung Bantal', 
      price: 25000, 
      desc: 'Layanan khusus untuk sprai tempat tidur dan sarung bantal - Per set' 
    },
    { 
      name: 'Cuci Selimut & Bedcover', 
      price: 35000, 
      desc: 'Pembersihan dalam dan deep wash untuk selimut - Per item' 
    },
    { 
      name: 'Cuci Karpet & Tikar', 
      price: 50000, 
      desc: 'Pembersihan profesional karpet dan tikar - Per m²' 
    },
    { 
      name: 'Cuci Sofa & Mebel', 
      price: 75000, 
      desc: 'Layanan khusus pembersihan sofa dan furniture - Per kursi/bagian' 
    },
    { 
      name: 'Hapus Noda Membandel', 
      price: 15000, 
      desc: 'Layanan khusus hapus noda ekstrem (minyak, tinta, cat, dll) - Per item' 
    },
  ];
  
  for (const service of serviceProducts) {
    await db.insert(products).values({
      tenantId: tenant.id,
      name: service.name,
      description: service.desc,
      basePrice: service.price.toString(),
      category: 'Layanan Cuci',
      hasVariants: false,
      stockTrackingEnabled: false,
      isActive: true,
    } as InsertProduct);
  }
  
  console.log(`✅ Created ${serviceProducts.length} laundry services (Indonesia-specific)`);
  
  // Module config - delivery and appointments enabled for laundry
  await db.insert(tenantModuleConfigs).values({
    tenantId: tenant.id,
    enableTableManagement: false,
    enableKitchenTicket: false,
    enableLoyalty: true,
    enableDelivery: true,
    enableInventory: false,
    enableAppointments: true,
    enableMultiLocation: false,
  });
  
  console.log(`✅ Module configs set for laundry (Delivery & Appointments enabled)`);
  
  return tenant.id;
}

/**
 * Seed MINIMARKET tenant with retail products
 */
async function seedMinimarketTenant(createdOrderTypes: any[]) {
  console.log('\n🏪 Creating MINIMARKET Demo Tenant...');
  
  const tenantData = {
    id: 'minimarket-demo',
    name: 'Demo MiniMart 24',
    slug: 'minimarket-demo',
    businessName: 'MiniMart 24 Convenience Store',
    businessAddress: '789 Retail Plaza, City, Country',
    businessPhone: '+1555666777',
    businessEmail: 'sales@minimart24.com',
    planTier: 'professional',
    subscriptionStatus: 'active',
    timezone: 'UTC',
    currency: 'IDR',
    locale: 'id-ID',
    isActive: true,
  };
  
  const [tenant] = await db.insert(tenants).values(tenantData).returning();
  console.log(`✅ Tenant created: ${tenant.slug}`);
  
  // Enable retail order types
  const retailOrderTypes = ['WALK_IN', 'SELF_CHECKOUT', 'PICKUP_STORE'];
  const tenantOrderTypesData: InsertTenantOrderType[] = createdOrderTypes
    .filter(ot => retailOrderTypes.includes(ot.code))
    .map(ot => ({
      tenantId: tenant.id,
      orderTypeId: ot.id,
      isEnabled: true,
    }));
  
  await db.insert(tenantOrderTypes).values(tenantOrderTypesData);
  console.log(`✅ Enabled ${tenantOrderTypesData.length} retail order types`);
  
  // Seed retail products
  const retailProducts = [
    { name: 'Mineral Water 600ml', category: 'Beverages', price: 5500 },
    { name: 'Energy Drink 250ml', category: 'Beverages', price: 12000 },
    { name: 'Instant Noodles', category: 'Snacks', price: 3000 },
    { name: 'Potato Chips 100g', category: 'Snacks', price: 8500 },
    { name: 'Chocolate Bar', category: 'Snacks', price: 10000 },
    { name: 'Bread Loaf', category: 'Daily Essentials', price: 15000 },
    { name: 'Milk Carton 1L', category: 'Daily Essentials', price: 18000 },
    { name: 'Eggs (10 pcs)', category: 'Daily Essentials', price: 22000 },
    { name: 'Soap 200g', category: 'Beauty & Care', price: 8000 },
    { name: 'Toothpaste 150ml', category: 'Beauty & Care', price: 12000 },
    { name: 'Shampoo 250ml', category: 'Beauty & Care', price: 18000 },
    { name: 'Deodorant Stick', category: 'Beauty & Care', price: 15000 },
  ];
  
  for (const product of retailProducts) {
    await db.insert(products).values({
      tenantId: tenant.id,
      name: product.name,
      basePrice: product.price.toString(),
      category: product.category,
      hasVariants: false,
      stockTrackingEnabled: true,
      stockQty: Math.floor(Math.random() * 50) + 20,
      isActive: true,
    } as InsertProduct);
  }
  
  console.log(`✅ Created ${retailProducts.length} retail products`);
  
  // Module config - no table management or kitchen for retail
  await db.insert(tenantModuleConfigs).values({
    tenantId: tenant.id,
    enableTableManagement: false,
    enableKitchenTicket: false,
    enableLoyalty: true,
    enableDelivery: false,
    enableInventory: true,
    enableAppointments: false,
    enableMultiLocation: false,
  });
  
  console.log(`✅ Module configs set for minimarket`);
  
  return tenant.id;
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');
  
  try {
    // Clear existing data
    await clearDatabase();
    console.log('');
    
    // Seed order types (master data)
    const createdOrderTypes = await seedOrderTypes();
    console.log('');
    
    // Seed tenant
    const tenantId = await seedTenant();
    console.log('');
    
    // Enable order types for demo tenant
    await seedTenantOrderTypes(tenantId, createdOrderTypes);
    console.log('');
    
    // Seed products with option groups
    await seedProducts(tenantId);
    console.log('');
    
    // Seed tenant module configs (feature flags)
    await seedTenantModuleConfigs(tenantId);
    console.log('');
    
    // Seed demo tables for floor plan
    await seedTables(tenantId);
    console.log('');
    
    // Seed open orders for Continue Order testing
    await seedOpenOrders(tenantId);
    console.log('');
    
    // Seed tenant features
    await seedTenantFeatures(tenantId);
    console.log('');
    
    // Seed INDONESIAN LAUNDRY tenant
    const laundryTenantId = await seedIndonesianLaundryTenant(createdOrderTypes);
    
    // Seed MINIMARKET tenant
    const minimarketTenantId = await seedMinimarketTenant(createdOrderTypes);
    
    console.log('\n✅ Database seed completed successfully! 🎉');
    console.log('');
    console.log('Summary:');
    console.log('- 3 tenants created');
    console.log('  • demo-tenant (Restaurant/Cafe)');
    console.log('  • laundry-indo (Indonesian Laundry Service)');
    console.log('  • minimarket-demo (Retail/Minimarket)');
    console.log(`- ${createdOrderTypes.length} order types created`);
    console.log('- 8 products with options (Restaurant)');
    console.log('- 10 laundry services - Indonesia-specific (Laundry)');
    console.log('- 12 retail products (Minimarket)');
    console.log(`- ${DEMO_TENANT_FEATURES.length} features enabled for restaurant`);
    console.log('');
    console.log('Tenant IDs:');
    console.log(`- Restaurant: ${tenantId}`);
    console.log(`- Laundry (Indonesia): ${laundryTenantId}`);
    console.log(`- Minimarket: ${minimarketTenantId}`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seed
seed();
