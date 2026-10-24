import { formatLevel, toHHMM, type ScheduleValues } from "~/lib/presets";

export interface ScheduleEvent {
  key: "preheat" | "bed" | "mid" | "final" | "alarm" | "off";
  label: string;
  time: string; // HH:MM
  minutes: number; // minutes since midnight
  level: number | null; // API units, null = off
}

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fromMinutes = (total: number) => {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export function getScheduleEvents(values: ScheduleValues): ScheduleEvent[] {
  const bed = toMinutes(toHHMM(values.bedTime));
  const wake = toMinutes(toHHMM(values.wakeupTime));
  const mid = toMinutes(toHHMM(values.midStageSleepLevelStartTime));
  const final = toMinutes(toHHMM(values.finalSleepLevelStartTime));

  const events: ScheduleEvent[] = [
    { key: "preheat", label: "Pre-heat", time: fromMinutes(bed - 60), minutes: (bed - 60 + 1440) % 1440, level: values.initialSleepLevel },
    { key: "bed", label: "Bedtime", time: fromMinutes(bed), minutes: bed, level: values.initialSleepLevel },
    { key: "mid", label: "Deep sleep", time: fromMinutes(mid), minutes: mid, level: values.midStageSleepLevel },
    { key: "final", label: "Late sleep", time: fromMinutes(final), minutes: final, level: values.finalSleepLevel },
  ];
  if (values.wakeupAlarmEnabled) {
    const alarm = (wake - values.wakeupAlarmLeadMinutes + 1440) % 1440;
    events.push({ key: "alarm", label: "Wake-up warmth", time: fromMinutes(alarm), minutes: alarm, level: values.wakeupAlarmLevel });
  }
  events.push({ key: "off", label: "Wake & off", time: fromMinutes(wake), minutes: wake, level: null });
  return events;
}

/** The next event after `now` (local time), wrapping around midnight. */
export function getNextEvent(values: ScheduleValues, now = new Date()) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best: { event: ScheduleEvent; inMinutes: number } | null = null;
  for (const event of getScheduleEvents(values)) {
    const inMinutes = (event.minutes - nowMin + 1440) % 1440 || 1440;
    if (!best || inMinutes < best.inMinutes) best = { event, inMinutes };
  }
  return best;
}

export function describeLevel(level: number | null) {
  return level === null ? "Off" : formatLevel(level);
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function sleepDurationMinutes(values: ScheduleValues) {
  const bed = toMinutes(toHHMM(values.bedTime));
  const wake = toMinutes(toHHMM(values.wakeupTime));
  return (wake - bed + 1440) % 1440 || 1440;
}
