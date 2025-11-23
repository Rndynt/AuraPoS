import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SummaryCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    icon?: LucideIcon;
    value: string;
    positive?: boolean;
  };
  variant?: "default" | "gradient" | "alert";
  className?: string;
};

export function SummaryCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  variant = "default",
  className,
}: SummaryCardProps) {
  const variantStyles = {
    default: "bg-white border-slate-100",
    gradient: "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200/50",
    alert: "bg-white border-red-100 relative overflow-hidden"
  };

  const iconColorStyles = {
    default: "text-slate-400",
    gradient: "text-blue-100",
    alert: "text-red-400"
  };

  const valueColorStyles = {
    default: "text-slate-800",
    gradient: "text-white",
    alert: "text-red-600"
  };

  const TrendIcon = trend?.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border shadow-sm",
        variantStyles[variant],
        className
      )}
      data-testid="summary-card"
    >
      <div className={cn(
        "flex items-center gap-2 text-xs font-bold uppercase mb-2",
        iconColorStyles[variant]
      )}>
        <Icon size={14} /> {label}
      </div>
      <div className={cn(
        "text-2xl md:text-3xl font-black tracking-tight",
        valueColorStyles[variant]
      )}>
        {value}
      </div>
      {subtitle && (
        <div className={cn(
          "text-[10px] mt-2",
          variant === "gradient" ? "text-blue-50 font-medium" : 
          variant === "alert" ? "text-red-400 font-medium" : 
          "text-slate-400"
        )}>
          {subtitle}
        </div>
      )}
      {trend && (
        <div className={cn(
          "text-[10px] font-medium flex items-center gap-1 mt-2",
          variant === "gradient" 
            ? "bg-white/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm text-blue-50" 
            : trend.positive !== false 
            ? "text-green-600" 
            : "text-red-600"
        )}>
          {TrendIcon && <TrendIcon size={10} />}
          {trend.value}
        </div>
      )}
      {variant === "alert" && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
      )}
    </div>
  );
}
