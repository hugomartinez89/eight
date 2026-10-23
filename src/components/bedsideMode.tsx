"use client";

import React, { useState, useEffect } from "react";
import { apiR } from "~/trpc/react";
import {
  X,
  Power,
  Snowflake,
  Flame,
  Moon,
  RotateCw,
} from "lucide-react";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

interface BedsideModeProps {
  onClose: () => void;
}

export const BedsideMode: React.FC<BedsideModeProps> = ({ onClose }) => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const utils = apiR.useUtils();
  const podStatusQuery = apiR.user.getPodStatus.useQuery(undefined, {
    refetchInterval: 3_000,
  });

  const status = podStatusQuery.data;
  const isOn = status?.isOn ?? false;
  const currentTarget = status?.targetHeatingLevel ?? status?.heatingLevel ?? 0;
  const scaledTarget = Math.round(currentTarget / 10);

  const setPowerMutation = apiR.user.setPodPower.useMutation({
    onSuccess: async () => {
      await utils.user.getPodStatus.invalidate();
    },
  });

  const setTargetLevelMutation = apiR.user.setPodTargetLevel.useMutation({
    onSuccess: async () => {
      await utils.user.getPodStatus.invalidate();
    },
  });

  const handleAdjust = (delta: number) => {
    const next = Math.max(-10, Math.min(10, scaledTarget + delta));
    setTargetLevelMutation.mutate({
      level: Math.round(next * 10),
      turnOn: !isOn ? true : undefined,
    });
  };

  const handleTogglePower = () => {
    setPowerMutation.mutate({ isOn: !isOn });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-6 text-amber-500/90 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-amber-500/60">
          <Moon className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Hugo&apos;s Bedside Nightstand
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/30 text-amber-500/80 transition hover:bg-amber-500/20 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Clock and Temperature Centerpiece */}
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Soft Amber Dim Digital Clock */}
        <div className="text-7xl sm:text-8xl font-thin tracking-widest text-amber-400/90 drop-shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          {currentTime || "12:00"}
        </div>

        {/* Live Surface Temp & Target Readout */}
        <div className="flex items-center space-x-4 text-sm font-semibold text-amber-500/80">
          <span>
            Surface:{" "}
            {status?.temperatureF !== null && status?.temperatureF !== undefined
              ? `${status.temperatureF.toFixed(0)}°F`
              : "—"}
          </span>
          <span>·</span>
          <span>
            Target: Level {formatLevel(currentTarget)}
          </span>
          <span>·</span>
          <span className={isOn ? "text-emerald-500/90" : "text-amber-500/50"}>
            {isOn ? "Bed On" : "Bed Off"}
          </span>
        </div>
      </div>

      {/* Giant Bedside Touch Targets */}
      <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-4 pb-8">
        {/* Cooler (-1) */}
        <button
          type="button"
          onClick={() => handleAdjust(-1)}
          disabled={setTargetLevelMutation.isPending}
          className="flex h-24 flex-col items-center justify-center rounded-3xl border border-sky-500/40 bg-sky-950/20 text-sky-400 active:scale-95 transition hover:bg-sky-950/40 disabled:opacity-50"
        >
          <Snowflake className="h-6 w-6" />
          <span className="mt-1.5 text-xs font-bold">Cooler (-1)</span>
        </button>

        {/* Master Power Toggle */}
        <button
          type="button"
          onClick={handleTogglePower}
          disabled={setPowerMutation.isPending}
          className={`flex h-24 flex-col items-center justify-center rounded-3xl border active:scale-95 transition disabled:opacity-50 ${
            isOn
              ? "border-rose-500/50 bg-rose-950/30 text-rose-400 hover:bg-rose-950/50"
              : "border-emerald-500/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50"
          }`}
        >
          <Power className="h-7 w-7" />
          <span className="mt-1 text-xs font-bold">
            {setPowerMutation.isPending
              ? "..."
              : isOn
              ? "Turn Off"
              : "Turn On"}
          </span>
        </button>

        {/* Warmer (+1) */}
        <button
          type="button"
          onClick={() => handleAdjust(1)}
          disabled={setTargetLevelMutation.isPending}
          className="flex h-24 flex-col items-center justify-center rounded-3xl border border-amber-500/40 bg-amber-950/20 text-amber-400 active:scale-95 transition hover:bg-amber-950/40 disabled:opacity-50"
        >
          <Flame className="h-6 w-6" />
          <span className="mt-1.5 text-xs font-bold">Warmer (+1)</span>
        </button>
      </div>
    </div>
  );
};
