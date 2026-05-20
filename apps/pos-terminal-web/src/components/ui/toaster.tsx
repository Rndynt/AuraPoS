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
    <div className="fixed z-[200] top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-max max-w-[90vw]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-testid={`toast-${toast.type}`}
          className={`pointer-events-auto flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-full shadow-lg shadow-slate-200/60 border animate-in slide-in-from-top-3 fade-in duration-200 ${
            toast.type === "success"
              ? "bg-green-50 border-green-200"
              : toast.type === "error"
              ? "bg-red-50 border-red-200"
              : "bg-white border-slate-200"
          }`}
        >
          {/* Icon */}
          <div className={`flex-shrink-0 ${
            toast.type === "success" ? "text-green-600"
            : toast.type === "error" ? "text-red-500"
            : "text-blue-600"
          }`} data-testid={`toast-icon-${toast.type}`}>
            {toast.type === "success" ? <CheckCircle size={15} strokeWidth={2.5} />
              : toast.type === "error" ? <AlertTriangle size={15} strokeWidth={2.5} />
              : <Info size={15} strokeWidth={2.5} />}
          </div>

          {/* Message */}
          <p className={`text-xs font-semibold leading-tight max-w-xs ${
            toast.type === "success" ? "text-green-800"
            : toast.type === "error" ? "text-red-700"
            : "text-slate-700"
          }`} data-testid="toast-message">
            {toast.message}
          </p>

          {/* Close */}
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-1 text-slate-300 hover:text-slate-500 p-1 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
            data-testid="toast-close"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Toaster() {
  return <ToastContainer />;
}
