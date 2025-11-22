/**
 * Reusable Stat Card Component
 * Used in Dashboard and summary views
 */

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
};

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white p-4 rounded-xl border border-slate-100 shadow-sm",
        className
      )}
      data-testid="stat-card"
    >
      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
        <Icon size={14} /> {label}
      </div>
      <div className="text-xl font-black text-slate-800">{value}</div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 font-medium mt-1">
          {subtitle}
        </div>
      )}
      {trend && (
        <div
          className={cn(
            "text-[10px] font-medium mt-1 flex items-center gap-1",
            trend.positive !== false ? "text-green-600" : "text-red-600"
          )}
        >
          {trend.value}
        </div>
      )}
    </div>
  );
}
