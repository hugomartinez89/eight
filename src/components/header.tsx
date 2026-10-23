"use client";

import React from "react";
import { ThemeToggle } from "./themeToggle";
import { LogoutButton } from "./logout";
import { Moon, Sparkles, BedDouble } from "lucide-react";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogoutSuccess?: () => void;
  onOpenBedsideMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  onLogoutSuccess,
  onOpenBedsideMode,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3">
          <img
            src="/icon.svg"
            alt="Hugo's Pod Hub Logo"
            className="h-10 w-10 rounded-2xl shadow-md shadow-indigo-500/25 ring-1 ring-white/10"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black tracking-tight text-slate-900 sm:text-lg dark:text-white">
                Hugo&apos;s Pod Hub
              </h1>
              <span className="hidden items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 sm:inline-flex dark:bg-indigo-950/80 dark:text-indigo-300">
                <Sparkles className="mr-1 h-2.5 w-2.5" />
                Pro Edition
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Smart Scheduling &amp; Pod Manager
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Bedside Nightstand Mode Button */}
          {isLoggedIn && onOpenBedsideMode && (
            <button
              type="button"
              onClick={onOpenBedsideMode}
              title="Bedside Nightstand Mode"
              className="inline-flex items-center space-x-1.5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-2.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 active:scale-95 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
            >
              <BedDouble className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Nightstand</span>
            </button>
          )}

          <ThemeToggle />

          {isLoggedIn && onLogoutSuccess && (
            <LogoutButton onLogoutSuccess={onLogoutSuccess} />
          )}
        </div>
      </div>
    </header>
  );
};
