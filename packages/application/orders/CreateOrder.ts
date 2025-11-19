/**
 * CreateOrder Use Case
 * Creates a new order with items, modifiers, and complete pricing calculation
 */

import type { Order as DbOrder, InsertOrder } from '../../../shared/schema';
import type { Order, OrderItem, SelectedOption } from '@pos/domain/orders/types';
import type { PriceCalculation } from '@pos/domain/pricing/types';
import { DEFAULT_TAX_RATE, DEFAULT_SERVICE_CHARGE_RATE } from '@pos/core/pricing';
import { toInsertOrderDb, toDomainOrder } from './mappers';

export interface CreateOrderItemInput {
  product_id: string;
  product_name: string;
  base_price: number;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  variant_price_delta?: number;
  selected_options?: SelectedOption[];
  notes?: string;
}

export interface CreateOrderInput {
  tenant_id: string;
  items: CreateOrderItemInput[];
  order_type_id?: string;
  customer_name?: string;
  table_number?: string;
  notes?: string;
  tax_rate?: number;
  service_charge_rate?: number;
}

export interface CreateOrderOutput {
  order: Order;
  pricing: PriceCalculation;
}

export interface IOrderRepository {
  create(order: InsertOrder, tenantId: string): Promise<DbOrder>;
  generateOrderNumber(tenantId: string): Promise<string>;
}

export interface ITenantRepository {
  findById(tenantId: string): Promise<{ id: string; is_active: boolean } | null>;
}

export class CreateOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    try {
      const tenant = await this.tenantRepository.findById(input.tenant_id);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      if (!tenant.is_active) {
        throw new Error('Tenant is not active');
      }

      if (input.items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      const orderNumber = await this.orderRepository.generateOrderNumber(input.tenant_id);

      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const itemInput of input.items) {
        const variantDelta = itemInput.variant_price_delta ?? 0;
        const optionsDelta = itemInput.selected_options?.reduce(
          (sum, opt) => sum + opt.price_delta,
          0
        ) ?? 0;

        const itemPrice = itemInput.base_price + variantDelta + optionsDelta;
        const itemSubtotal = itemPrice * itemInput.quantity;

        const orderItem: OrderItem = {
          id: crypto.randomUUID(),
          product_id: itemInput.product_id,
          product_name: itemInput.product_name,
          base_price: itemInput.base_price,
          variant_id: itemInput.variant_id,
          variant_name: itemInput.variant_name,
          variant_price_delta: variantDelta,
          selected_options: itemInput.selected_options,
          quantity: itemInput.quantity,
          item_subtotal: itemSubtotal,
          notes: itemInput.notes,
          status: 'pending',
        };

        orderItems.push(orderItem);
        subtotal += itemSubtotal;
      }

      const taxRate = input.tax_rate ?? DEFAULT_TAX_RATE;
      const serviceChargeRate = input.service_charge_rate ?? DEFAULT_SERVICE_CHARGE_RATE;

      const taxAmount = subtotal * taxRate;
      const serviceChargeAmount = subtotal * serviceChargeRate;
      const totalAmount = subtotal + taxAmount + serviceChargeAmount;

      // Map domain Order type to database InsertOrder type (snake_case to camelCase)
      const orderForDb = toInsertOrderDb(
        input.tenant_id,
        orderNumber,
        input.order_type_id,
        subtotal,
        taxAmount,
        serviceChargeAmount,
        totalAmount,
        input.customer_name,
        input.table_number,
        input.notes
      );

      const createdOrderDb = await this.orderRepository.create(orderForDb, input.tenant_id);
      
      // Convert back to domain type (camelCase to snake_case)
      const createdOrder = toDomainOrder(createdOrderDb, orderItems);

      const pricing: PriceCalculation = {
        base_price: 0,
        variant_delta: 0,
        options_delta: 0,
        item_price: 0,
        quantity: 0,
        item_subtotal: 0,
        order_subtotal: subtotal,
        discounts: [],
        total_discount: 0,
        subtotal_after_discount: subtotal,
        tax_amount: taxAmount,
        service_charge_amount: serviceChargeAmount,
        total_amount: totalAmount,
      };

      return {
        order: createdOrder,
        pricing,
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
