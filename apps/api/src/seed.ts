/**
 * Database Seed Script
 * Populates initial data for products, features, and tenant features
 * 
 * Usage: npm run db:seed
 */

import { db } from '@pos/infrastructure/database';
import { 
  tenants, 
  products, 
  productOptionGroups, 
  productOptions,
  tenantFeatures,
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
  InsertOrderType,
  InsertTenantOrderType,
} from '@shared/schema';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

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
    // Use neon SQL client directly to avoid Drizzle ORM driver issues
    const sqlClient = neon(process.env.DATABASE_URL!);
    await sqlClient`TRUNCATE TABLE order_item_modifiers, order_payments, kitchen_tickets, order_items, orders, tenant_order_types, order_types, product_options, product_option_groups, products, tenant_features, tenants, users CASCADE`;
    
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
    
    // Seed tenant features
    await seedTenantFeatures(tenantId);
    console.log('');
    
    console.log('✅ Database seed completed successfully! 🎉');
    console.log('');
    console.log('Summary:');
    console.log('- 1 tenant created (demo-tenant)');
    console.log(`- ${createdOrderTypes.length} order types created`);
    console.log('- 3 order types enabled for demo tenant (DINE_IN, TAKE_AWAY, DELIVERY)');
    console.log('- 8 products created with option groups');
    console.log(`- ${DEMO_TENANT_FEATURES.length} features enabled`);
    console.log('');
    console.log('Available feature codes:', FEATURE_CODES.join(', '));
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seed
seed();
