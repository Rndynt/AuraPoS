/**
 * Reusable Status Badge Component
 * Displays status with consistent styling from design tokens
 */

import { cn } from "@/lib/utils";
import {
  TABLE_STATUS_COLORS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/design-tokens";

type TableStatus = keyof typeof TABLE_STATUS_COLORS;
type OrderStatus = keyof typeof ORDER_STATUS_COLORS;
type PaymentStatus = keyof typeof PAYMENT_STATUS_COLORS;

type StatusBadgeProps = {
  variant: "table" | "order" | "payment";
  status: string;
  className?: string;
};

export function StatusBadge({ variant, status, className }: StatusBadgeProps) {
  let colors;
  let label;

  if (variant === "table") {
    const config = TABLE_STATUS_COLORS[status as TableStatus] || TABLE_STATUS_COLORS.available;
    colors = `${config.bg} ${config.text} border ${config.border}`;
    label = config.label;
  } else if (variant === "order") {
    const config = ORDER_STATUS_COLORS[status as OrderStatus] || ORDER_STATUS_COLORS.draft;
    colors = `${config.bg} ${config.text}`;
    label = config.label;
  } else {
    const config = PAYMENT_STATUS_COLORS[status as PaymentStatus] || PAYMENT_STATUS_COLORS.unpaid;
    colors = `${config.bg} ${config.text}`;
    label = config.label;
  }

  return (
    <div
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block",
        colors,
        className
      )}
      data-testid={`badge-${variant}-${status}`}
    >
      {label}
    </div>
  );
}
