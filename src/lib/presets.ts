// Shared by client and server. Levels are stored in API units (-100..100),
// i.e. the UI's -10..10 scale multiplied by 10. Times are "HH:MM".

export interface ScheduleValues {
  bedTime: string;
  wakeupTime: string;
  midStageSleepLevelStartTime: string;
  finalSleepLevelStartTime: string;
  initialSleepLevel: number;
  midStageSleepLevel: number;
  finalSleepLevel: number;
  wakeupAlarmEnabled: boolean;
  wakeupAlarmLevel: number;
  wakeupAlarmLeadMinutes: number;
}

export interface PresetDescriptor {
  /** "builtin:<key>" for built-ins, "custom:<id>" for saved presets */
  ref: string;
  name: string;
  description: string;
  builtin: boolean;
  values: ScheduleValues;
}

export const BUILTIN_PRESETS: PresetDescriptor[] = [
  {
    ref: "builtin:signature",
    name: "Signature",
    description: "Balanced: cool start, deep chill, gentle sunrise",
    builtin: true,
    values: {
      bedTime: "22:00",
      wakeupTime: "06:30",
      midStageSleepLevelStartTime: "23:00",
      finalSleepLevelStartTime: "05:00",
      initialSleepLevel: -20,
      midStageSleepLevel: -30,
      finalSleepLevel: -10,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 30,
      wakeupAlarmLeadMinutes: 30,
    },
  },
  {
    ref: "builtin:deep-freeze",
    name: "Deep Freeze",
    description: "Hot sleeper / summer: strong cooling all night",
    builtin: true,
    values: {
      bedTime: "22:30",
      wakeupTime: "07:00",
      midStageSleepLevelStartTime: "23:30",
      finalSleepLevelStartTime: "05:30",
      initialSleepLevel: -40,
      midStageSleepLevel: -50,
      finalSleepLevel: -30,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 20,
      wakeupAlarmLeadMinutes: 20,
    },
  },
  {
    ref: "builtin:cozy-winter",
    name: "Cozy Winter",
    description: "Warm start, neutral night, toasty wake-up",
    builtin: true,
    values: {
      bedTime: "22:00",
      wakeupTime: "06:30",
      midStageSleepLevelStartTime: "23:00",
      finalSleepLevelStartTime: "05:00",
      initialSleepLevel: 20,
      midStageSleepLevel: 0,
      finalSleepLevel: 0,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 40,
      wakeupAlarmLeadMinutes: 30,
    },
  },
  {
    ref: "builtin:weekend",
    name: "Weekend Sleep-in",
    description: "Late bedtime, relaxed late wake-up",
    builtin: true,
    values: {
      bedTime: "23:30",
      wakeupTime: "08:30",
      midStageSleepLevelStartTime: "00:30",
      finalSleepLevelStartTime: "07:00",
      initialSleepLevel: -20,
      midStageSleepLevel: -30,
      finalSleepLevel: -20,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 30,
      wakeupAlarmLeadMinutes: 30,
    },
  },
  {
    ref: "builtin:recovery",
    name: "Recovery",
    description: "After hard workouts: extra cool for deep sleep",
    builtin: true,
    values: {
      bedTime: "21:45",
      wakeupTime: "06:30",
      midStageSleepLevelStartTime: "22:45",
      finalSleepLevelStartTime: "05:00",
      initialSleepLevel: -40,
      midStageSleepLevel: -40,
      finalSleepLevel: -20,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 20,
      wakeupAlarmLeadMinutes: 20,
    },
  },
  {
    ref: "builtin:day-sleep",
    name: "Day Sleep",
    description: "Night shift: sleep 08:00 → 15:00",
    builtin: true,
    values: {
      bedTime: "08:00",
      wakeupTime: "15:00",
      midStageSleepLevelStartTime: "09:30",
      finalSleepLevelStartTime: "14:00",
      initialSleepLevel: -30,
      midStageSleepLevel: -30,
      finalSleepLevel: -10,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 30,
      wakeupAlarmLeadMinutes: 20,
    },
  },
];

/** "22:00:00" / "22:00:00.000000" / "22:00" → "22:00" */
export function toHHMM(time: string | null | undefined): string {
  return (time ?? "").slice(0, 5);
}

export function normalizeValues(v: ScheduleValues): ScheduleValues {
  return {
    ...v,
    bedTime: toHHMM(v.bedTime),
    wakeupTime: toHHMM(v.wakeupTime),
    midStageSleepLevelStartTime: toHHMM(v.midStageSleepLevelStartTime),
    finalSleepLevelStartTime: toHHMM(v.finalSleepLevelStartTime),
  };
}

export function sameSchedule(a: ScheduleValues, b: ScheduleValues): boolean {
  const x = normalizeValues(a);
  const y = normalizeValues(b);
  return (
    x.bedTime === y.bedTime &&
    x.wakeupTime === y.wakeupTime &&
    x.midStageSleepLevelStartTime === y.midStageSleepLevelStartTime &&
    x.finalSleepLevelStartTime === y.finalSleepLevelStartTime &&
    x.initialSleepLevel === y.initialSleepLevel &&
    x.midStageSleepLevel === y.midStageSleepLevel &&
    x.finalSleepLevel === y.finalSleepLevel &&
    x.wakeupAlarmEnabled === y.wakeupAlarmEnabled &&
    // alarm details only matter while the alarm is on
    (!x.wakeupAlarmEnabled ||
      (x.wakeupAlarmLevel === y.wakeupAlarmLevel &&
        x.wakeupAlarmLeadMinutes === y.wakeupAlarmLeadMinutes))
  );
}

/** Returns the first preset whose values equal the given schedule. Custom presets win over built-ins. */
export function matchPreset(
  schedule: ScheduleValues | null | undefined,
  presets: PresetDescriptor[],
): PresetDescriptor | null {
  if (!schedule) return null;
  const ordered = [...presets.filter((p) => !p.builtin), ...presets.filter((p) => p.builtin)];
  return ordered.find((p) => sameSchedule(p.values, schedule)) ?? null;
}

export function formatLevel(level: number): string {
  const scaled = level / 10;
  return scaled > 0 ? `+${scaled}` : `${scaled}`;
}
