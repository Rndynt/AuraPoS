import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  (screen.orientation as any)?.lock?.("landscape").catch?.(() => {});
} catch {}

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
    });
  });
}
