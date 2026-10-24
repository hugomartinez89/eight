"use client";

import React, { useEffect, useState } from "react";
import { apiR } from "~/trpc/react";
import { Card, CardHeader, Skeleton } from "~/components/ui/card";
import { useToast } from "~/components/ui/toast";
import { useSchedule } from "~/components/useSchedule";
import { type AppTab } from "~/components/bottomNav";
import { formatLevel, type PresetDescriptor, type ScheduleValues } from "~/lib/presets";
import { formatDuration, sleepDurationMinutes } from "~/lib/schedule";
import { haptic } from "~/lib/clientStorage";
import {
  Bookmark,
  BookmarkPlus,
  Check,
  Copy,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const detectTimezone = () =>
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

/** Tiny night curve: pre-heat → bed → mid → final → (alarm) → off */
function PresetSparkline({ values, active }: { values: ScheduleValues; active: boolean }) {
  const levels = [
    values.initialSleepLevel,
    values.initialSleepLevel,
    values.midStageSleepLevel,
    values.finalSleepLevel,
    values.wakeupAlarmEnabled ? values.wakeupAlarmLevel : values.finalSleepLevel,
  ];
  const w = 120;
  const h = 36;
  const y = (lvl: number) => h / 2 - (lvl / 100) * (h / 2 - 3);
  const step = w / (levels.length - 1);
  const d = levels
    .map((lvl, i) => {
      const x = i * step;
      if (i === 0) return `M ${x} ${y(lvl)}`;
      const px = (i - 1) * step;
      const py = y(levels[i - 1] ?? 0);
      return `C ${px + step / 2} ${py}, ${x - step / 2} ${y(lvl)}, ${x} ${y(lvl)}`;
    })
    .join(" ");
  const id = `spark-${Math.abs(levels.reduce((a, b) => a * 31 + b, 7))}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={active ? 3 : 2.25} strokeLinecap="round" />
    </svg>
  );
}

function LevelChip({ label, level }: { label: string; level: number }) {
  const tone =
    level > 0
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200"
      : level < 0
      ? "bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-200"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
      {label} {formatLevel(level)}
    </span>
  );
}

/** Bottom sheet to name a preset (create) or rename / refresh it (edit). */
export function PresetSheet({
  open,
  onClose,
  values,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  /** Schedule to store. For edits, only used when "replace values" is checked. */
  values: ScheduleValues | null;
  editing?: { id: number; name: string; description: string } | null;
}) {
  const toast = useToast();
  const utils = apiR.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [replaceValues, setReplaceValues] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setReplaceValues(false);
    }
  }, [open, editing]);

  const done = async (message: string) => {
    await utils.user.listPresets.invalidate();
    toast(message);
    onClose();
  };
  const create = apiR.user.createPreset.useMutation({
    onSuccess: () => done("Preset saved"),
    onError: (e) => toast(e.message, "error"),
  });
  const update = apiR.user.updatePreset.useMutation({
    onSuccess: () => done("Preset updated"),
    onError: (e) => toast(e.message, "error"),
  });

  if (!open) return null;
  const pending = create.isPending || update.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) {
      update.mutate({
        id: editing.id,
        name,
        description,
        values: replaceValues && values ? values : undefined,
      });
    } else if (values) {
      create.mutate({ name, description, values });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-8 dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:pb-5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black">{editing ? "Edit preset" : "Save as preset"}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {values && !editing && (
          <p className="mb-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            Saves {values.bedTime.slice(0, 5)} → {values.wakeupTime.slice(0, 5)}, stages{" "}
            {formatLevel(values.initialSleepLevel)} / {formatLevel(values.midStageSleepLevel)} /{" "}
            {formatLevel(values.finalSleepLevel)}
            {values.wakeupAlarmEnabled ? `, alarm ${formatLevel(values.wakeupAlarmLevel)}` : ", no alarm"}.
          </p>
        )}

        <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300" htmlFor="preset-name">
          Name
        </label>
        <input
          id="preset-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer weeknights"
          className="mb-3 block h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300" htmlFor="preset-desc">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="preset-desc"
          maxLength={160}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="When do you use it?"
          className="mb-4 block h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
        />

        {editing && values && (
          <label className="mb-4 flex items-start gap-3 rounded-2xl border border-slate-200 p-3 text-xs dark:border-slate-700">
            <input
              type="checkbox"
              checked={replaceValues}
              onChange={(e) => setReplaceValues(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600"
            />
            <span>
              <strong className="block text-slate-800 dark:text-slate-100">Replace with my current schedule</strong>
              <span className="text-slate-500 dark:text-slate-400">
                Overwrite this preset&apos;s times and levels with what&apos;s saved on the Schedule tab.
              </span>
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {editing ? "Save changes" : "Save preset"}
        </button>
      </form>
    </div>
  );
}

function PresetCard({
  preset,
  active,
  applying,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  preset: PresetDescriptor;
  active: boolean;
  applying: boolean;
  onApply: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  const v = preset.values;
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-4 transition ${
        active
          ? "border-indigo-500 bg-indigo-50/70 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30 dark:bg-indigo-950/40"
          : "border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">{preset.name}</h3>
            {active && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                <Check className="h-3 w-3" /> Active
              </span>
            )}
          </div>
          {preset.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{preset.description}</p>
          )}
        </div>
      </div>

      <div className="mt-2 text-slate-400">
        <PresetSparkline values={v} active={active} />
      </div>

      <div className="mt-1 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
        <span>
          {v.bedTime} → {v.wakeupTime}
        </span>
        <span className="text-slate-400">{formatDuration(sleepDurationMinutes(v))}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <LevelChip label="Start" level={v.initialSleepLevel} />
        <LevelChip label="Deep" level={v.midStageSleepLevel} />
        <LevelChip label="Late" level={v.finalSleepLevel} />
        {v.wakeupAlarmEnabled && <LevelChip label="Alarm" level={v.wakeupAlarmLevel} />}
      </div>

      <div className="mt-3 flex items-center gap-1.5 pt-1">
        <button
          type="button"
          disabled={active || applying}
          onClick={onApply}
          className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl text-xs font-extrabold transition active:scale-95 ${
            active
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200"
              : "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 disabled:opacity-60"
          }`}
        >
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {active ? "In use" : applying ? "Applying…" : "Use tonight"}
        </button>
        {onEdit && (
          <IconButton label="Edit" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
        )}
        <IconButton label="Duplicate" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </IconButton>
        {onDelete && (
          <IconButton label="Delete" onClick={onDelete} danger>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition active:scale-95 ${
        danger
          ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

export const PresetsPanel: React.FC<{ onNavigate: (tab: AppTab) => void }> = ({ onNavigate }) => {
  const toast = useToast();
  const utils = apiR.useUtils();
  const { savedValues, customPresets, builtinPresets, activePreset, isLoading } = useSchedule();
  const [sheet, setSheet] = useState<{
    open: boolean;
    values: ScheduleValues | null;
    editing: { id: number; name: string; description: string } | null;
  }>({ open: false, values: null, editing: null });
  const [applyingRef, setApplyingRef] = useState<string | null>(null);

  const apply = apiR.user.applyPreset.useMutation({
    onSuccess: async (data) => {
      haptic(20);
      await Promise.all([
        utils.user.getUserTemperatureProfile.invalidate(),
        utils.user.getPodStatus.invalidate(),
      ]);
      toast(`${data.name} is now your schedule`);
    },
    onError: (e) => toast(e.message, "error"),
    onSettled: () => setApplyingRef(null),
  });
  const create = apiR.user.createPreset.useMutation({
    onSuccess: async () => {
      await utils.user.listPresets.invalidate();
      toast("Preset duplicated");
    },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = apiR.user.deletePreset.useMutation({
    onSuccess: async () => {
      await utils.user.listPresets.invalidate();
      toast("Preset deleted", "info");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const handleApply = (preset: PresetDescriptor) => {
    setApplyingRef(preset.ref);
    apply.mutate({ ref: preset.ref, timezoneTZ: detectTimezone() });
  };
  const handleDuplicate = (preset: PresetDescriptor) =>
    create.mutate({
      name: `${preset.name} copy`.slice(0, 60),
      description: preset.description,
      values: preset.values,
    });

  const isUnsavedCustom = savedValues && !activePreset;

  const renderCard = (preset: PresetDescriptor) => {
    const customId = preset.builtin ? null : Number(preset.ref.split(":")[1]);
    return (
      <PresetCard
        key={preset.ref}
        preset={preset}
        active={activePreset?.ref === preset.ref}
        applying={applyingRef === preset.ref}
        onApply={() => handleApply(preset)}
        onDuplicate={() => handleDuplicate(preset)}
        onEdit={
          customId !== null
            ? () =>
                setSheet({
                  open: true,
                  values: savedValues,
                  editing: { id: customId, name: preset.name, description: preset.description },
                })
            : undefined
        }
        onDelete={
          customId !== null
            ? () => {
                if (window.confirm(`Delete "${preset.name}"?`)) remove.mutate({ id: customId });
              }
            : undefined
        }
      />
    );
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={<Bookmark className="h-5 w-5" />}
          title="Presets"
          subtitle={
            activePreset
              ? `Tonight: ${activePreset.name}`
              : savedValues
              ? "Tonight: your custom schedule"
              : "No schedule saved yet"
          }
        />
        <button
          type="button"
          disabled={!savedValues}
          onClick={() => setSheet({ open: true, values: savedValues, editing: null })}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300 text-sm font-extrabold text-indigo-700 transition hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-40 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
        >
          <BookmarkPlus className="h-4 w-4" />
          Save current schedule as preset
        </button>
        {isUnsavedCustom && (
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Your current schedule doesn&apos;t match any preset yet. Save it so you can switch back anytime.
          </p>
        )}
        {!savedValues && !isLoading && (
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Tap <strong>Use tonight</strong> on any preset below, or{" "}
            <button type="button" className="font-bold text-indigo-600 underline dark:text-indigo-400" onClick={() => onNavigate("schedule")}>
              build your own schedule
            </button>
            .
          </p>
        )}
      </Card>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400">My presets</h2>
            {customPresets.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">{customPresets.map(renderCard)}</div>
            ) : (
              <p className="rounded-3xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No saved presets yet. Duplicate a built-in one or save your current schedule.
              </p>
            )}
          </section>
          <section>
            <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400">Built-in</h2>
            <div className="grid gap-3 sm:grid-cols-2">{builtinPresets.map(renderCard)}</div>
          </section>
        </>
      )}

      <PresetSheet
        open={sheet.open}
        values={sheet.values}
        editing={sheet.editing}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />
    </div>
  );
};
