import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ── Singleton — captured once at module load so no component ever misses it ──
let _prompt: BeforeInstallPromptEvent | null = null;
let _installed = typeof window !== "undefined" &&
  window.matchMedia("(display-mode: standalone)").matches;

const _subs = new Set<() => void>();
const notify = () => _subs.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _prompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    _prompt = null;
    _installed = true;
    notify();
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePwaInstall() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    _subs.add(fn);
    return () => { _subs.delete(fn); };
  }, []);

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!_prompt) return "unavailable";
    await _prompt.prompt();
    const { outcome } = await _prompt.userChoice;
    if (outcome === "accepted") _prompt = null;
    notify();
    return outcome;
  };

  return {
    canInstall: !!_prompt && !_installed,
    isInstalled: _installed,
    install,
  };
}
