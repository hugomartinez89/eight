"use client";

import React from "react";
import { apiR } from "~/trpc/react";
import {
  Moon,
  Sun,
  Flame,
  Snowflake,
  Clock,
  Sparkles,
  Bed,
  BellRing,
} from "lucide-react";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

export const ScheduleVisualizer: React.FC = () => {
  const profileQuery = apiR.user.getUserTemperatureProfile.useQuery();
  const profile = profileQuery.data;

  if (profileQuery.isLoading || !profile) {
    return null;
  }

  const bedTimeStr = profile.bedTime.slice(0, 5);
  const wakeTimeStr = profile.wakeupTime.slice(0, 5);
  const midTimeStr = profile.midStageSleepLevelStartTime
    ? profile.midStageSleepLevelStartTime.slice(0, 5)
    : "23:00";
  const finalTimeStr = profile.finalSleepLevelStartTime
    ? profile.finalSleepLevelStartTime.slice(0, 5)
    : "06:00";

  // Pre-heating is 1 hour before bed
  const [bH = 22, bM = 0] = bedTimeStr.split(":").map(Number);
  const preHeatH = (bH - 1 + 24) % 24;
  const preHeatTimeStr = `${String(preHeatH).padStart(2, "0")}:${String(
    bM,
  ).padStart(2, "0")}`;

  // Alarm time
  const [wH = 6, wM = 0] = wakeTimeStr.split(":").map(Number);
  const leadMinutes = profile.wakeupAlarmLeadMinutes ?? 30;
  const wakeTotalMinutes = wH * 60 + wM;
  const alarmTotalMinutes = (wakeTotalMinutes - leadMinutes + 24 * 60) % (24 * 60);
  const alarmH = Math.floor(alarmTotalMinutes / 60);
  const alarmM = alarmTotalMinutes % 60;
  const alarmTimeStr = `${String(alarmH).padStart(2, "0")}:${String(
    alarmM,
  ).padStart(2, "0")}`;

  const stages = [
    {
      name: "Pre-Heat",
      time: preHeatTimeStr,
      level: profile.initialSleepLevel,
      icon: Snowflake,
      accent: "text-sky-500",
      desc: "Mattress preps 1h before bed",
    },
    {
      name: "Bedtime",
      time: bedTimeStr,
      level: profile.initialSleepLevel,
      icon: Moon,
      accent: "text-indigo-500",
      desc: "Initial sleep temperature",
    },
    {
      name: "Mid-Stage",
      time: midTimeStr,
      level: profile.midStageSleepLevel,
      icon: Sparkles,
      accent: "text-purple-500",
      desc: "Deep sleep thermal support",
    },
    {
      name: "Final Stage",
      time: finalTimeStr,
      level: profile.finalSleepLevel,
      icon: Clock,
      accent: "text-blue-500",
      desc: "Early morning stage",
    },
    ...(profile.wakeupAlarmEnabled
      ? [
          {
            name: "Wake Alarm",
            time: alarmTimeStr,
            level: profile.wakeupAlarmLevel,
            icon: BellRing,
            accent: "text-amber-500",
            desc: `Sunrise warming (${leadMinutes}m lead)`,
          },
        ]
      : []),
    {
      name: "Wake Up",
      time: wakeTimeStr,
      level: null,
      icon: Sun,
      accent: "text-amber-500",
      desc: "Pod automatically turns OFF",
    },
  ];

  return (
    <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
            <Bed className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Night Thermal Timeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated progression throughout your night
            </p>
          </div>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Auto 30m Cron
        </span>
      </div>

      {/* Visual Horizontal Timeline */}
      <div className="relative mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-[500px] items-center justify-between space-x-2">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isLast = idx === stages.length - 1;

            return (
              <React.Fragment key={stage.name}>
                {/* Node */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border bg-white shadow-md transition-all hover:scale-105 dark:bg-slate-800 ${
                      stage.name === "Wake Alarm"
                        ? "border-amber-400 ring-2 ring-amber-400/20"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${stage.accent}`} />
                  </div>

                  <span className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {stage.time}
                  </span>

                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {stage.name}
                  </span>

                  <span
                    className={`mt-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      stage.level === null
                        ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        : stage.level > 0
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                        : stage.level < 0
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {stage.level === null
                      ? "OFF"
                      : `Level ${formatLevel(stage.level)}`}
                  </span>
                </div>

                {/* Connecting Line between stages */}
                {!isLast && (
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-200 via-indigo-200 to-slate-200 dark:from-slate-700 dark:via-indigo-900 dark:to-slate-700" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
