"use client";
import React, { useState, useEffect } from "react";
import { useForm, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiR } from "~/trpc/react";
import TimezoneSelect, { allTimezones } from "react-timezone-select";
import {
  CalendarDays,
  Clock,
  Moon,
  Sun,
  Flame,
  Snowflake,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  BellRing,
  Sparkles,
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

export const TemperatureProfileForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [sleepDurationError, setSleepDurationError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<TemperatureProfileForm>({
    resolver: zodResolver(temperatureProfileSchema),
    defaultValues: {
      bedTime: "22:00",
      wakeupTime: "06:00",
      midStageSleepLevelStartTime: "23:00",
      finalSleepLevelStartTime: "06:00",
      initialSleepLevel: 0,
      midStageSleepLevel: 0,
      finalSleepLevel: 0,
      wakeupAlarmEnabled: false,
      wakeupAlarmLevel: 2,
      wakeupAlarmLeadMinutes: 30,
      timezone: { value: "America/New_York" },
    },
  });

  const bedTime = watch("bedTime");
  const wakeupTime = watch("wakeupTime");
  const midStageSleepLevelStartTime = watch("midStageSleepLevelStartTime");
  const finalSleepLevelStartTime = watch("finalSleepLevelStartTime");
  const wakeupAlarmEnabled = watch("wakeupAlarmEnabled");
  const wakeupAlarmLeadMinutes = watch("wakeupAlarmLeadMinutes");
  const wakeupAlarmLevel = watch("wakeupAlarmLevel");

  const [sleepInfo, setSleepInfo] = useState({
    duration: "",
    midStageTime: "",
    finalStageTime: "",
  });

  const utils = apiR.useUtils();
  const getUserTemperatureProfileQuery = apiR.user.getUserTemperatureProfile.useQuery();

  useEffect(() => {
    if (getUserTemperatureProfileQuery.isSuccess) {
      const profile = getUserTemperatureProfileQuery.data;
      setValue("bedTime", profile.bedTime.slice(0, 5));
      setValue("wakeupTime", profile.wakeupTime.slice(0, 5));
      setValue(
        "midStageSleepLevelStartTime",
        profile.midStageSleepLevelStartTime
          ? profile.midStageSleepLevelStartTime.slice(0, 5)
          : "23:00",
      );
      setValue(
        "finalSleepLevelStartTime",
        profile.finalSleepLevelStartTime ? profile.finalSleepLevelStartTime.slice(0, 5) : "06:00",
      );
      setValue("initialSleepLevel", profile.initialSleepLevel / 10);
      setValue("midStageSleepLevel", profile.midStageSleepLevel / 10);
      setValue("finalSleepLevel", profile.finalSleepLevel / 10);
      setValue("wakeupAlarmEnabled", profile.wakeupAlarmEnabled ?? false);
      setValue("wakeupAlarmLevel", (profile.wakeupAlarmLevel ?? 20) / 10);
      setValue("wakeupAlarmLeadMinutes", profile.wakeupAlarmLeadMinutes ?? 30);
      setValue("timezone", { value: profile.timezoneTZ });
      setIsExistingProfile(true);
      setIsLoading(false);
    } else if (getUserTemperatureProfileQuery.isError) {
      console.error("Failed to fetch temperature profile. Using default values.", getUserTemperatureProfileQuery.error);
      setIsExistingProfile(false);
      setIsLoading(false);
    }
  }, [
    getUserTemperatureProfileQuery.isSuccess,
    getUserTemperatureProfileQuery.isError,
    getUserTemperatureProfileQuery.data,
    setValue,
    getUserTemperatureProfileQuery.error,
  ]);

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
        let finalStageCandidate = new Date(`2000-01-01T${finalSleepLevelStartTime ?? "06:00"}:00`);

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
        setIsExistingProfile(true);
        setSaveSuccessMessage(true);
        await utils.user.getUserTemperatureProfile.invalidate();
        setTimeout(() => setSaveSuccessMessage(false), 3000);
      },
      onError: (error) => {
        console.error("Failed to update temperature profile:", error.message);
      },
    });

  const deleteProfileMutation =
    apiR.user.deleteUserTemperatureProfile.useMutation({
      onSuccess: async () => {
        setIsExistingProfile(false);
        reset();
        await utils.user.getUserTemperatureProfile.invalidate();
      },
      onError: (error) => {
        console.error("Failed to delete temperature profile:", error.message);
      },
    });

  const onSubmit = (data: TemperatureProfileForm) => {
    if (sleepDurationError) {
      return;
    }

    const formatTimeForAPI = (time: string) => `${time}:00.000000`;

    const mutationData = {
      bedTime: formatTimeForAPI(data.bedTime),
      wakeupTime: formatTimeForAPI(data.wakeupTime),
      midStageSleepLevelStartTime: formatTimeForAPI(data.midStageSleepLevelStartTime),
      finalSleepLevelStartTime: formatTimeForAPI(data.finalSleepLevelStartTime),
      initialSleepLevel: Math.round(data.initialSleepLevel * 10),
      midStageSleepLevel: Math.round(data.midStageSleepLevel * 10),
      finalSleepLevel: Math.round(data.finalSleepLevel * 10),
      wakeupAlarmEnabled: data.wakeupAlarmEnabled,
      wakeupAlarmLevel: Math.round(data.wakeupAlarmLevel * 10),
      wakeupAlarmLeadMinutes: data.wakeupAlarmLeadMinutes,
      timezoneTZ: data.timezone.value,
    };

    updateProfileMutation.mutate(mutationData);
  };

  const onDelete = () => {
    if (window.confirm("Are you sure you want to delete your schedule profile?")) {
      deleteProfileMutation.mutate();
    }
  };

  const SliderInput: React.FC<{
    name: "initialSleepLevel" | "midStageSleepLevel" | "finalSleepLevel" | "wakeupAlarmLevel";
    label: string;
    control: Control<TemperatureProfileForm>;
    info?: string;
  }> = ({ name, label, control, info }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <Controller
          name={name}
          control={control}
          render={({ field: { value } }) => (
            <span
              className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                value > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                  : value < 0
                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {value > 0 ? `+${value}` : value}
            </span>
          )}
        />
      </div>

      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">-10</span>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 dark:bg-slate-700"
            />
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">+10</span>
          </div>
        )}
      />
      {info && <p className="text-[11px] text-slate-500 dark:text-slate-400">{info}</p>}
      {errors[name] && (
        <p className="text-xs text-rose-500">{errors[name]?.message}</p>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <p className="text-sm text-slate-400">Loading temperature profile...</p>
      </div>
    );
  }

  // Calculate simulated sunrise time
  const [wH = 6, wM = 0] = wakeupTime.split(":").map(Number);
  const wakeTotalMin = wH * 60 + wM;
  const alarmStartMin = (wakeTotalMin - (wakeupAlarmLeadMinutes ?? 30) + 24 * 60) % (24 * 60);
  const alarmStartStr = `${String(Math.floor(alarmStartMin / 60)).padStart(2, "0")}:${String(
    alarmStartMin % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Schedule &amp; Stages
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized night temperature choreography
            </p>
          </div>
        </div>

        {saveSuccessMessage && (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Profile Saved</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Times & Duration */}
        <div className="space-y-4">
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
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {errors.wakeupTime && (
                <p className="mt-1 text-xs text-rose-500">{errors.wakeupTime.message}</p>
              )}
            </div>
          </div>

          {/* Sleep Window Pill */}
          <div
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${
              sleepDurationError
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
                : "border-indigo-100 bg-indigo-50/70 text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/30 dark:text-indigo-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>
                {sleepDurationError ? sleepDurationError : `Sleep Window: ${sleepInfo.duration}`}
              </span>
            </div>
            <span className="text-[11px] font-semibold opacity-75">
              Pre-heats 1h before bed
            </span>
          </div>

          {/* Timezone */}
          <div>
            <label
              htmlFor="timezone"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Mattress Timezone
            </label>
            <div className="mt-1">
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
          </div>
        </div>

        {/* Section 2: Night Stages */}
        <div className="space-y-3.5 border-t border-slate-200/60 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Night Temperature Stages
          </h3>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
            <SliderInput
              name="initialSleepLevel"
              label="Stage 1: Initial Bedtime Level"
              control={control}
              info={`Starts immediately at bed time (${bedTime})`}
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
            <SliderInput
              name="midStageSleepLevel"
              label="Stage 2: Mid-Stage Level"
              control={control}
            />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Mid-Stage Start Time:
              </span>
              <input
                {...register("midStageSleepLevelStartTime")}
                type="time"
                id="midStageSleepLevelStartTime"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
            <SliderInput
              name="finalSleepLevel"
              label="Stage 3: Final Sleep Level"
              control={control}
            />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Final Stage Start Time:
              </span>
              <input
                {...register("finalSleepLevelStartTime")}
                type="time"
                id="finalSleepLevelStartTime"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Wake-Up Thermal Sunrise Alarm */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-indigo-50/40 to-purple-50/30 p-4 dark:border-amber-900/60 dark:from-amber-950/30 dark:via-indigo-950/30 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Wake-Up Thermal Alarm
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gradually warms mattress to naturally pull you out of deep sleep
                </p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                {...register("wakeupAlarmEnabled")}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-700"></div>
            </label>
          </div>

          {wakeupAlarmEnabled && (
            <div className="mt-4 space-y-4 border-t border-amber-200/60 pt-3.5 dark:border-amber-900/60">
              <SliderInput
                name="wakeupAlarmLevel"
                label="Wake-Up Target Temperature"
                control={control}
                info="Target thermal level during alarm window (e.g. +2 to +4 to gently warm you awake)"
              />

              {/* Lead Time Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alarm Window Lead Time
                  </span>
                  <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    {wakeupAlarmLeadMinutes ?? 30} minutes
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex space-x-2">
                  {[10, 15, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setValue("wakeupAlarmLeadMinutes", mins, { shouldDirty: true })}
                      className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${
                        (wakeupAlarmLeadMinutes ?? 30) === mins
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className="mt-2 rounded-xl bg-amber-50/80 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  ✨ <strong>Sunrise Schedule:</strong> At <strong>{alarmStartStr}</strong> ({wakeupAlarmLeadMinutes ?? 30}m before wake-up), bed begins warming to <strong>Level {wakeupAlarmLevel > 0 ? `+${wakeupAlarmLevel}` : wakeupAlarmLevel}</strong>. At <strong>{wakeupTime}</strong>, bed automatically turns <strong>OFF</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {isExistingProfile ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteProfileMutation.isPending}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{deleteProfileMutation.isPending ? "Deleting..." : "Reset"}</span>
            </button>
          ) : <div />}

          <button
            type="submit"
            disabled={updateProfileMutation.isPending || !!sleepDurationError}
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>
              {updateProfileMutation.isPending
                ? "Saving..."
                : isExistingProfile
                ? "Update Schedule"
                : "Save Schedule"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
