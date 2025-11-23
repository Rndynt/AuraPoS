import { LucideIcon } from "lucide-react";

type StatCardVariant = "default" | "primary" | "warning" | "danger";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: StatCardVariant;
}

const variantStyles: Record<StatCardVariant, { container: string; value: string; subtitle: string; icon: string }> = {
  default: {
    container: "bg-white border-slate-200",
    value: "text-slate-800",
    subtitle: "text-slate-400",
    icon: "text-slate-400"
  },
  primary: {
    container: "bg-white border-slate-200",
    value: "text-blue-600",
    subtitle: "text-slate-400",
    icon: "text-blue-400"
  },
  warning: {
    container: "bg-orange-50 border-orange-100",
    value: "text-orange-600",
    subtitle: "text-orange-400",
    icon: "text-orange-400"
  },
  danger: {
    container: "bg-red-50 border-red-100",
    value: "text-red-600",
    subtitle: "text-red-400",
    icon: "text-red-400"
  }
};

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = "default" 
}: StatCardProps) => {
  const styles = variantStyles[variant];

  return (
    <div className={`p-4 rounded-xl border shadow-sm ${styles.container}`}>
      {Icon && (
        <div className={`flex items-center gap-2 text-xs font-bold uppercase mb-1 ${styles.icon}`}>
          <Icon size={14} /> {title}
        </div>
      )}
      {!Icon && (
        <p className="text-xs text-slate-500 font-bold uppercase mb-1">
          {title}
        </p>
      )}
      <h3 className={`text-2xl font-black ${styles.value}`}>{value}</h3>
      {subtitle && (
        <span className={`text-[10px] mt-1 block ${styles.subtitle}`}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
