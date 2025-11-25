import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import { ToastContext, useToastState, useToast } from "@/hooks/use-toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const value = useToastState();

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed z-[100] top-4 left-4 right-4 md:top-auto md:bottom-8 md:left-auto md:right-8 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-testid={`toast-${toast.type}`}
          className="pointer-events-auto flex items-center gap-3 bg-white border border-slate-100 p-4 rounded-xl shadow-xl shadow-slate-200/50 animate-in slide-in-from-top-2 md:slide-in-from-bottom-2 fade-in duration-300 max-w-sm w-full ml-auto"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              toast.type === "success"
                ? "bg-green-50 text-green-600"
                : toast.type === "error"
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-600"
            }`}
            data-testid={`toast-icon-${toast.type}`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={16} strokeWidth={3} />
            ) : toast.type === "error" ? (
              <AlertTriangle size={16} strokeWidth={3} />
            ) : (
              <Info size={16} strokeWidth={3} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-tight mb-0.5">
              {toast.type === "success"
                ? "Berhasil"
                : toast.type === "error"
                ? "Gagal"
                : "Info"}
            </p>
            <p className="text-xs text-slate-500 truncate" data-testid="toast-message">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
            data-testid="toast-close"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Toaster() {
  return <ToastContainer />;
}
