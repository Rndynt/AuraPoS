/**
 * CreateOrder Use Case
 * Creates a new order with items, modifiers, and complete pricing calculation
 */
import { DEFAULT_TAX_RATE, DEFAULT_SERVICE_CHARGE_RATE } from '@pos/core/pricing';
export class CreateOrder {
    constructor(orderRepository, tenantRepository) {
        this.orderRepository = orderRepository;
        this.tenantRepository = tenantRepository;
    }
    async execute(input) {
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
            const orderItems = [];
            let subtotal = 0;
            for (const itemInput of input.items) {
                const variantDelta = itemInput.variant_price_delta ?? 0;
                const optionsDelta = itemInput.selected_options?.reduce((sum, opt) => sum + opt.price_delta, 0) ?? 0;
                const itemPrice = itemInput.base_price + variantDelta + optionsDelta;
                const itemSubtotal = itemPrice * itemInput.quantity;
                const orderItem = {
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
            const order = {
                tenant_id: input.tenant_id,
                items: orderItems,
                subtotal,
                tax_amount: taxAmount,
                service_charge_amount: serviceChargeAmount,
                discount_amount: 0,
                total_amount: totalAmount,
                paid_amount: 0,
                payment_status: 'unpaid',
                order_number: orderNumber,
                status: 'draft',
                customer_name: input.customer_name,
                table_number: input.table_number,
                notes: input.notes,
            };
            const createdOrder = await this.orderRepository.create(order);
            const pricing = {
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
        }
        catch (error) {
            throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
