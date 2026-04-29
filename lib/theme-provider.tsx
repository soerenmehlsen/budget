"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_CHANGE_EVENT = "themechange";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function syncDocumentTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function subscribeToThemeChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    syncDocumentTheme(getStoredTheme());
  }, []);

  return children;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToThemeChanges, getStoredTheme, () => "light");

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    syncDocumentTheme(newTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return { theme, toggleTheme };
}
