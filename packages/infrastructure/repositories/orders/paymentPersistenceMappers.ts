import type { OrderItem, SelectedOption } from '@pos/domain/orders/types';
import type { POSPaymentFlow, POSPaymentLineKind, POSPaymentMethod } from '@pos/domain/payments';
import type { InsertOrderItemModifier, Order, OrderBillSplit, OrderPayment } from '@pos/infrastructure/db/schema';

export type DbOrderStatus = 'draft' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type DbOrderPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type DbPaymentStatus = 'succeeded' | 'voided' | 'refunded' | 'cancelled';

const ORDER_STATUSES: readonly DbOrderStatus[] = ['draft', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
const ORDER_PAYMENT_STATUSES: readonly DbOrderPaymentStatus[] = ['unpaid', 'partial', 'paid'];
const PAYMENT_STATUSES: readonly DbPaymentStatus[] = ['succeeded', 'voided', 'refunded', 'cancelled'];
const PAYMENT_FLOWS: readonly POSPaymentFlow[] = ['FULL', 'DOWN_PAYMENT', 'MULTI_PAYMENT', 'SPLIT_BILL'];
const PAYMENT_KINDS: readonly POSPaymentLineKind[] = ['FULL_PAYMENT', 'DOWN_PAYMENT', 'REMAINING_PAYMENT', 'MULTI_PAYMENT_LINE', 'SPLIT_BILL_LINE'];
const PAYMENT_METHODS: readonly POSPaymentMethod[] = ['CASH', 'MANUAL_TRANSFER', 'MANUAL_QRIS'];

function assertOneOf<T extends string>(value: string, values: readonly T[], label: string): T {
  if ((values as readonly string[]).includes(value)) return value as T;
  throw new Error(`Invalid ${label} '${value}' from payment persistence adapter`);
}

export function toDbOrderStatus(value: string): DbOrderStatus {
  return assertOneOf(value, ORDER_STATUSES, 'order status');
}

export function toDbOrderPaymentStatus(value: string): DbOrderPaymentStatus {
  return assertOneOf(value, ORDER_PAYMENT_STATUSES, 'order payment status');
}

export function toDbPaymentStatus(value: string): DbPaymentStatus {
  return assertOneOf(value, PAYMENT_STATUSES, 'payment status');
}

export function toDbPaymentFlow(value: string): POSPaymentFlow {
  return assertOneOf(value, PAYMENT_FLOWS, 'payment flow');
}

export function toDbPaymentKind(value: string): POSPaymentLineKind {
  return assertOneOf(value, PAYMENT_KINDS, 'payment kind');
}

export function toDbPaymentMethod(value: string): POSPaymentMethod {
  return assertOneOf(value, PAYMENT_METHODS, 'payment method');
}

export function toPaymentOrderItem(input: Omit<OrderItem, 'id'>): OrderItem {
  return { id: '', ...input };
}

export function toOrderItemModifiers(options: SelectedOption[], orderItemId: string, mapper: (option: SelectedOption, orderItemId: string) => InsertOrderItemModifier): InsertOrderItemModifier[] {
  return options.map((option) => mapper(option, orderItemId));
}

export type RawLockedOrderRow = Pick<Order, 'id' | 'tenantId' | 'outletId' | 'status' | 'paymentStatus' | 'total' | 'paidAmount'> & {
  orderNumber?: string;
};

type RawQueryResult = { rows?: unknown[] } | readonly unknown[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(row: Record<string, unknown>, key: string, fallback?: string): string {
  const value = row[key];
  if (typeof value === 'string') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing string column '${key}' from payment persistence adapter`);
}

function readNullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export function firstRawRow<T = unknown>(result: RawQueryResult): T | undefined {
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
  return rows?.[0] as T | undefined;
}

export function mapRawLockedOrderRow(row: unknown): RawLockedOrderRow {
  if (!isRecord(row)) {
    throw new Error('Invalid locked order row from payment persistence adapter');
  }
  return {
    id: readString(row, 'id'),
    tenantId: readString(row, 'tenantId', readString(row, 'tenant_id', '')),
    outletId: readNullableString(row, 'outletId') ?? readNullableString(row, 'outlet_id'),
    orderNumber: readString(row, 'orderNumber', readString(row, 'order_number', '')),
    status: readString(row, 'status'),
    paymentStatus: readString(row, 'paymentStatus', readString(row, 'payment_status', 'unpaid')),
    total: readString(row, 'total', '0'),
    paidAmount: readString(row, 'paidAmount', readString(row, 'paid_amount', '0')),
  };
}

export type ExistingPaymentRow = OrderPayment;
export type ExistingSplitRow = OrderBillSplit;
