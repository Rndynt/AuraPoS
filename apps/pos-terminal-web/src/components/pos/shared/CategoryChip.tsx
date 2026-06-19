/**
 * Category Filter Chip Component
 * Used for product category filtering
 */

import { cn } from "@/lib/utils";

type CategoryChipProps = {
  id: string;
  name: string;
  isActive: boolean;
  onClick: () => void;
};

export function CategoryChip({
  id,
  name,
  isActive,
  onClick,
}: CategoryChipProps) {
  const testId = `category-chip-${id.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0",
        isActive
          ? "bg-blue-600 text-white shadow-sm shadow-blue-200/60"
          : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
      )}
      data-testid={testId}
    >
      {name}
    </button>
  );
}
