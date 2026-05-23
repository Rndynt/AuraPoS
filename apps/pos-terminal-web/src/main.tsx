import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Lock orientation to landscape (best-effort, not all browsers support it)
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (screen.orientation as any)?.lock?.("landscape").catch?.(() => {});
} catch {}

createRoot(document.getElementById("root")!).render(<App />);


if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      registration.addEventListener("updatefound", () => {
        if (window.confirm("A new version is available. Refresh app?")) {
          window.location.reload();
        }
      });
    } catch {
      // no-op for unsupported environments
    }
  });
}
