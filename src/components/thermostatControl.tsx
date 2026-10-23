"use client";

import React, { useState, useEffect } from "react";
import { apiR } from "~/trpc/react";
import {
  Power,
  RotateCw,
  Flame,
  Snowflake,
  Plus,
  Minus,
  Sparkles,
  Zap,
} from "lucide-react";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

export const ThermostatControl: React.FC = () => {
  const [sliderLevel, setSliderLevel] = useState<number>(0);
  const [isSliderDirty, setIsSliderDirty] = useState<boolean>(false);
  const [tempUnit, setTempUnit] = useState<"f" | "c">("f");

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
      console.error("Failed to toggle power:", err.message);
    },
  });

  const setTargetLevelMutation = apiR.user.setPodTargetLevel.useMutation({
    onSuccess: async () => {
      setIsSliderDirty(false);
      await utils.user.getPodStatus.invalidate();
    },
    onError: (err) => {
      console.error("Failed to set temperature level:", err.message);
    },
  });

  const handleTogglePower = () => {
    setPowerMutation.mutate({ isOn: !isOn });
  };

  const handleApply = (target = sliderLevel) => {
    setTargetLevelMutation.mutate({
      level: Math.round(target * 10),
      turnOn: !isOn ? true : undefined,
    });
  };

  const handleStep = (delta: number) => {
    const next = Math.max(-10, Math.min(10, sliderLevel + delta));
    setSliderLevel(next);
    setIsSliderDirty(true);
  };

  const handlePreset = (level: number) => {
    setSliderLevel(level);
    setIsSliderDirty(true);
    handleApply(level);
  };

  const isCooling = isOn && status?.isHeating && (status?.heatingLevel ?? 0) < 0;
  const isHeating = isOn && status?.isHeating && (status?.heatingLevel ?? 0) > 0;
  const isIdle = isOn && !status?.isHeating;

  // Visual dial colors
  const getDialGlow = () => {
    if (!isOn) return "from-slate-700/20 to-slate-900/40 border-slate-700/40";
    if (sliderLevel < 0) return "from-cyan-500/20 to-blue-600/30 border-cyan-400/50 shadow-cyan-500/10";
    if (sliderLevel > 0) return "from-amber-500/20 to-rose-600/30 border-amber-400/50 shadow-amber-500/10";
    return "from-indigo-500/20 to-purple-600/30 border-indigo-400/50 shadow-indigo-500/10";
  };

  const getSliderTrackGradient = () => {
    return "bg-gradient-to-r from-sky-500 via-slate-300 to-amber-500 dark:via-slate-700";
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-slate-800/90 dark:bg-slate-900/80">
      {/* Background Aura */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl transition-opacity duration-700 ${
          !isOn
            ? "bg-slate-500/5"
            : sliderLevel < 0
            ? "bg-cyan-500/15"
            : sliderLevel > 0
            ? "bg-amber-500/15"
            : "bg-indigo-500/15"
        }`}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`flex h-2.5 w-2.5 rounded-full ${
              isOn
                ? "animate-pulse bg-emerald-500 ring-4 ring-emerald-500/20"
                : "bg-slate-400"
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isOn ? (isCooling ? "Cooling Bed" : isHeating ? "Heating Bed" : "Maintaining") : "Pod Standby"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setTempUnit((u) => (u === "f" ? "c" : "f"))}
            className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            °{tempUnit.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => void podStatusQuery.refetch()}
            disabled={podStatusQuery.isFetching}
            title="Refresh status"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RotateCw
              className={`h-3.5 w-3.5 ${
                podStatusQuery.isFetching ? "animate-spin text-indigo-500" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Center Thermostat Dial Experience */}
      <div className="my-6 flex flex-col items-center justify-center">
        {/* The Radial Dial Orb */}
        <div
          className={`relative flex h-56 w-56 items-center justify-center rounded-full border-2 bg-gradient-to-b p-4 shadow-xl transition-all duration-500 ${getDialGlow()}`}
        >
          {/* Subtle Outer Ring Details */}
          <div className="absolute inset-2 rounded-full border border-dashed border-slate-300/40 dark:border-slate-700/40" />

          {/* Center Info */}
          <div className="z-10 flex flex-col items-center text-center">
            {/* Live Surface Temperature */}
            <div className="flex items-baseline font-extrabold tracking-tight text-slate-900 dark:text-white">
              <span className="text-5xl">
                {status && tempUnit === "f" && status.temperatureF !== null
                  ? `${status.temperatureF.toFixed(0)}`
                  : status && tempUnit === "c" && status.temperatureC !== null
                  ? `${status.temperatureC.toFixed(1)}`
                  : "—"}
              </span>
              <span className="ml-1 text-2xl font-semibold text-slate-400">
                °{tempUnit.toUpperCase()}
              </span>
            </div>

            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Mattress Surface
            </p>

            {/* Target Level Badge */}
            <div className="mt-3 inline-flex items-center space-x-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/80">
              {sliderLevel < 0 ? (
                <Snowflake className="h-3.5 w-3.5 text-sky-500" />
              ) : sliderLevel > 0 ? (
                <Flame className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Target: {sliderLevel > 0 ? `+${sliderLevel}` : sliderLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Buttons for Touch & Click */}
        <div className="mt-5 flex items-center space-x-6">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            disabled={sliderLevel <= -10}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:scale-105 hover:bg-slate-50 active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Minus className="h-5 w-5" />
          </button>

          {/* Master Power Toggle Button */}
          <button
            type="button"
            onClick={handleTogglePower}
            disabled={setPowerMutation.isPending}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 ${
              isOn
                ? "bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-700"
                : "bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700"
            }`}
          >
            <Power className="h-6 w-6 transition-transform group-hover:rotate-12" />
          </button>

          <button
            type="button"
            onClick={() => handleStep(1)}
            disabled={sliderLevel >= 10}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:scale-105 hover:bg-slate-50 active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Target Level Slider */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-sky-600 dark:text-sky-400">Maximum Cool (-10)</span>
          <span className="text-slate-500 dark:text-slate-400">Slider Control</span>
          <span className="text-amber-600 dark:text-amber-400">Maximum Warm (+10)</span>
        </div>

        <div className="relative flex items-center">
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
            className={`h-2.5 w-full cursor-pointer appearance-none rounded-lg accent-indigo-600 ${getSliderTrackGradient()}`}
          />
        </div>

        {/* Apply Button (shown when modified) */}
        {isSliderDirty && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              Unsaved target change
            </span>
            <button
              type="button"
              onClick={() => handleApply()}
              disabled={setTargetLevelMutation.isPending}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>
                {setTargetLevelMutation.isPending
                  ? "Setting..."
                  : !isOn
                  ? "Turn On & Set"
                  : "Apply Target"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 1-Tap Quick Preset Chips */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Quick Temperature Presets
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Deep Chill", level: -4, icon: Snowflake, color: "text-sky-500" },
            { label: "Cool Sleep", level: -2, icon: Snowflake, color: "text-cyan-500" },
            { label: "Neutral", level: 0, icon: Sparkles, color: "text-slate-400" },
            { label: "Warm Cozy", level: 3, icon: Flame, color: "text-amber-500" },
          ].map((preset) => {
            const Icon = preset.icon;
            const isSelected = sliderLevel === preset.level;
            return (
              <button
                key={preset.level}
                type="button"
                onClick={() => handlePreset(preset.level)}
                className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 font-bold text-indigo-900 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${preset.color}`} />
                <span className="mt-1 text-[11px] font-semibold leading-tight">
                  {preset.label}
                </span>
                <span className="text-[10px] opacity-70">
                  {preset.level > 0 ? `+${preset.level}` : preset.level}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
