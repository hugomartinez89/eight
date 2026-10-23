"use client";

import React, { useState } from "react";
import { Header } from "~/components/header";
import { Footer } from "~/components/footer";
import { EightLoginDialog } from "~/components/eightLogin";
import { TemperatureProfileForm } from "~/components/temperatureProfileForm";
import { PodStatus } from "~/components/podStatus";
import { Sparkles, Shield, Cpu } from "lucide-react";

export default function ClientHome({
  initialLoginState,
}: {
  initialLoginState: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoginState);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Header
        isLoggedIn={isLoggedIn}
        onLogoutSuccess={() => setIsLoggedIn(false)}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {!isLoggedIn ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center">
              <div className="mb-6 text-center">
                <span className="inline-flex items-center space-x-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Hugo&apos;s Pod Hub</span>
                </span>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
                  Take Control of Your Eight Sleep
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Automated schedules, wake-up thermal alarm, and direct pod controls without subscription fees.
                </p>
              </div>

              <EightLoginDialog onLoginSuccess={() => setIsLoggedIn(true)} />

              <div className="mt-8 grid max-w-md grid-cols-2 gap-4 text-center text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200/80 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <Cpu className="h-4 w-4 text-indigo-500" />
                  <span>Direct API Control</span>
                </div>
                <div className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-200/80 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Self-Hosted &amp; Private</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Live Status & Controls */}
              <div className="space-y-6 lg:col-span-5">
                <PodStatus />
              </div>

              {/* Right Column: Schedule & Profile Management */}
              <div className="space-y-6 lg:col-span-7">
                <TemperatureProfileForm />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
