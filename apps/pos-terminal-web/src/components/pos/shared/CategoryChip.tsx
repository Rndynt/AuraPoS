/**
 * Category Filter Chip Component
 * Used for product category filtering
 */

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CategoryChipProps = {
  id: string;
  name: string;
  icon?: LucideIcon;
  isActive: boolean;
  onClick: () => void;
};

export function CategoryChip({
  id,
  name,
  icon: Icon,
  isActive,
  onClick,
}: CategoryChipProps) {
  // Normalize id for data-testid (replace spaces with hyphens, lowercase)
  const testId = `category-chip-${id.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
        isActive
          ? "bg-slate-800 text-white"
          : "bg-white text-slate-500 border border-slate-200"
      )}
      data-testid={testId}
    >
      {Icon && <Icon size={16} />}
      {name}
    </button>
  );
}
