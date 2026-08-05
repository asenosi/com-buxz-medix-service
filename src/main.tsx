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

    const palette = (localStorage.getItem("theme:palette") || "default");
    document.documentElement.setAttribute("data-theme", palette);
  } catch {
    // no-op
  }
})();

// Register service worker for push notifications (production only, never in Lovable preview/iframe)
const swAllowed = (() => {
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  const h = window.location.hostname;
  if (new URLSearchParams(window.location.search).has("sw") ) return false;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return false;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return false;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return false;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return false;
  return true;
})();

if ("serviceWorker" in navigator && !swAllowed) {
  // Clean up any stale worker that could serve deleted chunks in preview/dev
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

if (swAllowed) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}


createRoot(document.getElementById("root")!).render(<App />);
