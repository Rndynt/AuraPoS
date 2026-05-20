import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Lock orientation to landscape (best-effort, not all browsers support it)
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (screen.orientation as any)?.lock?.("landscape").catch?.(() => {});
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
