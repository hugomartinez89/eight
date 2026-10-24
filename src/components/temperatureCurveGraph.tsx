"use client";

import React, { useState } from "react";
import { apiR } from "~/trpc/react";
import {
  Moon,
  Sun,
  Flame,
  Snowflake,
  Sparkles,
  BellRing,
  Activity,
} from "lucide-react";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

export const TemperatureCurveGraph: React.FC = () => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

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

  const points = [
    {
      id: 0,
      name: "Pre-Heat",
      time: preHeatTimeStr,
      level: profile.initialSleepLevel / 10,
      icon: Snowflake,
      label: "Mattress preps",
      stageColor: "#06b6d4",
    },
    {
      id: 1,
      name: "Bedtime",
      time: bedTimeStr,
      level: profile.initialSleepLevel / 10,
      icon: Moon,
      label: "Initial Sleep",
      stageColor: "#6366f1",
    },
    {
      id: 2,
      name: "Mid-Stage",
      time: midTimeStr,
      level: profile.midStageSleepLevel / 10,
      icon: Sparkles,
      label: "Deep Sleep Stage",
      stageColor: "#8b5cf6",
    },
    {
      id: 3,
      name: "Final Stage",
      time: finalTimeStr,
      level: profile.finalSleepLevel / 10,
      icon: Moon,
      label: "Late Sleep Stage",
      stageColor: "#3b82f6",
    },
    ...(profile.wakeupAlarmEnabled
      ? [
          {
            id: 4,
            name: "Sunrise Alarm",
            time: alarmTimeStr,
            level: profile.wakeupAlarmLevel / 10,
            icon: BellRing,
            label: `Thermal Alarm (${leadMinutes}m lead)`,
            stageColor: "#f59e0b",
          },
        ]
      : []),
    {
      id: 5,
      name: "Wake-Up",
      time: wakeTimeStr,
      level: 0,
      icon: Sun,
      label: "Bed Powers Off",
      stageColor: "#10b981",
    },
  ];

  // Graph canvas coordinates
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const count = points.length;
  const stepX = (width - paddingX * 2) / (count - 1);

  // Map level (-10 to +10) to Y (height - paddingY to paddingY)
  const getY = (lvl: number) => {
    const minLvl = -6;
    const maxLvl = 6;
    const clamped = Math.max(minLvl, Math.min(maxLvl, lvl));
    const normalized = (clamped - minLvl) / (maxLvl - minLvl); // 0 (min) to 1 (max)
    return height - paddingY - normalized * (height - paddingY * 2);
  };

  const coords = points.map((p, i) => ({
    x: paddingX + i * stepX,
    y: getY(p.level),
    ...p,
  }));

  // Build smooth cubic bezier SVG path
  let pathD = `M ${coords[0]?.x ?? 0} ${coords[0]?.y ?? 0}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]!;
    const next = coords[i + 1]!;
    const cx1 = curr.x + (next.x - curr.x) / 2;
    const cy1 = curr.y;
    const cx2 = curr.x + (next.x - curr.x) / 2;
    const cy2 = next.y;
    pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${next.x} ${next.y}`;
  }

  // Area path for gradient fill
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x ?? 0} ${height} L ${coords[0]?.x ?? 0} ${height} Z`;

  const activePointData = selectedPoint !== null ? coords[selectedPoint] : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-slate-900/70">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Night Temperature Wave
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive circadian temperature curve
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <span className="flex items-center space-x-1.5 text-cyan-500">
            <Snowflake className="h-3.5 w-3.5" />
            <span>Cool Stages</span>
          </span>
          <span className="flex items-center space-x-1.5 text-amber-500">
            <Flame className="h-3.5 w-3.5" />
            <span>Sunrise Alarm</span>
          </span>
        </div>
      </div>

      {/* SVG Graph View */}
      <div className="relative mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full min-w-[500px] select-none"
        >
          <defs>
            {/* Area Fill Gradient */}
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="35%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.25" />
              <stop offset="90%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>

            {/* Stroke Line Gradient */}
            <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="35%" stopColor="#6366f1" />
              <stop offset="70%" stopColor="#8b5cf6" />
              <stop offset="90%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Neutral Level 0 Dashed Reference Line */}
          <line
            x1={paddingX}
            y1={getY(0)}
            x2={width - paddingX}
            y2={getY(0)}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text
            x={paddingX - 10}
            y={getY(0) + 3}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-bold"
          >
            0
          </text>

          {/* Area Fill Under Spline */}
          <path d={areaD} fill="url(#areaGrad)" />

          {/* Main Spline Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#strokeGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Stage Node Markers */}
          {coords.map((c, i) => {
            const isHovered = selectedPoint === i;
            return (
              <g
                key={c.id}
                className="cursor-pointer transition-transform"
                onClick={() => setSelectedPoint(i)}
                onMouseEnter={() => setSelectedPoint(i)}
              >
                {/* Outer halo */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 12 : 8}
                  fill={c.stageColor}
                  fillOpacity={isHovered ? 0.3 : 0.15}
                  className="transition-all duration-200"
                />

                {/* Inner dot */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 6 : 4.5}
                  fill="white"
                  stroke={c.stageColor}
                  strokeWidth="2.5"
                  className="transition-all duration-200"
                />

                {/* Time text label below */}
                <text
                  x={c.x}
                  y={height - 5}
                  textAnchor="middle"
                  className={`text-[11px] font-bold transition-colors ${
                    isHovered
                      ? "fill-slate-900 dark:fill-white"
                      : "fill-slate-500 dark:fill-slate-400"
                  }`}
                >
                  {c.time}
                </text>

                {/* Temperature label above node */}
                <text
                  x={c.x}
                  y={c.y - 12}
                  textAnchor="middle"
                  className="fill-slate-700 text-[10px] font-extrabold dark:fill-slate-300"
                >
                  {c.name === "Wake-Up" ? "OFF" : c.level > 0 ? `+${c.level}` : c.level}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Tooltip Card */}
      {activePointData && (
        <div className="mt-2 flex items-center justify-between rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-3.5 transition-all dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex items-center space-x-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: activePointData.stageColor }}
            >
              <activePointData.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {activePointData.name} ({activePointData.time})
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 text-xs font-extrabold text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                  {activePointData.name === "Wake-Up"
                    ? "Turn Off"
                    : `Level ${formatLevel(activePointData.level * 10)}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activePointData.label}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
