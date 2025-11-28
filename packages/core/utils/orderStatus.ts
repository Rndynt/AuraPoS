/**
 * Order Status Helper Utilities
 * 
 * Provides type-safe helpers for determining order state and available actions
 * Used throughout the application to enforce proper state transitions
 */

export type OrderStatus = "draft" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";

/**
 * Check if order is in draft state (not yet confirmed)
 */
export function isDraft(status: OrderStatus): boolean {
  return status === "draft";
}

/**
 * Check if order is open/active (confirmed but not completed)
 */
export function isOpen(status: OrderStatus): boolean {
  return ["confirmed", "preparing", "ready"].includes(status);
}

/**
 * Check if order is currently in kitchen (preparing or ready)
 */
export function isInProgress(status: OrderStatus): boolean {
  return ["preparing", "ready"].includes(status);
}

/**
 * Check if order is completed (lifecycle finished)
 */
export function isCompleted(status: OrderStatus): boolean {
  return status === "completed";
}

/**
 * Check if order is cancelled
 */
export function isCancelled(status: OrderStatus): boolean {
  return status === "cancelled";
}

/**
 * Check if order can be sent to kitchen
 * (Only CONFIRMED orders should be sent to kitchen)
 */
export function canSendToKitchen(status: OrderStatus): boolean {
  return status === "confirmed";
}

/**
 * Check if payment can be recorded for this order
 * (Any open/active order can receive payment)
 */
export function canRecordPayment(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  // Cannot record payment on completed orders (already closed)
  // Can record on any other state
  return !isCompleted(status) && !isCancelled(status);
}

/**
 * Check if order is fully paid
 */
export function isPaid(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "paid";
}

/**
 * Check if order has partial payment
 */
export function isPartiallyPaid(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "partial";
}

/**
 * Check if order is unpaid
 */
export function isUnpaid(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "unpaid";
}

/**
 * Check if order can be completed
 * (Only allowed when order is PAID and in kitchen or ready state)
 */
export function canComplete(
  status: OrderStatus,
  paymentStatus: PaymentStatus
): boolean {
  // Must be paid AND in a state that can be completed
  if (!isPaid(paymentStatus)) return false;
  
  // Can complete from preparing, ready, or already prepared
  return ["preparing", "ready", "completed"].includes(status);
}

/**
 * Get human-readable order status label
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

/**
 * Get human-readable payment status label
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    unpaid: "Unpaid",
    partial: "Partially Paid",
    paid: "Paid",
  };
  return labels[status] || status;
}

/**
 * Get badge color for order status (for UI)
 */
export function getStatusBadgeColor(status: OrderStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "draft":
      return "secondary";
    case "confirmed":
      return "outline";
    case "preparing":
    case "ready":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "default";
  }
}

/**
 * Get badge color for payment status (for UI)
 */
export function getPaymentBadgeColor(status: PaymentStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "unpaid":
      return "destructive";
    case "partial":
      return "outline";
    case "paid":
      return "secondary";
    default:
      return "default";
  }
}

/**
 * Determine if user needs to take action
 * Returns true if order is incomplete and action is needed
 */
export function needsAttention(
  status: OrderStatus,
  paymentStatus: PaymentStatus
): boolean {
  // Draft orders don't need attention (customer still deciding)
  if (isDraft(status)) return false;
  
  // Completed orders don't need attention
  if (isCompleted(status)) return false;
  
  // Cancelled orders don't need attention
  if (isCancelled(status)) return false;
  
  // Open orders that are unpaid need attention
  if (isOpen(status) && !isPaid(paymentStatus)) return true;
  
  // In-progress orders without full payment need attention
  if (isInProgress(status) && !isPaid(paymentStatus)) return true;
  
  return false;
}
