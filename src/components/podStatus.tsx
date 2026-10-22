"use client";

import { apiR } from "~/trpc/react";
import { Button } from "./ui/button";

function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}

export const PodStatus: React.FC = () => {
  const podStatusQuery = apiR.user.getPodStatus.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const status = podStatusQuery.data;
  const isOn = status?.isOn ?? false;

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
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">Power</span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                isOn
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {isOn ? "On" : "Off"}
            </span>
          </div>
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
          <p className="text-xs text-gray-500">
            Level {formatLevel(status.heatingLevel)}
            {status.targetHeatingLevel !== status.heatingLevel
              ? ` · target ${formatLevel(status.targetHeatingLevel)}`
              : ""}
            {status.isOn && !status.isHeating ? " · on, not actively heating" : ""}
          </p>
        </div>
      )}
    </div>
  );
};
