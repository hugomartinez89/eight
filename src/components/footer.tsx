"use client";

import React from "react";
import { Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-white/50 py-6 text-center text-xs text-slate-500 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/50 dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center sm:items-start">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            Hugo&apos;s Pod Hub · Smart Scheduling &amp; Pod Manager
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Original work &copy; {new Date().getFullYear()}{" "}
            <a
              href="https://github.com/aerotow/eightsleep-nosub-app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              aerotow
            </a>{" "}
            · Mod by Hugo&apos;s AI
          </p>
        </div>

        <div className="flex items-center space-x-1 text-[11px] text-slate-400 dark:text-slate-500">
          <span>Crafted with</span>
          <Heart className="h-3 w-3 fill-rose-500 text-rose-500 inline" />
          <span>for better sleep without subscriptions</span>
        </div>
      </div>
    </footer>
  );
};
