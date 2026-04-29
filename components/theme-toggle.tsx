"use client";

import { useTheme } from "@/lib/theme-provider";
import { MoonIcon } from "@/components/ui/moon";
import { SunIcon } from "@/components/ui/sun";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
      title={`Skift tema (nu: ${theme})`}
    >
      {theme === "dark" ? (
        <SunIcon size={20} />
      ) : (
        <MoonIcon size={20} />
      )}
    </button>
  );
}
