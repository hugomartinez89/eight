"use client";

import React from "react";
import { ThemeToggle } from "./themeToggle";
import { LogoutButton } from "./logout";
import { Moon, Sparkles } from "lucide-react";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogoutSuccess?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  onLogoutSuccess,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-md shadow-indigo-500/20">
            <Moon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-white">
                Hugo&apos;s Pod Hub
              </h1>
              <span className="hidden items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 sm:inline-flex dark:bg-indigo-950/80 dark:text-indigo-300">
                <Sparkles className="mr-1 h-2.5 w-2.5" />
                No-Sub Edition
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Smart Scheduling &amp; Pod Manager
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <ThemeToggle />
          {isLoggedIn && onLogoutSuccess && (
            <LogoutButton onLogoutSuccess={onLogoutSuccess} />
          )}
        </div>
      </div>
    </header>
  );
};
