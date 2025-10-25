import { useEffect, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeName =
  | "default"
  | "ubuntu"
  | "african-sunset"
  | "township-green"
  | "kwazulu-gold"
  | "cape-blue"
  | "pretoria-purple"
  | "mandela";

const applyThemeClass = (mode: ThemeMode) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || (mode === "system" && systemDark);
  root.classList.toggle("dark", isDark);
};

const applyPalette = (palette: ThemeName) => {
  const root = document.documentElement;
  root.setAttribute("data-theme", palette);
};

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme") as ThemeMode | null;
    return saved ?? "system";
  });

  const [palette, setPalette] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("theme:palette") as ThemeName | null;
    return saved ?? "african-sunset";
  });

  useEffect(() => {
    applyThemeClass(mode);
    localStorage.setItem("theme", mode);
  }, [mode]);

  useEffect(() => {
    applyPalette(palette);
    localStorage.setItem("theme:palette", palette);
  }, [palette]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeClass("system");
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  return { mode, setMode, toggle, palette, setPalette };
}

