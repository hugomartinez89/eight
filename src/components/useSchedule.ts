"use client";

import { useMemo } from "react";
import { apiR } from "~/trpc/react";
import { matchPreset, type PresetDescriptor, type ScheduleValues } from "~/lib/presets";

/** Saved schedule + all presets + which preset (if any) the saved schedule matches. */
export function useSchedule() {
  const profileQuery = apiR.user.getUserTemperatureProfile.useQuery(undefined, { retry: 1 });
  const presetsQuery = apiR.user.listPresets.useQuery(undefined, { retry: 1 });

  const profile = profileQuery.data ?? null;

  const savedValues: ScheduleValues | null = useMemo(
    () =>
      profile
        ? {
            bedTime: profile.bedTime,
            wakeupTime: profile.wakeupTime,
            midStageSleepLevelStartTime: profile.midStageSleepLevelStartTime,
            finalSleepLevelStartTime: profile.finalSleepLevelStartTime,
            initialSleepLevel: profile.initialSleepLevel,
            midStageSleepLevel: profile.midStageSleepLevel,
            finalSleepLevel: profile.finalSleepLevel,
            wakeupAlarmEnabled: profile.wakeupAlarmEnabled,
            wakeupAlarmLevel: profile.wakeupAlarmLevel,
            wakeupAlarmLeadMinutes: profile.wakeupAlarmLeadMinutes,
          }
        : null,
    [profile],
  );

  const allPresets: PresetDescriptor[] = useMemo(
    () => [...(presetsQuery.data?.custom ?? []), ...(presetsQuery.data?.builtin ?? [])],
    [presetsQuery.data],
  );

  const activePreset = useMemo(() => matchPreset(savedValues, allPresets), [savedValues, allPresets]);

  return {
    profile,
    savedValues,
    allPresets,
    customPresets: presetsQuery.data?.custom ?? [],
    builtinPresets: presetsQuery.data?.builtin ?? [],
    activePreset,
    isLoading: profileQuery.isLoading || presetsQuery.isLoading,
    profileQuery,
    presetsQuery,
  };
}
