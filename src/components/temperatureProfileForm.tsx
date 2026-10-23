"use client";
import React, { useState, useEffect } from "react";
import { useForm, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiR } from "~/trpc/react";
import TimezoneSelect, { allTimezones } from "react-timezone-select";
import { Button } from "./ui/button";

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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
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

  const [sleepInfo, setSleepInfo] = useState({
    duration: "",
    midStageTime: "",
    finalStageTime: "",
  });

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
          duration: `${hours} hours ${minutes} minutes`,
          midStageTime: midStageDate.toTimeString().slice(0, 5),
          finalStageTime: finalStageCandidate.toTimeString().slice(0, 5),
        });
      }
    }
  }, [bedTime, wakeupTime, midStageSleepLevelStartTime, finalSleepLevelStartTime]);

  const updateProfileMutation =
    apiR.user.updateUserTemperatureProfile.useMutation({
      onSuccess: () => {
        console.log("Temperature profile updated successfully");
        setIsExistingProfile(true);
      },
      onError: (error) => {
        console.error("Failed to update temperature profile:", error.message);
      },
    });

  const deleteProfileMutation =
    apiR.user.deleteUserTemperatureProfile.useMutation({
      onSuccess: () => {
        console.log("Temperature profile deleted successfully");
        setIsExistingProfile(false);
        reset();
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

    console.log("Data being sent to server:", mutationData);

    updateProfileMutation.mutate(mutationData);
  };

  const onDelete = () => {
    if (window.confirm("Are you sure you want to delete your temperature profile?")) {
      deleteProfileMutation.mutate();
    }
  };

  const SliderInput: React.FC<{
    name: "initialSleepLevel" | "midStageSleepLevel" | "finalSleepLevel" | "wakeupAlarmLevel";
    label: string;
    control: Control<TemperatureProfileForm>;
    info?: string;
  }> = ({ name, label, control, info }) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <div className="flex items-center">
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
            />
            <span className="ml-2 w-8 text-right text-sm font-semibold text-gray-700">
              {value > 0 ? `+${value}` : value}
            </span>
          </div>
        )}
      />
      {info && <p className="mt-1 text-xs text-blue-600">{info}</p>}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name]?.message}</p>
      )}
    </div>
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h2 className="mb-4 text-center text-2xl font-bold text-gray-800">
        {isExistingProfile ? "Update" : "Create"} Temperature Profile
      </h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-gray-800"
      >
        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700"
          >
            Timezone
          </label>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            )}
          />
          {errors.timezone && (
            <p className="mt-1 text-sm text-red-600">
              {errors.timezone.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="bedTime"
            className="block text-sm font-medium text-gray-700"
          >
            Bed Time
          </label>
          <input
            {...register("bedTime")}
            type="time"
            id="bedTime"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          {errors.bedTime && (
            <p className="mt-1 text-sm text-red-600">
              {errors.bedTime.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="wakeupTime"
            className="block text-sm font-medium text-gray-700"
          >
            Wake-up Time
          </label>
          <input
            {...register("wakeupTime")}
            type="time"
            id="wakeupTime"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          {errors.wakeupTime && (
            <p className="mt-1 text-sm text-red-600">
              {errors.wakeupTime.message}
            </p>
          )}
        </div>

        <div className="rounded-md bg-blue-50 p-4">
          {sleepDurationError ? (
            <p className="text-sm text-red-600">{sleepDurationError}</p>
          ) : (
            <p className="text-sm text-blue-800">
              Sleep Duration: {sleepInfo.duration}
              <br />
              Bed will prepare for sleep one hour before the bed time.
              <br />
              Set each stage level and when it should start below.
            </p>
          )}
        </div>

        <SliderInput
          name="initialSleepLevel"
          label="Initial Sleep Level"
          control={control}
          info={`Starts at bed time (${bedTime})`}
        />

        <div className="rounded-md border border-gray-200 p-3">
          <SliderInput
            name="midStageSleepLevel"
            label="Mid-Stage Sleep Level"
            control={control}
          />
          <div>
            <label
              htmlFor="midStageSleepLevelStartTime"
              className="block text-sm font-medium text-gray-700"
            >
              Mid-Stage Start Time
            </label>
            <input
              {...register("midStageSleepLevelStartTime")}
              type="time"
              id="midStageSleepLevelStartTime"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
            {errors.midStageSleepLevelStartTime && (
              <p className="mt-1 text-sm text-red-600">
                {errors.midStageSleepLevelStartTime.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-3">
          <SliderInput
            name="finalSleepLevel"
            label="Final Sleep Level"
            control={control}
          />
          <div>
            <label
              htmlFor="finalSleepLevelStartTime"
              className="block text-sm font-medium text-gray-700"
            >
              Final Stage Start Time
            </label>
            <input
              {...register("finalSleepLevelStartTime")}
              type="time"
              id="finalSleepLevelStartTime"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
            {errors.finalSleepLevelStartTime && (
              <p className="mt-1 text-sm text-red-600">
                {errors.finalSleepLevelStartTime.message}
              </p>
            )}
          </div>
        </div>

        {/* Wake-Up Thermal Alarm Section */}
        <div className="rounded-md border border-indigo-100 bg-indigo-50/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Wake-Up Thermal Alarm
              </h3>
              <p className="text-xs text-gray-500">
                Warm or cool the bed before wake-up to gently wake you up
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                {...register("wakeupAlarmEnabled")}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>

          {wakeupAlarmEnabled && (
            <div className="mt-4 space-y-4 border-t border-gray-200 pt-3">
              <SliderInput
                name="wakeupAlarmLevel"
                label="Wake-Up Temperature Level"
                control={control}
                info="Temperature applied during the wake-up window (e.g. +2 to +4 to gently warm you awake)"
              />
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="wakeupAlarmLeadMinutes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Alarm Window Duration
                  </label>
                  <span className="text-xs font-semibold text-indigo-700">
                    Starts {wakeupAlarmLeadMinutes ?? 30} min before wake-up
                  </span>
                </div>
                <Controller
                  name="wakeupAlarmLeadMinutes"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <div className="mt-1 flex items-center">
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
                      />
                      <span className="ml-3 w-12 text-right text-xs font-semibold text-gray-700">
                        {value}m
                      </span>
                    </div>
                  )}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Eight Sleep officially uses a 30-minute window for gradual physical warming.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            type="submit"
            className="flex-grow rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={updateProfileMutation.isPending || !!sleepDurationError}
          >
            {updateProfileMutation.isPending ? "Updating..." : (isExistingProfile ? "Update" : "Create") + " Profile"}
          </Button>
          {isExistingProfile && (
            <Button
              type="button"
              onClick={onDelete}
              className="ml-4 rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
              disabled={deleteProfileMutation.isPending}
            >
              {deleteProfileMutation.isPending ? "Deleting..." : "Delete Schedule"}
            </Button>
          )}
        </div>
        {updateProfileMutation.isError && (
          <p className="mt-4 text-center text-sm text-red-600">
            Error updating profile. Please try again.
            {updateProfileMutation.error.message}
          </p>
        )}
        {deleteProfileMutation.isError && (
          <p className="mt-4 text-center text-sm text-red-600">
            Error deleting profile. Please try again.
            {deleteProfileMutation.error.message}
          </p>
        )}
      </form>
    </div>
  );
};
