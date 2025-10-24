import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply initial theme before React mounts to prevent FOUC
(() => {
  try {
    const saved = localStorage.getItem("theme");
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved || saved === "system") && systemDark;
    document.documentElement.classList.toggle("dark", Boolean(isDark));
  } catch {
    // no-op
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
