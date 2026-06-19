import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  (screen.orientation as any)?.lock?.("landscape").catch?.(() => {});
} catch {}

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.DEV) {
      // In development, unregister any stale service workers so they don't
      // intercept API requests with cached error responses or short timeouts.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
    } else {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  });
}
