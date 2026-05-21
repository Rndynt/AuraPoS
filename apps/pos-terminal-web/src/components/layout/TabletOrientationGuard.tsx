import { useState } from "react";
import { useDeviceType, useIsPortrait } from "@/hooks/use-mobile";
import { RotateCcw, Tablet } from "lucide-react";

export function TabletOrientationGuard() {
  const device = useDeviceType();
  const isPortrait = useIsPortrait();
  const [dismissed, setDismissed] = useState(false);

  // Only show on actual touch tablets (not phones, not desktop) in portrait mode
  const shouldShow = device === "tablet" && isPortrait && !dismissed;

  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm px-8 text-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="overlay-tablet-orientation"
    >
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
        Aplikasi kasir bekerja lebih optimal dalam mode{" "}
        <span className="text-white font-semibold">landscape (horizontal)</span>{" "}
        pada tablet. Putar perangkat Anda untuk tampilan terbaik.
      </p>

      {/* Primary action — always visible */}
      <button
        onClick={() => setDismissed(true)}
        className="w-full max-w-xs py-3 rounded-2xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 active:bg-slate-200 transition-colors mb-3"
        data-testid="btn-dismiss-orientation-warning"
      >
        Tetap gunakan portrait
      </button>
      <p className="text-xs text-slate-500">
        Atau putar perangkat ke landscape untuk melanjutkan
      </p>
    </div>
  );
}
