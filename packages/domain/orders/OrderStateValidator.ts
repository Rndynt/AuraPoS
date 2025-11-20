/**
 * OrderStateValidator
 * Centralized validation for order status transitions
 * Ensures business rules are consistently enforced across all use cases
 */

import { OrderStatus } from '@pos/core/enums';

type OrderStatusType = "draft" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

/**
 * Map of allowed state transitions
 * Key: current status, Value: array of allowed next statuses
 */
const ALLOWED_TRANSITIONS: Record<OrderStatusType, OrderStatusType[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [], // Terminal state - no further transitions allowed
  cancelled: [], // Terminal state - no further transitions allowed
};

/**
 * Checks if a status is a terminal state (no further transitions possible)
 */
export function isTerminalStatus(status: OrderStatusType): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * Checks if a status represents an active/open order
 */
export function isOpenStatus(status: OrderStatusType): boolean {
  return status === "draft" || status === "confirmed" || status === "preparing" || status === "ready";
}

/**
 * Checks if a status represents a closed order
 */
export function isClosedStatus(status: OrderStatusType): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * Validates if a state transition is allowed
 * @throws Error if transition is not allowed
 */
export function assertTransition(currentStatus: OrderStatusType, targetStatus: OrderStatusType): void {
  // No-op if staying in same status (idempotent operations)
  if (currentStatus === targetStatus) {
    return;
  }

  // Check if transition is allowed
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus];
  
  if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
    throw new Error(
      `Invalid status transition: cannot change from '${currentStatus}' to '${targetStatus}'`
    );
  }
}

/**
 * Returns all allowed next statuses for a given current status
 */
export function getAllowedNextStatuses(currentStatus: OrderStatusType): OrderStatusType[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates if an order can be confirmed
 */
export function canConfirmOrder(status: OrderStatusType): boolean {
  return status === "draft";
}

/**
 * Validates if an order can be completed
 */
export function canCompleteOrder(status: OrderStatusType): boolean {
  return status === "ready" || status === "preparing";
}

/**
 * Validates if an order can be cancelled
 */
export function canCancelOrder(status: OrderStatusType): boolean {
  return !isTerminalStatus(status);
}
