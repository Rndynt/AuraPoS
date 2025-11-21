/**
 * UpdateOrder Use Case
 * Updates an existing order with new items and recalculates pricing
 */

import type { Order, OrderItem, SelectedOption } from '@pos/domain/orders/types';
import type { PriceCalculation } from '@pos/domain/pricing/types';
import { DEFAULT_TAX_RATE, DEFAULT_SERVICE_CHARGE_RATE } from '@pos/core/pricing';
import { calculateSelectedOptionsDelta, flattenSelectedOptions } from '../catalog';

export interface UpdateOrderItemInput {
  product_id: string;
  product_name: string;
  base_price: number;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  variant_price_delta?: number;
  selected_options?: Array<{
    group_id: string;
    group_name: string;
    option_id: string;
    option_name: string;
    price_delta: number;
  }>;
  notes?: string;
}

export interface UpdateOrderInput {
  order_id: string;
  tenant_id: string;
  items: UpdateOrderItemInput[];
  order_type_id?: string;
  customer_name?: string;
  table_number?: string;
  notes?: string;
  tax_rate?: number;
  service_charge_rate?: number;
}

export interface UpdateOrderOutput {
  order: Order;
  pricing: PriceCalculation;
}

export interface IOrderRepository {
  findById(orderId: string, tenantId?: string): Promise<Order | null>;
  updateWithItems(
    orderId: string,
    orderUpdates: Partial<Order>,
    newItems: UpdateOrderItemInput[],
    tenantId: string
  ): Promise<Order>;
}

export interface ITenantRepository {
  findById(tenantId: string): Promise<{ id: string; is_active: boolean } | null>;
}

export class UpdateOrder {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly tenantRepository: ITenantRepository
  ) {}

  async execute(input: UpdateOrderInput): Promise<UpdateOrderOutput> {
    try {
      // Validate tenant exists and is active
      const tenant = await this.tenantRepository.findById(input.tenant_id);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      if (!tenant.is_active) {
        throw new Error('Tenant is not active');
      }

      // Validate order exists (findById already checks tenant isolation)
      const order = await this.orderRepository.findById(input.order_id, input.tenant_id);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate items
      if (!input.items || input.items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      // Calculate new pricing
      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (const itemInput of input.items) {
        const variantDelta = itemInput.variant_price_delta ?? 0;
        const optionsDelta = calculateSelectedOptionsDelta(itemInput.selected_options, undefined);

        const flattenedOptions = flattenSelectedOptions(itemInput.selected_options, undefined);

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
          selected_options: flattenedOptions,
          selected_option_groups: undefined,
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

      // Prepare order updates
      const orderUpdates: Partial<Order> = {
        order_type_id: input.order_type_id,
        customer_name: input.customer_name,
        table_number: input.table_number,
        notes: input.notes,
        order_subtotal: subtotal,
        tax_amount: taxAmount,
        service_charge_amount: serviceChargeAmount,
        total_amount: totalAmount,
        tax_rate: taxRate,
        service_charge_rate: serviceChargeRate,
      };

      // Update order with new items
      const updatedOrder = await this.orderRepository.updateWithItems(
        input.order_id,
        orderUpdates,
        input.items,
        input.tenant_id
      );

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
        order: updatedOrder,
        pricing,
      };
    } catch (error) {
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
