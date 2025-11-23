import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export const EmptyState = ({ icon: Icon, title, subtitle }: EmptyStateProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
      <Icon size={48} className="mb-3 opacity-20" />
      <p className="text-sm font-bold">{title}</p>
      {subtitle && (
        <p className="text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
};
