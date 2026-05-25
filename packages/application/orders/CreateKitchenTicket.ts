/**
 * CreateKitchenTicket Use Case
 * Generates a kitchen ticket from an order for preparation tracking
 */

export interface CreateKitchenTicketInput {
  order_id: string;
  tenant_id: string;
  priority?: 'normal' | 'high' | 'urgent';
}

export interface CreateKitchenTicketOutput {
  ticket: any;
}

export interface IOrderRepository {
  findById(orderId: string, tenantId: string): Promise<any | null>;
}

export interface IKitchenTicketRepository {
  create(ticket: any, tenantId: string): Promise<any>;
  generateTicketNumber(tenantId: string): Promise<string>;
}

export class CreateKitchenTicket {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly kitchenTicketRepository: IKitchenTicketRepository
  ) {}

  async execute(input: CreateKitchenTicketInput): Promise<CreateKitchenTicketOutput> {
    try {
      const order = await this.orderRepository.findById(input.order_id, input.tenant_id);
      if (!order) {
        throw new Error('Order not found');
      }

      // DB returns camelCase; support both camelCase and snake_case
      const orderTenantId: string = order.tenantId ?? order.tenant_id;
      if (orderTenantId !== input.tenant_id) {
        throw new Error('Order does not belong to the specified tenant');
      }

      if (order.status === 'cancelled') {
        throw new Error('Cannot create kitchen ticket for cancelled order');
      }

      const allItems: any[] = order.items ?? [];
      if (allItems.length === 0) {
        throw new Error('Order has no items to prepare');
      }

      // Accept items without status (treat as pending) or with pending/preparing status
      const items = allItems.filter(
        (item: any) => !item.status || item.status === 'pending' || item.status === 'preparing'
      );

      if (items.length === 0) {
        throw new Error('No pending items to prepare');
      }

      const ticketNumber = await this.kitchenTicketRepository.generateTicketNumber(input.tenant_id);

      // Support both camelCase (DB) and snake_case (domain) for tableNumber
      const tableNumber: string | null = order.tableNumber ?? order.table_number ?? null;

      // Build insert object using camelCase matching InsertKitchenTicket schema
      const ticketInsert = {
        orderId: input.order_id,
        ticketNumber,
        tableNumber,
        status: 'pending',
        items,
        priority: input.priority ?? 'normal',
      };

      const createdTicket = await this.kitchenTicketRepository.create(ticketInsert, input.tenant_id);

      return { ticket: createdTicket };
    } catch (error) {
      throw new Error(`Failed to create kitchen ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
