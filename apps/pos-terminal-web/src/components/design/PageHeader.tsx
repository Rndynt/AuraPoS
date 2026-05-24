import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

export const PageHeader = ({
  title,
  subtitle,
  onBack,
  actions,
  tabs,
  bottomContent,
}: PageHeaderProps) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="flex items-center gap-3 p-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-slate-800 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {tabs && (
        <div className="border-t border-slate-100 px-4">
          {tabs}
        </div>
      )}

      {bottomContent && (
        <div className="border-t border-slate-100 px-4 py-3">
          {bottomContent}
        </div>
      )}
    </header>
  );
};
