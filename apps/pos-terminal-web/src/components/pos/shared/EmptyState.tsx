/**
 * Reusable Empty State Component
 * Shows when there's no data to display
 */

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  className?: string;
};

export function EmptyState({ icon: Icon, message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-slate-300 py-8",
        className
      )}
      data-testid="empty-state"
    >
      <Icon size={48} className="mb-3 opacity-50" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
