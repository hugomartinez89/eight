"use client";

import React from "react";
import { useTheme } from "./themeProvider";
import { Sun, Moon, Laptop } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <button
        type="button"
        onClick={() => setTheme("light")}
        title="Light theme"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
          theme === "light"
            ? "bg-amber-500 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <Sun className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme("dark")}
        title="Dark theme"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
          theme === "dark"
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <Moon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme("system")}
        title="System theme"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
          theme === "system"
            ? "bg-slate-700 text-white shadow-sm dark:bg-slate-700"
            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        }`}
      >
        <Laptop className="h-4 w-4" />
      </button>
    </div>
  );
};
