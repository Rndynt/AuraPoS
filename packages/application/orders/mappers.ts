/**
 * Order Mappers
 * Convert between domain Order types (snake_case) and database types (camelCase)
 */

import type { Order, OrderItem } from '@pos/domain/orders/types';

export interface InsertOrderDb {
  tenantId: string;
  orderTypeId?: string;
  orderNumber: string;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  subtotal: string;
  taxAmount: string;
  serviceCharge: string;
  discountAmount: string;
  total: string;
  paidAmount: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  customerName?: string;
  tableNumber?: string;
  notes?: string;
}

export interface OrderDb {
  id: string;
  tenantId: string;
  orderTypeId?: string | null;
  orderNumber: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  serviceCharge: string;
  discountAmount: string;
  total: string;
  paidAmount: string;
  paymentStatus: string;
  customerName?: string | null;
  tableNumber?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert domain Order to database InsertOrder
 */
export function toInsertOrderDb(
  tenantId: string,
  orderNumber: string,
  orderTypeId: string | undefined,
  subtotal: number,
  taxAmount: number,
  serviceChargeAmount: number,
  totalAmount: number,
  customerName?: string,
  tableNumber?: string,
  notes?: string
): InsertOrderDb {
  return {
    tenantId,
    orderTypeId,
    orderNumber,
    status: 'draft',
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    serviceCharge: serviceChargeAmount.toString(),
    discountAmount: '0',
    total: totalAmount.toString(),
    paidAmount: '0',
    paymentStatus: 'unpaid',
    customerName,
    tableNumber,
    notes,
  };
}

/**
 * Convert database Order to domain Order
 */
export function toDomainOrder(
  dbOrder: OrderDb,
  items: OrderItem[]
): Order {
  return {
    id: dbOrder.id,
    tenant_id: dbOrder.tenantId,
    order_type_id: dbOrder.orderTypeId || undefined,
    items,
    subtotal: parseFloat(dbOrder.subtotal),
    tax_amount: parseFloat(dbOrder.taxAmount),
    service_charge_amount: parseFloat(dbOrder.serviceCharge),
    discount_amount: parseFloat(dbOrder.discountAmount),
    total_amount: parseFloat(dbOrder.total),
    paid_amount: parseFloat(dbOrder.paidAmount),
    payment_status: dbOrder.paymentStatus as 'paid' | 'partial' | 'unpaid',
    order_number: dbOrder.orderNumber,
    status: dbOrder.status as 'draft' | 'confirmed' | 'completed' | 'cancelled',
    customer_name: dbOrder.customerName || undefined,
    table_number: dbOrder.tableNumber || undefined,
    notes: dbOrder.notes || undefined,
    created_at: dbOrder.createdAt,
    updated_at: dbOrder.updatedAt,
  };
}
