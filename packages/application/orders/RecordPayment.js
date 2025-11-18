/**
 * RecordPayment Use Case
 * Records a payment for an order, supports partial payments
 */
export class RecordPayment {
    constructor(orderRepository, paymentRepository) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
    }
    async execute(input) {
        try {
            if (input.amount <= 0) {
                throw new Error('Payment amount must be greater than zero');
            }
            const order = await this.orderRepository.findById(input.order_id);
            if (!order) {
                throw new Error('Order not found');
            }
            if (order.tenant_id !== input.tenant_id) {
                throw new Error('Order does not belong to the specified tenant');
            }
            if (order.status === 'cancelled') {
                throw new Error('Cannot record payment for cancelled order');
            }
            const remainingAmount = order.total_amount - order.paid_amount;
            if (input.amount > remainingAmount) {
                throw new Error(`Payment amount (Rp ${input.amount}) exceeds remaining balance (Rp ${remainingAmount})`);
            }
            const payment = {
                order_id: input.order_id,
                amount: input.amount,
                payment_method: input.payment_method,
                payment_status: 'completed',
                transaction_ref: input.transaction_ref,
                notes: input.notes,
                paid_at: new Date(),
            };
            const createdPayment = await this.paymentRepository.create(payment);
            const newPaidAmount = order.paid_amount + input.amount;
            const newRemainingAmount = order.total_amount - newPaidAmount;
            let newPaymentStatus;
            if (newRemainingAmount === 0) {
                newPaymentStatus = 'paid';
            }
            else if (newPaidAmount > 0) {
                newPaymentStatus = 'partial';
            }
            else {
                newPaymentStatus = 'unpaid';
            }
            const updatedOrder = await this.orderRepository.update(input.order_id, {
                paid_amount: newPaidAmount,
                payment_status: newPaymentStatus,
            });
            return {
                payment: createdPayment,
                order: updatedOrder,
                remainingAmount: newRemainingAmount,
            };
        }
        catch (error) {
            throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
