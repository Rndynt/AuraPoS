import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Lock orientation to landscape ────────────────────────────────────────────
if (screen.orientation?.lock) {
  screen.orientation.lock("landscape").catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
