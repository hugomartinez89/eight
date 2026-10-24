"use client";

import React from "react";
import { TemperatureCurveGraph } from "~/components/temperatureCurveGraph";
import { TemperatureProfileForm } from "~/components/temperatureProfileForm";
import { type AppTab } from "~/components/bottomNav";
import { Bookmark, ChevronRight } from "lucide-react";

export const SchedulePanel: React.FC<{ onNavigate: (tab: AppTab) => void }> = ({ onNavigate }) => (
  <div className="space-y-4">
    <button
      type="button"
      onClick={() => onNavigate("presets")}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-left text-xs font-bold text-slate-600 transition active:scale-[0.99] dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-300"
    >
      <span className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 text-indigo-500" />
        Want a quick start? Browse presets
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
    <TemperatureCurveGraph />
    <TemperatureProfileForm />
  </div>
);
