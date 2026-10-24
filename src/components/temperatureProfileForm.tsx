"use client";
import React, { useState, useEffect } from "react";
import { useForm, Controller, type Control, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiR } from "~/trpc/react";
import TimezoneSelect, { allTimezones } from "react-timezone-select";
import { useToast } from "~/components/ui/toast";
import { Skeleton } from "~/components/ui/card";
import { useSchedule } from "~/components/useSchedule";
import { PresetSheet } from "~/components/presetsPanel";
import { matchPreset, type ScheduleValues } from "~/lib/presets";
import {
  CalendarDays,
  Clock,
  Moon,
  Sun,
  Trash2,
  Save,
  BellRing,
  Plus,
  Minus,
  Globe,
  Bookmark,
  BookmarkPlus,
  Undo2,
} from "lucide-react";

const temperatureProfileSchema = z.object({
  bedTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format"),
  wakeupTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format"),
  midStageSleepLevelStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format"),
  finalSleepLevelStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format"),
  initialSleepLevel: z.number().min(-10).max(10),
  midStageSleepLevel: z.number().min(-10).max(10),
  finalSleepLevel: z.number().min(-10).max(10),
  wakeupAlarmEnabled: z.boolean(),
  wakeupAlarmLevel: z.number().min(-10).max(10),
  wakeupAlarmLeadMinutes: z.number().min(5).max(60),
  timezone: z.object({
    value: z.string(),
    altName: z.string().optional(),
    abbrev: z.string().optional(),
  }),
});

type TemperatureProfileForm = z.infer<typeof temperatureProfileSchema>;

type LevelField = "initialSleepLevel" | "midStageSleepLevel" | "finalSleepLevel" | "wakeupAlarmLevel";

/** Form values (UI scale -10..10) → API/preset values (-100..100) */
function formToSchedule(data: TemperatureProfileForm): ScheduleValues {
  return {
    bedTime: data.bedTime,
    wakeupTime: data.wakeupTime,
    midStageSleepLevelStartTime: data.midStageSleepLevelStartTime,
    finalSleepLevelStartTime: data.finalSleepLevelStartTime,
    initialSleepLevel: Math.round(data.initialSleepLevel * 10),
    midStageSleepLevel: Math.round(data.midStageSleepLevel * 10),
    finalSleepLevel: Math.round(data.finalSleepLevel * 10),
    wakeupAlarmEnabled: data.wakeupAlarmEnabled,
    wakeupAlarmLevel: Math.round(data.wakeupAlarmLevel * 10),
    wakeupAlarmLeadMinutes: data.wakeupAlarmLeadMinutes,
  };
}

// Slider with [+] and [-] precision buttons. Lives outside the form component so
// it isn't re-created (and the slider re-mounted) on every render.
const StepperSlider: React.FC<{
  name: LevelField;
  label: string;
  control: Control<TemperatureProfileForm>;
  info?: string;
  error?: FieldError;
}> = ({ name, label, control, info, error }) => (
  <Controller
    name={name}
    control={control}
    render={({ field: { onChange, value } }) => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={name} className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {label}
          </label>
          <span
            className={`rounded-xl px-2.5 py-0.5 text-xs font-black shadow-sm ${
              value > 0
                ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800"
                : value < 0
                ? "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-800"
                : "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            {value > 0 ? `+${value}` : value}
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            onClick={() => onChange(Math.max(-10, value - 1))}
            disabled={value <= -10}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            id={name}
            type="range"
            min="-10"
            max="10"
            step="1"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-cyan-500 via-slate-300 to-amber-500 accent-indigo-600 dark:via-slate-700"
          />

          <button
            type="button"
            aria-label={`Increase ${label}`}
            onClick={() => onChange(Math.min(10, value + 1))}
            disabled={value >= 10}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {info && <p className="text-[11px] text-slate-500 dark:text-slate-400">{info}</p>}
        {error && <p className="text-xs text-rose-500">{error.message}</p>}
      </div>
    )}
  />
);

export const TemperatureProfileForm: React.FC = () => {
  const toast = useToast();
  const [sleepDurationError, setSleepDurationError] = useState<string | null>(null);
  const [showTimezoneSelect, setShowTimezoneSelect] = useState<boolean>(false);
  const [presetSheetValues, setPresetSheetValues] = useState<ScheduleValues | null>(null);

  // Auto-detect browser timezone
  const detectedTimezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/New_York";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<TemperatureProfileForm>({
    resolver: zodResolver(temperatureProfileSchema),
    defaultValues: {
      bedTime: "22:00",
      wakeupTime: "06:30",
      midStageSleepLevelStartTime: "23:00",
      finalSleepLevelStartTime: "05:00",
      initialSleepLevel: -2,
      midStageSleepLevel: -3,
      finalSleepLevel: -1,
      wakeupAlarmEnabled: true,
      wakeupAlarmLevel: 3,
      wakeupAlarmLeadMinutes: 30,
      timezone: { value: detectedTimezone },
    },
  });

  const bedTime = watch("bedTime");
  const wakeupTime = watch("wakeupTime");
  const midStageSleepLevelStartTime = watch("midStageSleepLevelStartTime");
  const finalSleepLevelStartTime = watch("finalSleepLevelStartTime");
  const wakeupAlarmEnabled = watch("wakeupAlarmEnabled");
  const wakeupAlarmLeadMinutes = watch("wakeupAlarmLeadMinutes");
  const wakeupAlarmLevel = watch("wakeupAlarmLevel");
  const timezone = watch("timezone");
  const allValues = watch();

  const [sleepInfo, setSleepInfo] = useState({
    duration: "",
    midStageTime: "",
    finalStageTime: "",
  });

  const utils = apiR.useUtils();
  const { profile, profileQuery, allPresets, activePreset } = useSchedule();
  const isExistingProfile = !!profile;
  const isLoading = profileQuery.isLoading;

  // Load the saved schedule as the form's clean baseline (so "unsaved changes" is accurate).
  useEffect(() => {
    if (!profile) return;
    reset({
      bedTime: profile.bedTime.slice(0, 5),
      wakeupTime: profile.wakeupTime.slice(0, 5),
      midStageSleepLevelStartTime: profile.midStageSleepLevelStartTime?.slice(0, 5) ?? "23:00",
      finalSleepLevelStartTime: profile.finalSleepLevelStartTime?.slice(0, 5) ?? "05:00",
      initialSleepLevel: profile.initialSleepLevel / 10,
      midStageSleepLevel: profile.midStageSleepLevel / 10,
      finalSleepLevel: profile.finalSleepLevel / 10,
      wakeupAlarmEnabled: profile.wakeupAlarmEnabled ?? false,
      wakeupAlarmLevel: (profile.wakeupAlarmLevel ?? 30) / 10,
      wakeupAlarmLeadMinutes: profile.wakeupAlarmLeadMinutes ?? 30,
      timezone: { value: profile.timezoneTZ || detectedTimezone },
    });
  }, [profile, reset, detectedTimezone]);

  useEffect(() => {
    if (bedTime && wakeupTime) {
      const bedDate = new Date(`2000-01-01T${bedTime}:00`);
      let wakeDate = new Date(`2000-01-01T${wakeupTime}:00`);

      if (wakeDate <= bedDate) {
        wakeDate = new Date(wakeDate.getTime() + 24 * 60 * 60 * 1000);
      }

      const durationMs = wakeDate.getTime() - bedDate.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 4) {
        setSleepDurationError("Sleep duration must be at least 4 hours.");
        setSleepInfo({ duration: "", midStageTime: "", finalStageTime: "" });
      } else {
        setSleepDurationError(null);
        let midStageDate = new Date(`2000-01-01T${midStageSleepLevelStartTime ?? "23:00"}:00`);
        let finalStageCandidate = new Date(`2000-01-01T${finalSleepLevelStartTime ?? "05:00"}:00`);

        if (midStageDate <= bedDate) {
          midStageDate = new Date(midStageDate.getTime() + 24 * 60 * 60 * 1000);
        }
        if (midStageDate >= wakeDate) {
          midStageDate = new Date(bedDate.getTime() + 60 * 60 * 1000);
        }

        if (finalStageCandidate <= bedDate) {
          finalStageCandidate = new Date(finalStageCandidate.getTime() + 24 * 60 * 60 * 1000);
        }
        if (finalStageCandidate >= wakeDate || finalStageCandidate <= midStageDate) {
          finalStageCandidate = new Date(wakeDate.getTime() - 60 * 60 * 1000);
        }

        setSleepInfo({
          duration: `${hours}h ${minutes}m`,
          midStageTime: midStageDate.toTimeString().slice(0, 5),
          finalStageTime: finalStageCandidate.toTimeString().slice(0, 5),
        });
      }
    }
  }, [bedTime, wakeupTime, midStageSleepLevelStartTime, finalSleepLevelStartTime]);

  const updateProfileMutation =
    apiR.user.updateUserTemperatureProfile.useMutation({
      onSuccess: async () => {
        await utils.user.getUserTemperatureProfile.invalidate();
        toast("Schedule saved");
      },
      onError: (error) => toast(error.message, "error"),
    });

  const deleteProfileMutation =
    apiR.user.deleteUserTemperatureProfile.useMutation({
      onSuccess: async () => {
        reset();
        await utils.user.getUserTemperatureProfile.invalidate();
        toast("Schedule cleared", "info");
      },
      onError: (error) => toast(error.message, "error"),
    });

  const onSubmit = (data: TemperatureProfileForm) => {
    if (sleepDurationError) return;

    const formatTimeForAPI = (time: string) => `${time}:00.000000`;
    const values = formToSchedule(data);

    updateProfileMutation.mutate({
      ...values,
      bedTime: formatTimeForAPI(values.bedTime),
      wakeupTime: formatTimeForAPI(values.wakeupTime),
      midStageSleepLevelStartTime: formatTimeForAPI(values.midStageSleepLevelStartTime),
      finalSleepLevelStartTime: formatTimeForAPI(values.finalSleepLevelStartTime),
      timezoneTZ: data.timezone.value,
    });
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  // Which preset the form currently matches (updates live while editing)
  const formPreset = allValues.bedTime ? matchPreset(formToSchedule(allValues), allPresets) : null;
  const shownPreset = isDirty ? formPreset : activePreset;

  // Pre-heating calculation
  const [bH = 22, bM = 0] = bedTime.split(":").map(Number);
  const preHeatH = (bH - 1 + 24) % 24;
  const preHeatTimeStr = `${String(preHeatH).padStart(2, "0")}:${String(bM).padStart(2, "0")}`;

  // Sunrise calculation
  const [wH = 6, wM = 0] = wakeupTime.split(":").map(Number);
  const wakeTotalMin = wH * 60 + wM;
  const alarmStartMin = (wakeTotalMin - (wakeupAlarmLeadMinutes ?? 30) + 24 * 60) % (24 * 60);
  const alarmStartStr = `${String(Math.floor(alarmStartMin / 60)).padStart(2, "0")}:${String(
    alarmStartMin % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900/70">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              Schedule &amp; Stages
            </h2>
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Bookmark className="h-3 w-3 text-indigo-500" />
              {shownPreset ? shownPreset.name : isExistingProfile || isDirty ? "Custom schedule" : "Not saved yet"}
            </p>
          </div>
        </div>

        {isDirty && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Unsaved
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bed & Wake Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
              <Moon className="h-4 w-4 text-indigo-500" />
              <label htmlFor="bedTime" className="text-xs font-bold">
                Bed Time
              </label>
            </div>
            <input
              {...register("bedTime")}
              type="time"
              id="bedTime"
              className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {errors.bedTime && (
              <p className="mt-1 text-xs text-rose-500">{errors.bedTime.message}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
              <Sun className="h-4 w-4 text-amber-500" />
              <label htmlFor="wakeupTime" className="text-xs font-bold">
                Wake-up Time
              </label>
            </div>
            <input
              {...register("wakeupTime")}
              type="time"
              id="wakeupTime"
              className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {errors.wakeupTime && (
              <p className="mt-1 text-xs text-rose-500">{errors.wakeupTime.message}</p>
            )}
          </div>
        </div>

        {/* Total Sleep Window & Preheat Banner */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-xs ${
            sleepDurationError
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
              : "border-indigo-100 bg-indigo-50/80 text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/30 dark:text-indigo-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="font-bold">
              {sleepDurationError ? sleepDurationError : `Sleep Duration: ${sleepInfo.duration}`}
            </span>
          </div>
          <span className="text-[11px] font-semibold opacity-80">
            Pre-heats at {preHeatTimeStr} (1h before)
          </span>
        </div>

        {/* Simplified Auto-Detected Timezone */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center space-x-2 text-slate-600 dark:text-slate-400">
              <Globe className="h-4 w-4 shrink-0 text-indigo-500" />
              <span className="truncate">
                Timezone: <strong className="text-slate-900 dark:text-white">{timezone?.value || detectedTimezone}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTimezoneSelect(!showTimezoneSelect)}
              className="shrink-0 px-1 py-1 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {showTimezoneSelect ? "Done" : "Change"}
            </button>
          </div>

          {showTimezoneSelect && (
            <div className="mt-3 border-t border-slate-200/60 pt-3 dark:border-slate-700">
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <TimezoneSelect
                    value={field.value}
                    onChange={field.onChange}
                    timezones={{
                      ...allTimezones,
                      "America/New_York": "America/New York",
                      "America/Los_Angeles": "America/Los Angeles",
                    }}
                    className="timezone-selector text-sm"
                  />
                )}
              />
            </div>
          )}
        </div>

        {/* Stepper Sliders for Sleep Stages */}
        <div className="space-y-4 border-t border-slate-200/60 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Night Sleep Stages
          </h3>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <StepperSlider
              name="initialSleepLevel"
              label="Stage 1: Bedtime & Pre-Heat Level"
              control={control}
              error={errors.initialSleepLevel}
              info={`Activates at pre-heat (${preHeatTimeStr}) and continues into bedtime (${bedTime})`}
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <StepperSlider
              name="midStageSleepLevel"
              label="Stage 2: Mid-Stage Sleep Level"
              control={control}
              error={errors.midStageSleepLevel}
            />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3 dark:border-slate-700/60">
              <label htmlFor="midStageSleepLevelStartTime" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Mid-Stage Start Time:
              </label>
              <input
                {...register("midStageSleepLevelStartTime")}
                type="time"
                id="midStageSleepLevelStartTime"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <StepperSlider
              name="finalSleepLevel"
              label="Stage 3: Final Sleep Level"
              control={control}
              error={errors.finalSleepLevel}
            />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3 dark:border-slate-700/60">
              <label htmlFor="finalSleepLevelStartTime" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Final Stage Start Time:
              </label>
              <input
                {...register("finalSleepLevelStartTime")}
                type="time"
                id="finalSleepLevelStartTime"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Wake-Up Thermal Sunrise Alarm */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-indigo-50/40 to-purple-50/30 p-4 dark:border-amber-900/60 dark:from-amber-950/30 dark:via-indigo-950/30 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Wake-Up Thermal Alarm
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gently warms mattress to pull you out of deep sleep
                </p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center p-1">
              <input
                type="checkbox"
                aria-label="Enable wake-up alarm"
                {...register("wakeupAlarmEnabled")}
                className="peer sr-only"
              />
              <div className="peer h-7 w-12 rounded-full bg-slate-200 after:absolute after:left-[6px] after:top-[6px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-5 peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-700"></div>
            </label>
          </div>

          {wakeupAlarmEnabled && (
            <div className="mt-4 space-y-4 border-t border-amber-200/60 pt-3.5 dark:border-amber-900/60">
              <StepperSlider
                name="wakeupAlarmLevel"
                label="Wake-Up Target Temperature"
                control={control}
                error={errors.wakeupAlarmLevel}
                info="Target thermal level during alarm window (e.g. +3 to gently warm you awake)"
              />

              {/* Lead Time Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Alarm Window Lead Time
                  </span>
                  <span className="rounded-xl bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    {wakeupAlarmLeadMinutes ?? 30} minutes
                  </span>
                </div>

                <div className="flex gap-2">
                  {[10, 15, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setValue("wakeupAlarmLeadMinutes", mins, { shouldDirty: true })}
                      className={`h-10 flex-1 rounded-xl text-xs font-bold transition active:scale-95 ${
                        (wakeupAlarmLeadMinutes ?? 30) === mins
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className="mt-2 rounded-2xl bg-amber-50/90 p-3 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  ✨ <strong>Sunrise Progression:</strong> At <strong>{alarmStartStr}</strong> ({wakeupAlarmLeadMinutes ?? 30}m before wake-up), bed begins warming to <strong>Level {wakeupAlarmLevel > 0 ? `+${wakeupAlarmLevel}` : wakeupAlarmLevel}</strong>. At <strong>{wakeupTime}</strong>, bed automatically turns <strong>OFF</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending || !!sleepDurationError || (isExistingProfile && !isDirty)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>
              {updateProfileMutation.isPending
                ? "Saving…"
                : isExistingProfile
                ? isDirty
                  ? "Save changes"
                  : "Saved"
                : "Save schedule"}
            </span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!!sleepDurationError}
              onClick={() => setPresetSheetValues(formToSchedule(getValues()))}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50/70 text-xs font-bold text-indigo-700 transition active:scale-95 disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              <BookmarkPlus className="h-4 w-4" />
              Save as preset
            </button>

            {isDirty && isExistingProfile && (
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition active:scale-95 dark:border-slate-700 dark:text-slate-300"
              >
                <Undo2 className="h-4 w-4" />
                Discard
              </button>
            )}

            {isExistingProfile && !isDirty && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear your schedule? The pod will stop being automated.")) {
                    deleteProfileMutation.mutate();
                  }
                }}
                disabled={deleteProfileMutation.isPending}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-red-200 px-4 text-xs font-bold text-red-700 transition active:scale-95 disabled:opacity-50 dark:border-red-950 dark:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      <PresetSheet
        open={presetSheetValues !== null}
        values={presetSheetValues}
        onClose={() => setPresetSheetValues(null)}
      />
    </div>
  );
};
