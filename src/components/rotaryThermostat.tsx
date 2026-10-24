"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

export const RotaryThermostat: React.FC = () => {
  const [sliderLevel, setSliderLevel] = useState<number>(0);
  const [isSliderDirty, setIsSliderDirty] = useState<boolean>(false);
  const [tempUnit, setTempUnit] = useState<"f" | "c">("f");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dialRef = useRef<SVGSVGElement | null>(null);
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

  // Convert level (-10 to +10) to dial angle (-135deg to +135deg, total 270deg sweep)
  // angle 0 is at top (12 o'clock)
  const levelToAngle = (lvl: number) => (lvl / 10) * 135;

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees from top (clockwise)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;

    // Clamp to -135 to +135
    if (deg < -135 && deg >= -180) deg = -135;
    if (deg > 135 && deg <= 180) deg = 135;

    // Map angle back to -10 .. 10
    const rawLevel = Math.round((deg / 135) * 10);
    const clampedLevel = Math.max(-10, Math.min(10, rawLevel));
    setSliderLevel(clampedLevel);
    setIsSliderDirty(true);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateFromPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Dial geometry
  const radius = 95;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // 270 degree arc = (270 / 360) * circumference
  const arcLength = (270 / 360) * circumference;
  // Progress fraction from -10 (0) to +10 (1)
  const progress = (sliderLevel + 10) / 20;
  const strokeDashoffset = arcLength * (1 - progress);

  // Tick marks (total 21 ticks for levels -10 to +10)
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const lvl = i - 10;
    const angle = levelToAngle(lvl);
    const rad = ((angle - 90) * Math.PI) / 180;
    const innerR = lvl % 5 === 0 ? radius - 20 : radius - 15;
    const outerR = radius - 7;
    const cx = 120;
    const cy = 120;
    return {
      lvl,
      x1: cx + innerR * Math.cos(rad),
      y1: cy + innerR * Math.sin(rad),
      x2: cx + outerR * Math.cos(rad),
      y2: cy + outerR * Math.sin(rad),
      isMajor: lvl % 5 === 0,
      isActive: sliderLevel >= 0 ? lvl >= 0 && lvl <= sliderLevel : lvl <= 0 && lvl >= sliderLevel,
    };
  });

  const isCooling = isOn && status?.isHeating && (status?.heatingLevel ?? 0) < 0;
  const isHeating = isOn && status?.isHeating && (status?.heatingLevel ?? 0) > 0;

  const currentAngle = levelToAngle(sliderLevel);
  const needleRad = ((currentAngle - 90) * Math.PI) / 180;
  const knobX = 120 + (radius - 2) * Math.cos(needleRad);
  const knobY = 120 + (radius - 2) * Math.sin(needleRad);

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/70">
      {/* Dynamic Background Glow */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl transition-opacity duration-700 ${
          !isOn
            ? "bg-slate-500/5"
            : sliderLevel < 0
            ? "bg-cyan-500/20"
            : sliderLevel > 0
            ? "bg-amber-500/20"
            : "bg-indigo-500/20"
        }`}
      />

      {/* Top Header Card Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span
            className={`flex h-3 w-3 rounded-full ${
              isOn
                ? "animate-pulse bg-emerald-500 ring-4 ring-emerald-500/25"
                : "bg-slate-400"
            }`}
          />
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              Rotary Pod Thermostat
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              {isOn ? (isCooling ? "Active Cooling" : isHeating ? "Active Heating" : "Maintaining Temp") : "Standby (Bed Off)"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {status?.side && (
            <span className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {status.side} Side
            </span>
          )}

          <button
            type="button"
            onClick={() => setTempUnit((u) => (u === "f" ? "c" : "f"))}
            className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            °{tempUnit.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => void podStatusQuery.refetch()}
            disabled={podStatusQuery.isFetching}
            title="Refresh status"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RotateCw
              className={`h-4 w-4 ${
                podStatusQuery.isFetching ? "animate-spin text-indigo-500" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* SVG Interactive Rotary Dial */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        <svg
          ref={dialRef}
          viewBox="0 0 240 240"
          className="h-64 w-64 touch-none select-none drop-shadow-md"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <defs>
            {/* Color Gradient for the temperature arc */}
            <linearGradient id="thermoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            <filter id="dialShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Background Track (270 degrees) */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-200/80 dark:text-slate-800/80"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(135 120 120)"
          />

          {/* Active Level Arc */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="url(#thermoGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 120 120)"
            className="transition-all duration-75"
          />

          {/* Dial Tick Marks */}
          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="currentColor"
              className={`transition-colors ${
                t.isActive
                  ? t.lvl < 0
                    ? "text-cyan-500"
                    : t.lvl > 0
                    ? "text-amber-500"
                    : "text-indigo-500"
                  : t.isMajor
                  ? "text-slate-400 dark:text-slate-600"
                  : "text-slate-300 dark:text-slate-700"
              }`}
              strokeWidth={t.isMajor ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          ))}

          {/* Rotary Knob Handle */}
          <circle
            cx={knobX}
            cy={knobY}
            r="11"
            fill="white"
            stroke={sliderLevel < 0 ? "#06b6d4" : sliderLevel > 0 ? "#f59e0b" : "#6366f1"}
            strokeWidth="3.5"
            className="cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
            filter="url(#dialShadow)"
          />
        </svg>

        {/* Center Display Readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline font-black tracking-tight text-slate-900 dark:text-white">
            <span className="text-5xl">
              {status && tempUnit === "f" && status.temperatureF !== null
                ? `${status.temperatureF.toFixed(0)}`
                : status && tempUnit === "c" && status.temperatureC !== null
                ? `${status.temperatureC.toFixed(1)}`
                : "—"}
            </span>
            <span className="ml-1 text-2xl font-bold text-slate-400">
              °{tempUnit.toUpperCase()}
            </span>
          </div>

          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Current Surface
          </p>

          {/* Target Chip */}
          <div className="mt-2 inline-flex items-center space-x-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-xs font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {sliderLevel < 0 ? (
              <Snowflake className="h-3.5 w-3.5 text-cyan-500" />
            ) : sliderLevel > 0 ? (
              <Flame className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            )}
            <span className="text-slate-800 dark:text-slate-200">
              Target {sliderLevel > 0 ? `+${sliderLevel}` : sliderLevel}
            </span>
          </div>
        </div>

        {/* Tactile Stepper & Master Power Toggle */}
        <div className="mt-2 flex items-center space-x-5">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            disabled={sliderLevel <= -10}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:scale-105 hover:bg-slate-50 active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Minus className="h-5 w-5" />
          </button>

          {/* Master Power Toggle Orb */}
          <button
            type="button"
            onClick={handleTogglePower}
            disabled={setPowerMutation.isPending}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 ${
              isOn
                ? "bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-600/30"
                : "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/30"
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

      {/* Unsaved Apply Pill */}
      {isSliderDirty && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            <Zap className="h-4 w-4 text-indigo-500" />
            <span>Target adjusted to Level {sliderLevel > 0 ? `+${sliderLevel}` : sliderLevel}</span>
          </div>
          <button
            type="button"
            onClick={() => handleApply()}
            disabled={setTargetLevelMutation.isPending}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {setTargetLevelMutation.isPending ? "Sending..." : !isOn ? "Turn On & Set" : "Apply Now"}
          </button>
        </div>
      )}

      {/* 4 Quick Presets */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          1-Tap Sleep Presets
        </span>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Deep Chill", level: -4, icon: Snowflake, color: "text-cyan-500" },
            { label: "Cool Sleep", level: -2, icon: Snowflake, color: "text-sky-500" },
            { label: "Neutral", level: 0, icon: Sparkles, color: "text-indigo-500" },
            { label: "Warm Cozy", level: 3, icon: Flame, color: "text-amber-500" },
          ].map((preset) => {
            const Icon = preset.icon;
            const isSelected = sliderLevel === preset.level;
            return (
              <button
                key={preset.level}
                type="button"
                onClick={() => handlePreset(preset.level)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-2 text-center transition-all hover:scale-102 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 font-bold text-indigo-900 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200"
                    : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${preset.color}`} />
                <span className="mt-1 text-[11px] font-bold leading-tight">
                  {preset.label}
                </span>
                <span className="text-[10px] opacity-75">
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
