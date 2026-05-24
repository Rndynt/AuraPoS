import { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export function PwaInstallPrompt() {
  const { canInstall, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("pwa-install-dismissed") === "1");

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted" || outcome === "dismissed") setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!canInstall || dismissed) return null;

  return (
    <div
      role="complementary"
      data-testid="pwa-install-prompt"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-sm max-w-sm w-[calc(100%-2rem)]"
    >
      <Smartphone className="w-5 h-5 shrink-0 text-blue-400" />
      <span className="flex-1 leading-snug">
        Pasang AuraPoS di layar utama untuk akses offline yang lebih cepat.
      </span>
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1"
        onClick={handleInstall}
        data-testid="pwa-install-confirm"
      >
        <Download className="w-3.5 h-3.5" />
        Pasang
      </Button>
      <button
        onClick={handleDismiss}
        className="text-slate-400 hover:text-white shrink-0"
        aria-label="Tutup"
        data-testid="pwa-install-dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
