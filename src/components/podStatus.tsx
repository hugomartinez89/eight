"use client";

import React, { useState, useEffect } from "react";
import { apiR } from "~/trpc/react";
import { Button } from "./ui/button";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

function getLevelBadgeColor(scaledLevel: number): string {
  if (scaledLevel > 0) return "bg-amber-100 text-amber-800 border-amber-300";
  if (scaledLevel < 0) return "bg-blue-100 text-blue-800 border-blue-300";
  return "bg-gray-100 text-gray-800 border-gray-300";
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

  const handleApplyTemperature = () => {
    setTargetLevelMutation.mutate({
      level: Math.round(sliderLevel * 10),
      turnOn: !isOn ? true : undefined,
    });
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-lg bg-white p-6 text-gray-800 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Pod status</h2>
        <Button
          type="button"
          onClick={() => void podStatusQuery.refetch()}
          disabled={podStatusQuery.isFetching}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {podStatusQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {podStatusQuery.isLoading && !status && (
        <p className="text-sm text-gray-600">Loading pod status...</p>
      )}

      {podStatusQuery.isError && (
        <p className="text-sm text-red-600">
          Could not load pod status. {podStatusQuery.error.message}
        </p>
      )}

      {status && (
        <div className="space-y-4">
          {/* Power status and control */}
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Power:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isOn
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {isOn ? "On" : "Off"}
              </span>
            </div>
            <Button
              type="button"
              onClick={handleTogglePower}
              disabled={setPowerMutation.isPending}
              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
                isOn
                  ? "bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                  : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
              }`}
            >
              {setPowerMutation.isPending
                ? isOn
                  ? "Turning off..."
                  : "Turning on..."
                : isOn
                ? "Turn Off"
                : "Turn On"}
            </Button>
          </div>

          {/* Current temperature readout */}
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              Current temperature
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {status.temperatureC !== null && status.temperatureF !== null
                ? `${status.temperatureC.toFixed(1)}°C / ${status.temperatureF.toFixed(0)}°F`
                : "Unavailable"}
            </span>
          </div>

          {/* Live Level Info */}
          <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3">
            <p className="text-xs text-gray-500">
              Current level: <span className="font-semibold text-gray-700">{formatLevel(status.heatingLevel)}</span>
              {status.targetHeatingLevel !== status.heatingLevel
                ? ` · target ${formatLevel(status.targetHeatingLevel)}`
                : ""}
              {status.isOn && !status.isHeating ? " · on, not actively heating" : ""}
            </p>
          </div>

          {/* Manual Temperature Adjustment Slider */}
          <div className="rounded-md border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  Target Temperature
                </span>
                <p className="text-xs text-gray-500">
                  Adjust level (-10 to +10)
                </p>
              </div>
              <span
                className={`rounded-md border px-2.5 py-1 text-sm font-bold ${getLevelBadgeColor(
                  sliderLevel,
                )}`}
              >
                {sliderLevel > 0 ? `+${sliderLevel}` : `${sliderLevel}`}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-blue-600">-10</span>
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
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
              />
              <span className="text-xs font-semibold text-amber-600">+10</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">
                {!isOn && isSliderDirty ? "Will turn bed On" : ""}
              </span>
              <Button
                type="button"
                onClick={handleApplyTemperature}
                disabled={
                  setTargetLevelMutation.isPending ||
                  (!isSliderDirty &&
                    sliderLevel === Math.round(status.targetHeatingLevel / 10))
                }
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {setTargetLevelMutation.isPending
                  ? "Setting..."
                  : !isOn && isSliderDirty
                  ? "Turn On & Set"
                  : "Set Temperature"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
