import { useState } from "react";
import { useDeviceType, useIsPortrait } from "@/hooks/use-mobile";
import { RotateCcw, X, Tablet } from "lucide-react";

export function TabletOrientationGuard() {
  const device = useDeviceType();
  const isPortrait = useIsPortrait();
  const [dismissed, setDismissed] = useState(false);

  // Only show on tablet in portrait mode
  const shouldShow = device === "tablet" && isPortrait && !dismissed;

  // Reset dismiss when rotated back to portrait
  // (so warning re-appears if they rotate back)
  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm px-8 text-center"
      data-testid="overlay-tablet-orientation"
    >
      {/* Dismiss button top-right */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        data-testid="btn-dismiss-orientation-warning"
        aria-label="Tutup peringatan"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center">
          <Tablet className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-xl font-bold text-white mb-2">
        Putar Layar ke Landscape
      </h2>
      <p className="text-sm text-slate-300 max-w-xs leading-relaxed mb-8">
        Aplikasi kasir ini bekerja lebih optimal dalam mode <span className="text-white font-semibold">landscape (horizontal)</span> pada tablet. Putar perangkat Anda untuk tampilan terbaik.
      </p>

      {/* Dismiss action */}
      <button
        onClick={() => setDismissed(true)}
        className="px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
        data-testid="btn-continue-portrait"
      >
        Tetap gunakan portrait →
      </button>
    </div>
  );
}
