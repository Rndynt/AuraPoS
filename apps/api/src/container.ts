/**
 * Dependency Injection Container
 * Initializes and wires up all repositories and use cases
 */

import { db } from '@pos/infrastructure/database';

// Repositories
import { ProductRepository } from '@pos/infrastructure/repositories/catalog/ProductRepository';
import { ProductOptionGroupRepository } from '@pos/infrastructure/repositories/catalog/ProductOptionGroupRepository';
import { ProductOptionRepository } from '@pos/infrastructure/repositories/catalog/ProductOptionRepository';
import { OrderRepository } from '@pos/infrastructure/repositories/orders/OrderRepository';
import { OrderItemRepository } from '@pos/infrastructure/repositories/orders/OrderItemRepository';
import { OrderItemModifierRepository } from '@pos/infrastructure/repositories/orders/OrderItemModifierRepository';
import { OrderPaymentRepository } from '@pos/infrastructure/repositories/orders/OrderPaymentRepository';
import { KitchenTicketRepository } from '@pos/infrastructure/repositories/orders/KitchenTicketRepository';
import { OrderTypeRepository } from '@pos/infrastructure/repositories/orders/OrderTypeRepository';
import { TenantRepository } from '@pos/infrastructure/repositories/tenants/TenantRepository';
import { TenantFeatureRepository } from '@pos/infrastructure/repositories/tenants/TenantFeatureRepository';

// Use Cases - Catalog
import { GetProducts } from '@pos/application/catalog/GetProducts';
import { GetProductById } from '@pos/application/catalog/GetProductById';
import { CheckProductAvailability } from '@pos/application/catalog/CheckProductAvailability';

// Use Cases - Orders
import { CreateOrder } from '@pos/application/orders/CreateOrder';
import { RecordPayment } from '@pos/application/orders/RecordPayment';
import { CreateKitchenTicket } from '@pos/application/orders/CreateKitchenTicket';

// Use Cases - Tenants
import { GetActiveFeaturesForTenant } from '@pos/application/tenants/GetActiveFeaturesForTenant';
import { CheckFeatureAccess } from '@pos/application/tenants/CheckFeatureAccess';

/**
 * Container class that holds all dependencies
 */
class Container {
  // Database
  public readonly db = db;

  // Catalog Repositories
  public readonly productRepository: ProductRepository;
  public readonly productOptionGroupRepository: ProductOptionGroupRepository;
  public readonly productOptionRepository: ProductOptionRepository;

  // Order Repositories
  public readonly orderRepository: OrderRepository;
  public readonly orderItemRepository: OrderItemRepository;
  public readonly orderItemModifierRepository: OrderItemModifierRepository;
  public readonly orderPaymentRepository: OrderPaymentRepository;
  public readonly kitchenTicketRepository: KitchenTicketRepository;
  public readonly orderTypeRepository: OrderTypeRepository;

  // Tenant Repositories
  public readonly tenantRepository: TenantRepository;
  public readonly tenantFeatureRepository: TenantFeatureRepository;

  // Catalog Use Cases
  public readonly getProducts: GetProducts;
  public readonly getProductById: GetProductById;
  public readonly checkProductAvailability: CheckProductAvailability;

  // Order Use Cases
  public readonly createOrder: CreateOrder;
  public readonly recordPayment: RecordPayment;
  public readonly createKitchenTicket: CreateKitchenTicket;

  // Tenant Use Cases
  public readonly getActiveFeaturesForTenant: GetActiveFeaturesForTenant;
  public readonly checkFeatureAccess: CheckFeatureAccess;

  constructor() {
    // Initialize Repositories
    this.productRepository = new ProductRepository(db);
    this.productOptionGroupRepository = new ProductOptionGroupRepository(db);
    this.productOptionRepository = new ProductOptionRepository(db);
    this.orderRepository = new OrderRepository(db);
    this.orderItemRepository = new OrderItemRepository(db);
    this.orderItemModifierRepository = new OrderItemModifierRepository(db);
    this.orderPaymentRepository = new OrderPaymentRepository(db);
    this.kitchenTicketRepository = new KitchenTicketRepository(db);
    this.orderTypeRepository = new OrderTypeRepository(db);
    this.tenantRepository = new TenantRepository(db);
    this.tenantFeatureRepository = new TenantFeatureRepository(db);

    // Initialize Use Cases with Repository Dependencies
    // Catalog
    this.getProducts = new GetProducts(this.productRepository as any);
    this.getProductById = new GetProductById(this.productRepository as any);
    this.checkProductAvailability = new CheckProductAvailability(
      this.productRepository as any
    );

    // Orders
    this.createOrder = new CreateOrder(
      this.orderRepository as any,
      this.tenantRepository as any
    );
    this.recordPayment = new RecordPayment(
      this.orderRepository as any,
      this.orderPaymentRepository as any
    );
    this.createKitchenTicket = new CreateKitchenTicket(
      this.orderRepository as any,
      this.kitchenTicketRepository as any
    );

    // Tenants
    this.getActiveFeaturesForTenant = new GetActiveFeaturesForTenant(
      this.tenantFeatureRepository as any
    );
    this.checkFeatureAccess = new CheckFeatureAccess(
      this.tenantFeatureRepository as any
    );
  }
}

// Export singleton instance
export const container = new Container();
