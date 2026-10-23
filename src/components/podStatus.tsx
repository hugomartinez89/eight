"use client";

import React, { useState, useEffect } from "react";
import { apiR } from "~/trpc/react";
import {
  Power,
  RotateCw,
  Thermometer,
  Flame,
  Snowflake,
  Bed,
} from "lucide-react";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

export const PodStatus: React.FC = () => {
  const [sliderLevel, setSliderLevel] = useState<number>(0);
  const [isSliderDirty, setIsSliderDirty] = useState<boolean>(false);

  const utils = apiR.useUtils();

  const podStatusQuery = apiR.user.getPodStatus.useQuery(undefined, {
    refetchInterval: 3_000,
  });

  const status = podStatusQuery.data;
  const isOn = status?.isOn ?? false;

  useEffect(() => {
    if (status && !isSliderDirty) {
      const currentTarget = status.targetHeatingLevel ?? status.heatingLevel;
      setSliderLevel(Math.round(currentTarget / 10));
    }
  }, [status, isSliderDirty]);

  const setPowerMutation = apiR.user.setPodPower.useMutation({
    onSuccess: async () => {
      await utils.user.getPodStatus.invalidate();
    },
    onError: (err) => {
      console.error("Failed to toggle pod power:", err.message);
    },
  });

  const setTargetLevelMutation = apiR.user.setPodTargetLevel.useMutation({
    onSuccess: async () => {
      setIsSliderDirty(false);
      await utils.user.getPodStatus.invalidate();
    },
    onError: (err) => {
      console.error("Failed to set target level:", err.message);
    },
  });

  const handleTogglePower = () => {
    setPowerMutation.mutate({ isOn: !isOn });
  };

  const handleApplyTemperature = (levelToApply = sliderLevel) => {
    setTargetLevelMutation.mutate({
      level: Math.round(levelToApply * 10),
      turnOn: !isOn ? true : undefined,
    });
  };

  const handlePreset = (level: number) => {
    setSliderLevel(level);
    setIsSliderDirty(true);
  };

  const getSliderBadgeStyle = (lvl: number) => {
    if (lvl > 0) {
      return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200";
    }
    if (lvl < 0) {
      return "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200";
    }
    return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-2xl/40">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
            <Bed className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pod Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live mattress diagnostics
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void podStatusQuery.refetch()}
          disabled={podStatusQuery.isFetching}
          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${
              podStatusQuery.isFetching ? "animate-spin text-indigo-500" : ""
            }`}
          />
          <span>{podStatusQuery.isFetching ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {podStatusQuery.isLoading && !status && (
        <div className="flex h-44 items-center justify-center text-sm text-slate-400">
          <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          Connecting to your Eight Sleep Pod...
        </div>
      )}

      {podStatusQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          Could not load pod status: {podStatusQuery.error.message}
        </div>
      )}

      {status && (
        <div className="space-y-5">
          {/* Power Row & Main Status Hero */}
          <div className="grid grid-cols-2 gap-3">
            {/* Power Tile */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Power State
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isOn
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span
                    className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                      isOn ? "animate-pulse bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {isOn ? "Active (On)" : "Off"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleTogglePower}
                disabled={setPowerMutation.isPending}
                className={`mt-3 inline-flex w-full items-center justify-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                  isOn
                    ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-400"
                    : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                <span>
                  {setPowerMutation.isPending
                    ? isOn
                      ? "Turning off..."
                      : "Turning on..."
                    : isOn
                    ? "Turn Off"
                    : "Turn On"}
                </span>
              </button>
            </div>

            {/* Current Bed Temperature Tile */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Bed Surface
                </span>
                <Thermometer className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              </div>

              <div className="mt-2">
                <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {status.temperatureF !== null
                    ? `${status.temperatureF.toFixed(0)}°F`
                    : "—"}
                  {status.temperatureC !== null && (
                    <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                      ({status.temperatureC.toFixed(1)}°C)
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Level {formatLevel(status.heatingLevel)}</span>
                  {status.targetHeatingLevel !== status.heatingLevel && (
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      → {formatLevel(status.targetHeatingLevel)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity State Banner */}
          {isOn && (
            <div
              className={`flex items-center space-x-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                status.isHeating
                  ? status.heatingLevel > 0
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
              }`}
            >
              {status.isHeating ? (
                status.heatingLevel > 0 ? (
                  <>
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span>Pod is actively warming your mattress</span>
                  </>
                ) : (
                  <>
                    <Snowflake className="h-4 w-4 text-sky-500" />
                    <span>Pod is actively cooling your mattress</span>
                  </>
                )
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Bed is on and maintaining target temperature</span>
                </>
              )}
            </div>
          )}

          {/* Quick Temperature Slider Control */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Adjust Temperature Level
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target level range from -10 to +10
                </p>
              </div>

              <span
                className={`rounded-lg border px-2.5 py-1 text-sm font-bold shadow-sm transition-all ${getSliderBadgeStyle(
                  sliderLevel,
                )}`}
              >
                {sliderLevel > 0 ? `+${sliderLevel}` : sliderLevel}
              </span>
            </div>

            {/* Slider */}
            <div className="mt-4 flex items-center space-x-3">
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                -10
              </span>
              <input
                type="range"
                min="-10"
                max="10"
                step="1"
                value={sliderLevel}
                onChange={(e) => {
                  setSliderLevel(Number(e.target.value));
                  setIsSliderDirty(true);
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
              />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                +10
              </span>
            </div>

            {/* Quick Presets */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3 dark:border-slate-800">
              <div className="flex space-x-1.5">
                {[-3, 0, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handlePreset(lvl)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                      sliderLevel === lvl
                        ? "bg-slate-300 font-bold text-slate-900 dark:bg-slate-700 dark:text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {lvl > 0 ? `+${lvl}` : lvl}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleApplyTemperature()}
                disabled={
                  setTargetLevelMutation.isPending ||
                  (!isSliderDirty &&
                    sliderLevel === Math.round(status.targetHeatingLevel / 10))
                }
                className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40"
              >
                {setTargetLevelMutation.isPending
                  ? "Setting..."
                  : !isOn && isSliderDirty
                  ? "Turn On & Set"
                  : "Set Target"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
