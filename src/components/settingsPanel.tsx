"use client";

import React, { useState } from "react";
import { apiR } from "~/trpc/react";
import { Card, CardHeader, Skeleton } from "~/components/ui/card";
import { useToast } from "~/components/ui/toast";
import { ThemeToggle } from "~/components/themeToggle";
import { LogoutButton } from "~/components/logout";
import { haptic } from "~/lib/clientStorage";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Palette,
  Palmtree,
  Play,
  Timer,
  User,
  Users,
  Info,
} from "lucide-react";

function useCopy() {
  const toast = useToast();
  return async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      haptic();
      toast(`${what} copied`);
    } catch {
      toast("Couldn't copy. Long-press the text to copy it instead", "error");
    }
  };
}

function CopyRow({
  label,
  value,
  display,
  secret,
}: {
  label: string;
  value: string;
  display?: string;
  secret?: boolean;
}) {
  const copy = useCopy();
  const [revealed, setRevealed] = useState(false);
  const shown = secret && !revealed ? "•".repeat(Math.min(24, Math.max(8, value.length))) : display ?? value;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-xs text-slate-800 dark:text-slate-100">
          {shown || <span className="text-rose-500">Not set</span>}
        </code>
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide" : "Reveal"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          disabled={!value}
          onClick={() => copy(value, label)}
          aria-label={`Copy ${label}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white active:scale-95 disabled:opacity-40"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "Never";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(d: Date | string | null | undefined) {
  if (!d) return null;
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function VacationCard() {
  const toast = useToast();
  const utils = apiR.useUtils();
  const accountQuery = apiR.user.getAccount.useQuery();
  const account = accountQuery.data;
  const [untilDate, setUntilDate] = useState<string>("");

  const mutation = apiR.user.setVacationMode.useMutation({
    onSuccess: async (_data, vars) => {
      haptic(20);
      await Promise.all([utils.user.getAccount.invalidate(), utils.user.getPodStatus.invalidate()]);
      toast(vars.enabled ? "Vacation mode on. Pod turned off" : "Schedule resumed");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const enabled = account?.vacationMode ?? false;

  const toggle = () => {
    if (enabled) {
      mutation.mutate({ enabled: false });
    } else {
      // Resume at the start of the chosen day (local time)
      const until = untilDate ? new Date(`${untilDate}T00:00:00`) : null;
      mutation.mutate({ enabled: true, until });
    }
  };

  return (
    <Card
      className={
        enabled
          ? "border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 dark:border-teal-800 dark:from-teal-950/40 dark:to-cyan-950/30"
          : undefined
      }
    >
      <CardHeader
        icon={<Palmtree className="h-5 w-5" />}
        title="Vacation mode"
        subtitle="Pause all automation while you're away. Your schedule and presets stay saved."
        action={
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Vacation mode"
            disabled={!account || mutation.isPending}
            onClick={toggle}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              enabled ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                enabled ? "left-7" : "left-1"
              }`}
            />
          </button>
        }
      />
      {enabled ? (
        <p className="rounded-2xl bg-white/70 p-3 text-xs font-semibold text-teal-900 dark:bg-slate-900/50 dark:text-teal-100">
          {account?.vacationUntil
            ? `Paused. Automation resumes on ${new Date(account.vacationUntil).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`
            : "Paused until you turn it off."}{" "}
          You can still control the pod manually from Home.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="vacation-until" className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Resume automatically on
          </label>
          <input
            id="vacation-until"
            type="date"
            min={toDateInput(new Date(Date.now() + 86400000))}
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <span className="text-[11px] text-slate-400">(optional)</span>
        </div>
      )}
    </Card>
  );
}

function CronCard() {
  const toast = useToast();
  const utils = apiR.useUtils();
  const configQuery = apiR.user.getAppConfig.useQuery();
  const accountQuery = apiR.user.getAccount.useQuery();
  const config = configQuery.data;
  const lastRun = accountQuery.data?.lastCronRunAt;

  const runNow = apiR.user.runCronNow.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.user.getAccount.invalidate(), utils.user.getPodStatus.invalidate()]);
      toast("Cron ran successfully");
    },
    onError: (e) => toast(e.message, "error"),
  });

  const lastRunAgeMin = lastRun ? (Date.now() - new Date(lastRun).getTime()) / 60000 : Infinity;
  const healthy = lastRunAgeMin < 60;

  return (
    <Card>
      <CardHeader
        icon={<Timer className="h-5 w-5" />}
        title="Cron job"
        subtitle="Use these values on cron-job.org (or any scheduler)"
      />
      {!config ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-semibold ${
              healthy
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${healthy ? "bg-emerald-500" : "bg-amber-500"}`} />
              Last run: {lastRun ? `${timeAgo(lastRun)} (${formatDateTime(lastRun)})` : "never recorded"}
            </span>
          </div>
          <CopyRow label="URL" value={config.cronUrl} />
          <CopyRow label="Cron secret" value={config.cronSecret} secret />
          <CopyRow
            label={`Header: ${config.cronHeaderName}`}
            value={config.cronHeaderValue}
            display={`Bearer ${"•".repeat(12)}`}
          />
          <p className="px-1 text-[11px] text-slate-500 dark:text-slate-400">
            Method <strong>GET</strong>, schedule <strong>{config.cronIntervalHint.toLowerCase()}</strong>. Add the header
            under Advanced → Headers, then run a test: it should return 200 OK.
          </p>
          <button
            type="button"
            onClick={() => runNow.mutate()}
            disabled={runNow.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 text-xs font-bold text-indigo-700 transition active:scale-[0.98] disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            {runNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run schedule check now
          </button>
        </div>
      )}
    </Card>
  );
}

function AccessCard() {
  const configQuery = apiR.user.getAppConfig.useQuery();
  const accountQuery = apiR.user.getAccount.useQuery();
  const me = accountQuery.data?.email.toLowerCase();
  return (
    <Card>
      <CardHeader
        icon={<Users className="h-5 w-5" />}
        title="Approved emails"
        subtitle="Only these Eight Sleep accounts can sign in"
      />
      {!configQuery.data ? (
        <Skeleton className="h-16" />
      ) : (
        <ul className="space-y-1.5">
          {configQuery.data.approvedEmails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/50"
            >
              <span className="truncate font-medium">{email}</span>
              {email === me && (
                <span className="ml-2 shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  You
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        To change this list, edit <code className="font-mono">APPROVED_EMAILS</code> in Vercel → Settings → Environment
        Variables (comma-separated), then redeploy.
      </p>
    </Card>
  );
}

function AccountCard({ onLogoutSuccess }: { onLogoutSuccess: () => void }) {
  const accountQuery = apiR.user.getAccount.useQuery();
  const a = accountQuery.data;
  return (
    <Card>
      <CardHeader icon={<User className="h-5 w-5" />} title="Account" />
      {!a ? (
        <Skeleton className="h-24" />
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="truncate font-semibold">{a.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Eight Sleep user</dt>
            <dd className="truncate font-mono text-xs">{a.eightUserId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Eight token renews</dt>
            <dd className="font-semibold">{formatDateTime(a.eightTokenExpiresAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
            <dd className="font-semibold">{new Date(a.memberSince).toLocaleDateString()}</dd>
          </div>
        </dl>
      )}
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
        <span>This device stays signed in. Sign out only if it&apos;s not yours.</span>
        <LogoutButton onLogoutSuccess={onLogoutSuccess} className="ml-3 h-10 shrink-0" />
      </div>
    </Card>
  );
}

export const SettingsPanel: React.FC<{ onLogoutSuccess: () => void }> = ({ onLogoutSuccess }) => (
  <div className="space-y-4">
    <VacationCard />
    <CronCard />
    <AccessCard />
    <Card>
      <CardHeader
        icon={<Palette className="h-5 w-5" />}
        title="Appearance"
        subtitle="Light, dark, or follow your phone"
        action={<ThemeToggle />}
      />
    </Card>
    <AccountCard onLogoutSuccess={onLogoutSuccess} />
    <Card>
      <CardHeader
        icon={<Info className="h-5 w-5" />}
        title="About"
        subtitle="Pod Hub: Eight Sleep scheduling without a subscription"
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tip: in Chrome on Android, open the menu → <strong>Install app</strong> to get a full-screen app that stays
        signed in. Based on{" "}
        <a
          className="font-semibold text-indigo-600 underline dark:text-indigo-400"
          href="https://github.com/aerotow/eightsleep-nosub-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          eightsleep-nosub-app
        </a>
        .
      </p>
    </Card>
  </div>
);
