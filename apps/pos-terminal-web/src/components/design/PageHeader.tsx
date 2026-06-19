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
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
      {/* Native app style title bar */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0 -ml-1"
            data-testid="button-back"
          >
            <ArrowLeft size={18} className="text-slate-700" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-slate-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Actions row — moved below title, not cluttering the header */}
      {actions && (
        <div className="px-4 pb-3 flex items-center gap-2">
          {actions}
        </div>
      )}

      {tabs && (
        <div className="border-t border-slate-100 px-4">
          {tabs}
        </div>
      )}

      {bottomContent && (
        <div className="border-t border-slate-100 px-4 py-2">
          {bottomContent}
        </div>
      )}
    </header>
  );
};
