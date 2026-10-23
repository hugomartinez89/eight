"use client";

import React, { useState } from "react";
import { Header } from "~/components/header";
import { Footer } from "~/components/footer";
import { EightLoginDialog } from "~/components/eightLogin";
import { ThermostatControl } from "~/components/thermostatControl";
import { ScheduleVisualizer } from "~/components/scheduleVisualizer";
import { TemperatureProfileForm } from "~/components/temperatureProfileForm";
import {
  Sparkles,
  Shield,
  Cpu,
  Sliders,
  Calendar,
  LayoutDashboard,
} from "lucide-react";

export default function ClientHome({
  initialLoginState,
}: {
  initialLoginState: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoginState);
  const [activeTab, setActiveTab] = useState<"dashboard" | "control" | "schedule">("dashboard");

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
                  Intelligent Eight Sleep Control
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Thermostat-style controls, multi-stage temperature schedules, and sunrise alarms without subscription fees.
                </p>
              </div>

              <EightLoginDialog onLoginSuccess={() => setIsLoggedIn(true)} />

              <div className="mt-8 grid max-w-md grid-cols-2 gap-4 text-center text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-center space-x-1.5 rounded-2xl border border-slate-200/80 bg-white/60 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                  <Cpu className="h-4 w-4 text-indigo-500" />
                  <span>Direct Cloud API</span>
                </div>
                <div className="flex items-center justify-center space-x-1.5 rounded-2xl border border-slate-200/80 bg-white/60 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Self-Hosted &amp; Private</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className={`inline-flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      activeTab === "dashboard"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("control")}
                    className={`inline-flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      activeTab === "control"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Live Thermostat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className={`inline-flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      activeTab === "schedule"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Night Schedule</span>
                  </button>
                </div>
              </div>

              {/* View 1: Unified Dashboard (Thermostat + Timeline + Schedule Form) */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Top: Visual Night Cycle Timeline */}
                  <ScheduleVisualizer />

                  {/* 2-Column Main View */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <ThermostatControl />
                    </div>
                    <div className="lg:col-span-7">
                      <TemperatureProfileForm />
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Focused Live Thermostat */}
              {activeTab === "control" && (
                <div className="mx-auto max-w-xl space-y-6">
                  <ThermostatControl />
                  <ScheduleVisualizer />
                </div>
              )}

              {/* View 3: Focused Schedule & Alarm */}
              {activeTab === "schedule" && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <ScheduleVisualizer />
                  <TemperatureProfileForm />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
