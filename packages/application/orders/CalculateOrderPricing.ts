/**
 * CalculateOrderPricing Use Case
 * Calculates comprehensive pricing breakdown for an order
 */

import type { SelectedOption } from '@pos/domain/orders/types';
import type { PriceCalculation, AppliedDiscount } from '@pos/domain/pricing/types';
import { DEFAULT_TAX_RATE, DEFAULT_SERVICE_CHARGE_RATE } from '@pos/core/pricing';

export interface OrderItemForPricing {
  base_price: number;
  variant_price_delta?: number;
  selected_options?: SelectedOption[];
  quantity: number;
}

export interface CalculateOrderPricingInput {
  items: OrderItemForPricing[];
  tax_rate?: number;
  service_charge_rate?: number;
  discounts?: AppliedDiscount[];
}

export interface CalculateOrderPricingOutput {
  pricing: PriceCalculation;
}

export class CalculateOrderPricing {
  async execute(input: CalculateOrderPricingInput): Promise<CalculateOrderPricingOutput> {
    try {
      let orderSubtotal = 0;

      for (const item of input.items) {
        const variantDelta = item.variant_price_delta ?? 0;
        const optionsDelta = item.selected_options?.reduce(
          (sum, opt) => sum + opt.price_delta,
          0
        ) ?? 0;

        const itemPrice = item.base_price + variantDelta + optionsDelta;
        const itemSubtotal = itemPrice * item.quantity;

        orderSubtotal += itemSubtotal;
      }

      const appliedDiscounts = input.discounts ?? [];
      const totalDiscount = appliedDiscounts.reduce(
        (sum, discount) => sum + discount.amount_saved,
        0
      );

      const subtotalAfterDiscount = Math.max(0, orderSubtotal - totalDiscount);

      const taxRate = input.tax_rate ?? DEFAULT_TAX_RATE;
      const serviceChargeRate = input.service_charge_rate ?? DEFAULT_SERVICE_CHARGE_RATE;

      const taxAmount = subtotalAfterDiscount * taxRate;
      const serviceChargeAmount = subtotalAfterDiscount * serviceChargeRate;

      const totalAmount = subtotalAfterDiscount + taxAmount + serviceChargeAmount;

      const pricing: PriceCalculation = {
        base_price: 0,
        variant_delta: 0,
        options_delta: 0,
        item_price: 0,
        quantity: 0,
        item_subtotal: 0,
        order_subtotal: orderSubtotal,
        discounts: appliedDiscounts,
        total_discount: totalDiscount,
        subtotal_after_discount: subtotalAfterDiscount,
        tax_amount: taxAmount,
        service_charge_amount: serviceChargeAmount,
        total_amount: totalAmount,
      };

      return { pricing };
    } catch (error) {
      throw new Error(`Failed to calculate order pricing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  calculateItemPrice(item: OrderItemForPricing): number {
    const variantDelta = item.variant_price_delta ?? 0;
    const optionsDelta = item.selected_options?.reduce(
      (sum, opt) => sum + opt.price_delta,
      0
    ) ?? 0;

    return item.base_price + variantDelta + optionsDelta;
  }

  calculateItemSubtotal(item: OrderItemForPricing): number {
    return this.calculateItemPrice(item) * item.quantity;
  }
}
