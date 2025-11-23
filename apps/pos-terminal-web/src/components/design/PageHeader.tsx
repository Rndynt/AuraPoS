import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, onBack, actions }: PageHeaderProps) => {
  return (
    <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full md:w-auto">
          {actions}
        </div>
      )}
    </header>
  );
};
