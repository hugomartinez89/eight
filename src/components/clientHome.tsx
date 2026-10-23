"use client";

import React, { useState } from "react";
import { Header } from "~/components/header";
import { Footer } from "~/components/footer";
import { EightLoginDialog } from "~/components/eightLogin";
import { RotaryThermostat } from "~/components/rotaryThermostat";
import { TemperatureCurveGraph } from "~/components/temperatureCurveGraph";
import { TemperatureProfileForm } from "~/components/temperatureProfileForm";
import { BedsideMode } from "~/components/bedsideMode";
import {
  Sparkles,
  Shield,
  Cpu,
  Sliders,
  Calendar,
  LayoutDashboard,
  Moon,
} from "lucide-react";

export default function ClientHome({
  initialLoginState,
}: {
  initialLoginState: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoginState);
  const [activeTab, setActiveTab] = useState<"dashboard" | "control" | "schedule">("dashboard");
  const [showBedsideMode, setShowBedsideMode] = useState<boolean>(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Fullscreen Bedside Mode Overlay */}
      {showBedsideMode && (
        <BedsideMode onClose={() => setShowBedsideMode(false)} />
      )}

      <Header
        isLoggedIn={isLoggedIn}
        onLogoutSuccess={() => setIsLoggedIn(false)}
        onOpenBedsideMode={() => setShowBedsideMode(true)}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {!isLoggedIn ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center py-12">
              <EightLoginDialog onLoginSuccess={() => setIsLoggedIn(true)} />

              <div className="mt-8 flex items-center justify-center space-x-6 text-xs font-semibold text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Direct Cloud API</span>
                </div>
                <span>·</span>
                <div className="flex items-center space-x-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Self-Hosted &amp; Private</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tab Navigation & Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="inline-flex items-center rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className={`inline-flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === "dashboard"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Bento Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("control")}
                    className={`inline-flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === "control"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Rotary Dial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className={`inline-flex items-center space-x-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === "schedule"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Night Curve &amp; Stages</span>
                  </button>
                </div>

                {/* Nightstand Quick Launch Pill */}
                <button
                  type="button"
                  onClick={() => setShowBedsideMode(true)}
                  className="inline-flex items-center justify-center space-x-2 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 text-xs font-extrabold text-amber-900 shadow-sm transition hover:from-amber-100 hover:to-orange-100 active:scale-95 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-200"
                >
                  <Moon className="h-4 w-4 text-amber-500" />
                  <span>Launch Bedside Nightstand Mode</span>
                </button>
              </div>

              {/* View 1: Bento Dashboard (Autopilot Wave + Rotary Thermostat + Stages) */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Top Bento Banner: Interactive Temperature Wave Curve */}
                  <TemperatureCurveGraph />

                  {/* 2-Column Bento Grid */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <RotaryThermostat />
                    </div>
                    <div className="lg:col-span-7">
                      <TemperatureProfileForm />
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Focused Rotary Thermostat Control */}
              {activeTab === "control" && (
                <div className="mx-auto max-w-xl space-y-6">
                  <RotaryThermostat />
                  <TemperatureCurveGraph />
                </div>
              )}

              {/* View 3: Focused Schedule & Thermal Wave */}
              {activeTab === "schedule" && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <TemperatureCurveGraph />
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
