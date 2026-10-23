"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiR } from "~/trpc/react";
import { LogIn, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type EightLoginDialog = z.infer<typeof loginSchema>;

interface EightLoginDialogProps {
  onLoginSuccess: () => void;
}

export const EightLoginDialog: React.FC<EightLoginDialogProps> = ({
  onLoginSuccess,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EightLoginDialog>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = apiR.user.login.useMutation({
    onSuccess: () => {
      onLoginSuccess();
    },
  });

  const onSubmit = (data: EightLoginDialog) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur-2xl transition-all dark:border-slate-800/80 dark:bg-slate-900/90">
      {/* Brand Icon Header */}
      <div className="mb-6 text-center">
        <img
          src="/icon.svg"
          alt="Hugo's Pod Hub"
          className="mx-auto h-16 w-16 rounded-2xl shadow-xl shadow-indigo-500/20 ring-1 ring-white/10"
        />
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Hugo&apos;s Pod Hub
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Sign in with your Eight Sleep account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("email")}
            type="email"
            id="email"
            autoComplete="email"
            placeholder="Account Email"
            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800/90"
          />
          {errors.email && (
            <p className="mt-1.5 pl-1 text-xs text-rose-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("password")}
            type="password"
            id="password"
            autoComplete="current-password"
            placeholder="Account Password"
            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800/90"
          />
          {errors.password && (
            <p className="mt-1.5 pl-1 text-xs text-rose-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {loginMutation.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-center text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {typeof loginMutation.error.message === "string"
              ? loginMutation.error.message
              : "Invalid credentials. Please verify your email and password."}
          </div>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="group relative mt-2 inline-flex w-full items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 focus:outline-none active:scale-98 disabled:opacity-50"
        >
          <span>{loginMutation.isPending ? "Signing in..." : "Sign In to Pod"}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
};
