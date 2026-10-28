"use client";

import { useEffect, useState } from "react";

export type ThemeId = "ocean" | "royal" | "emerald" | "slate";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tag: string;
  description: string;
  color: string;
  previewGradient: string;
}

export const SUPPORTED_THEMES: ThemeDefinition[] = [
  {
    id: "ocean",
    name: "Ocean Wave (Brand Signature)",
    tag: "Default Signature",
    description: "Signature Crimson & Coral Fleet gradient with crisp slate accents",
    color: "#ec1e21",
    previewGradient: "from-[#cb1518] via-[#ec1e21] to-[#f87171]",
  },
  {
    id: "royal",
    name: "Royal Fleet Navy",
    tag: "Commercial Classic",
    description: "Deep Sapphire Navy transport styling with technical azure highlights",
    color: "#2563eb",
    previewGradient: "from-[#1d4ed8] via-[#2563eb] to-[#38bdf8]",
  },
  {
    id: "emerald",
    name: "Emerald Eco-Fleet",
    tag: "Green Fleet",
    description: "Eco-transit jade and forest palette for energy-efficient fleets",
    color: "#059669",
    previewGradient: "from-[#047857] via-[#059669] to-[#34d399]",
  },
  {
    id: "slate",
    name: "Technical Charcoal",
    tag: "Heavy Depot",
    description: "Minimalist graphite and industrial workshop dark palette",
    color: "#334155",
    previewGradient: "from-[#0f172a] via-[#334155] to-[#64748b]",
  },
];

const THEME_STORAGE_KEY = "bus_inventory_theme";
const THEME_EVENT_NAME = "bus_inventory:theme_changed";

export function normalizeTheme(id?: string | null): ThemeId {
  return "ocean";
}

export function applyTheme(themeId: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeTheme(themeId);
  document.documentElement.setAttribute("data-theme", normalized);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch {}
  window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: normalized }));
}

export function getCurrentTheme(): ThemeId {
  if (typeof window === "undefined") return "ocean";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return normalizeTheme(stored);
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr) return normalizeTheme(attr);
  } catch {}
  return "ocean";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => getCurrentTheme());

  useEffect(() => {
    // Initial sync
    const current = getCurrentTheme();
    setThemeState(current);
    applyTheme(current);

    const handleThemeChange = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail) {
        setThemeState(normalizeTheme(customEvt.detail));
      }
    };

    window.addEventListener(THEME_EVENT_NAME, handleThemeChange);
    window.addEventListener("storage", (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        setThemeState(normalizeTheme(e.newValue));
        applyTheme(e.newValue);
      }
    });

    return () => {
      window.removeEventListener(THEME_EVENT_NAME, handleThemeChange);
    };
  }, []);

  const setTheme = (newTheme: string) => {
    applyTheme(newTheme);
    setThemeState(normalizeTheme(newTheme));
  };

  return {
    theme,
    setTheme,
    supportedThemes: SUPPORTED_THEMES,
  };
}
