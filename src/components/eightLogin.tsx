"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiR } from "~/trpc/react";
import { Moon, LogIn, Lock, Mail, ShieldCheck } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type EightLoginDialog = z.infer<typeof loginSchema>;

interface EightLoginDialogProps {
  onLoginSuccess: () => void;
}

export const EightLoginDialog: React.FC<EightLoginDialogProps> = ({
  onLoginSuccess,
}) => {
  const form = useForm<EightLoginDialog>({
    resolver: zodResolver(loginSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const loginMutation = apiR.user.login.useMutation({
    onSuccess: () => {
      console.log("Login successful");
      onLoginSuccess();
    },
    onError: (error: { message: unknown }) => {
      console.error("Login failed:", error.message);
    },
  });

  const onSubmit = (data: EightLoginDialog) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-2xl/50">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
          <Moon className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Sign In to Eight Sleep
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Connect your account to control your mattress without a subscription
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Eight Sleep Email
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </span>
            <input
              {...register("email")}
              type="email"
              id="email"
              placeholder="you@example.com"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-800"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </span>
            <input
              {...register("password")}
              type="password"
              id="password"
              placeholder="••••••••"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-800"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="mt-2 inline-flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          <span>{loginMutation.isPending ? "Connecting..." : "Connect Pod"}</span>
        </button>

        {loginMutation.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {typeof loginMutation.error.message === "string"
              ? loginMutation.error.message
              : "Login failed. Please check your credentials."}
          </div>
        )}

        <div className="flex items-center justify-center space-x-1.5 pt-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Credentials are stored securely in your private Postgres instance</span>
        </div>
      </form>
    </div>
  );
};
