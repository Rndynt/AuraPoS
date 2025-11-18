/**
 * CreateKitchenTicket Use Case
 * Generates a kitchen ticket from an order for preparation tracking
 */
export class CreateKitchenTicket {
    constructor(orderRepository, kitchenTicketRepository) {
        this.orderRepository = orderRepository;
        this.kitchenTicketRepository = kitchenTicketRepository;
    }
    async execute(input) {
        try {
            const order = await this.orderRepository.findById(input.order_id);
            if (!order) {
                throw new Error('Order not found');
            }
            if (order.tenant_id !== input.tenant_id) {
                throw new Error('Order does not belong to the specified tenant');
            }
            if (order.status === 'cancelled') {
                throw new Error('Cannot create kitchen ticket for cancelled order');
            }
            if (order.items.length === 0) {
                throw new Error('Order has no items to prepare');
            }
            const items = order.items.filter(item => item.status === 'pending' || item.status === 'preparing');
            if (items.length === 0) {
                throw new Error('No pending items to prepare');
            }
            const ticketNumber = await this.kitchenTicketRepository.generateTicketNumber(input.tenant_id);
            const ticket = {
                order_id: input.order_id,
                tenant_id: input.tenant_id,
                items,
                table_number: order.table_number,
                priority: input.priority ?? 'normal',
                status: 'pending',
            };
            const createdTicket = await this.kitchenTicketRepository.create(ticket);
            return {
                ticket: createdTicket,
            };
        }
        catch (error) {
            throw new Error(`Failed to create kitchen ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
