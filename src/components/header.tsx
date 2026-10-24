"use client";

import React from "react";
import { apiR } from "~/trpc/react";
import { BedDouble, Palmtree } from "lucide-react";

interface HeaderProps {
  isLoggedIn: boolean;
  onOpenBedsideMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isLoggedIn, onOpenBedsideMode }) => {
  const podStatusQuery = apiR.user.getPodStatus.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false,
  });
  const accountQuery = apiR.user.getAccount.useQuery(undefined, {
    enabled: isLoggedIn,
    retry: false,
  });

  const onVacation = accountQuery.data?.vacationMode ?? false;
  const isOn = podStatusQuery.data?.isOn ?? false;
  const hasStatus = !!podStatusQuery.data;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/icon.svg"
            alt=""
            className="h-9 w-9 rounded-xl shadow-md shadow-indigo-500/25 ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight text-slate-900 dark:text-white">
              Pod Hub
            </h1>
            {isLoggedIn && (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {onVacation ? (
                  <>
                    <Palmtree className="h-3 w-3 text-teal-500" />
                    <span>Vacation mode</span>
                  </>
                ) : (
                  <>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        !hasStatus ? "bg-slate-400" : isOn ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    <span>{!hasStatus ? "Connecting…" : isOn ? "Pod is on" : "Pod is off"}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {isLoggedIn && onOpenBedsideMode && (
          <button
            type="button"
            onClick={onOpenBedsideMode}
            aria-label="Open nightstand mode"
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 text-xs font-bold text-amber-800 transition active:scale-95 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <BedDouble className="h-4 w-4 text-amber-500" />
            <span>Nightstand</span>
          </button>
        )}
      </div>
    </header>
  );
};
