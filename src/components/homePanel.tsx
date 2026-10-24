"use client";

import React from "react";
import { apiR } from "~/trpc/react";
import { RotaryThermostat } from "~/components/rotaryThermostat";
import { TemperatureCurveGraph } from "~/components/temperatureCurveGraph";
import { Card, Skeleton } from "~/components/ui/card";
import { useToast } from "~/components/ui/toast";
import { useSchedule } from "~/components/useSchedule";
import { type AppTab } from "~/components/bottomNav";
import { describeLevel, formatDuration, getNextEvent } from "~/lib/schedule";
import { Bookmark, CalendarPlus, ChevronRight, Clock, Moon, Palmtree } from "lucide-react";

export const HomePanel: React.FC<{
  onOpenBedsideMode: () => void;
  onNavigate: (tab: AppTab) => void;
}> = ({ onOpenBedsideMode, onNavigate }) => {
  const toast = useToast();
  const utils = apiR.useUtils();
  const accountQuery = apiR.user.getAccount.useQuery();
  const { savedValues, activePreset, isLoading } = useSchedule();

  const resume = apiR.user.setVacationMode.useMutation({
    onSuccess: async () => {
      await utils.user.getAccount.invalidate();
      await utils.user.getPodStatus.invalidate();
      toast("Welcome back! Schedule resumed");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const account = accountQuery.data;
  const next = savedValues ? getNextEvent(savedValues) : null;

  return (
    <div className="space-y-4">
      {account?.vacationMode && (
        <div className="flex items-center gap-3 rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-4 dark:border-teal-900/60 dark:from-teal-950/40 dark:to-cyan-950/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300">
            <Palmtree className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-teal-900 dark:text-teal-100">Vacation mode is on</p>
            <p className="text-xs text-teal-800/80 dark:text-teal-200/70">
              {account.vacationUntil
                ? `Automation paused until ${new Date(account.vacationUntil).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
                : "Automation paused until you resume it"}
            </p>
          </div>
          <button
            type="button"
            disabled={resume.isPending}
            onClick={() => resume.mutate({ enabled: false })}
            className="h-10 shrink-0 rounded-2xl bg-teal-600 px-4 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {resume.isPending ? "…" : "Resume"}
          </button>
        </div>
      )}

      {/* Tonight summary */}
      {isLoading ? (
        <Skeleton className="h-28" />
      ) : savedValues ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate("presets")}
            className="flex flex-col items-start rounded-3xl border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm transition active:scale-[0.98] dark:border-slate-800/80 dark:bg-slate-900/70"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Bookmark className="h-3.5 w-3.5 text-indigo-500" /> Preset
            </span>
            <span className="mt-1.5 line-clamp-1 text-base font-black text-slate-900 dark:text-white">
              {activePreset?.name ?? "Custom"}
            </span>
            <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {savedValues.bedTime.slice(0, 5)} → {savedValues.wakeupTime.slice(0, 5)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("schedule")}
            className="flex flex-col items-start rounded-3xl border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm transition active:scale-[0.98] dark:border-slate-800/80 dark:bg-slate-900/70"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Up next
            </span>
            {next && !account?.vacationMode ? (
              <>
                <span className="mt-1.5 text-base font-black text-slate-900 dark:text-white">
                  {next.event.label}
                </span>
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {next.event.time} · {describeLevel(next.event.level)} · in {formatDuration(next.inMinutes)}
                </span>
              </>
            ) : (
              <>
                <span className="mt-1.5 text-base font-black text-slate-900 dark:text-white">Paused</span>
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Vacation mode</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">No schedule yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pick a preset to start automating your nights.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("presets")}
            className="inline-flex h-10 items-center gap-1 rounded-2xl bg-indigo-600 px-4 text-xs font-bold text-white active:scale-95"
          >
            Choose <ChevronRight className="h-4 w-4" />
          </button>
        </Card>
      )}

      <RotaryThermostat />

      <TemperatureCurveGraph />

      <button
        type="button"
        onClick={onOpenBedsideMode}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 py-4 text-sm font-extrabold text-amber-900 shadow-sm transition active:scale-[0.98] dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-200"
      >
        <Moon className="h-4 w-4 text-amber-500" />
        Nightstand mode
      </button>
    </div>
  );
};
