"use client";

import React, { useEffect, useRef, useState } from "react";
import { Header } from "~/components/header";
import { Footer } from "~/components/footer";
import { EightLoginDialog } from "~/components/eightLogin";
import { BedsideMode } from "~/components/bedsideMode";
import { BottomNav, APP_TABS, type AppTab } from "~/components/bottomNav";
import { HomePanel } from "~/components/homePanel";
import { SchedulePanel } from "~/components/schedulePanel";
import { PresetsPanel } from "~/components/presetsPanel";
import { SettingsPanel } from "~/components/settingsPanel";
import { ToastProvider } from "~/components/ui/toast";
import { apiR } from "~/trpc/react";
import { getDeviceToken, readStorage, setDeviceToken, writeStorage } from "~/lib/clientStorage";
import { Cpu, Loader2, Shield } from "lucide-react";

const TAB_KEY = "podhub-tab";

export default function ClientHome({
  initialLoginState,
}: {
  initialLoginState: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoginState);
  // While logged out, try the saved device token before showing the login form.
  const [isRestoring, setIsRestoring] = useState(!initialLoginState);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [showBedsideMode, setShowBedsideMode] = useState<boolean>(false);
  const utils = apiR.useUtils();

  const refreshSession = apiR.user.refreshSession.useMutation({
    onSuccess: (data) => setDeviceToken(data.deviceToken),
  });
  const resumeSession = apiR.user.resumeSession.useMutation();

  const sessionChecked = useRef(false);
  useEffect(() => {
    if (sessionChecked.current) return;
    sessionChecked.current = true;

    const saved = readStorage(TAB_KEY);
    if (APP_TABS.some((t) => t.id === saved)) setActiveTab(saved as AppTab);

    if (initialLoginState) {
      refreshSession.mutate();
      return;
    }
    const deviceToken = getDeviceToken();
    if (!deviceToken) {
      setIsRestoring(false);
      return;
    }
    resumeSession.mutate(
      { deviceToken },
      {
        onSuccess: (data) => {
          setDeviceToken(data.deviceToken);
          utils.invalidate().catch(() => undefined);
          setIsLoggedIn(true);
        },
        onError: () => setDeviceToken(null),
        onSettled: () => setIsRestoring(false),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    writeStorage(TAB_KEY, tab);
    window.scrollTo({ top: 0 });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    utils.invalidate().catch(() => undefined);
  };

  return (
    <ToastProvider>
      <div className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        {showBedsideMode && <BedsideMode onClose={() => setShowBedsideMode(false)} />}

        <Header
          isLoggedIn={isLoggedIn}
          onOpenBedsideMode={() => setShowBedsideMode(true)}
        />

        {isRestoring ? (
          <main className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span>Restoring your session…</span>
          </main>
        ) : !isLoggedIn ? (
          <>
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
              <EightLoginDialog
                onLoginSuccess={() => {
                  utils.invalidate().catch(() => undefined);
                  setIsLoggedIn(true);
                }}
              />
              <div className="mt-8 flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                  Direct Cloud API
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  Self-hosted &amp; private
                </span>
              </div>
            </main>
            <Footer />
          </>
        ) : (
          <>
            <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pb-28">
              <div className="mx-auto max-w-3xl">
                {activeTab === "home" && (
                  <HomePanel
                    onOpenBedsideMode={() => setShowBedsideMode(true)}
                    onNavigate={changeTab}
                  />
                )}
                {activeTab === "schedule" && <SchedulePanel onNavigate={changeTab} />}
                {activeTab === "presets" && <PresetsPanel onNavigate={changeTab} />}
                {activeTab === "settings" && <SettingsPanel onLogoutSuccess={handleLogout} />}
              </div>
            </main>
            <BottomNav active={activeTab} onChange={changeTab} />
          </>
        )}
      </div>
    </ToastProvider>
  );
}
