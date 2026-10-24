import "~/styles/globals.css";

import { Inter as FontSans } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/themeProvider";
import { cn } from "~/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Hugo's Pod Hub | Smart Scheduling & Pod Manager",
  description:
    "Smart scheduling, wake-up thermal alarm, and direct mattress controls for Eight Sleep without subscriptions.",
  applicationName: "Pod Hub",
  appleWebApp: {
    capable: true,
    title: "Pod Hub",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "dark min-h-screen font-sans antialiased",
        fontSans.variable,
      )}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('hugos-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else if (saved === 'light' || (saved === 'system' && !prefersDark)) {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <TRPCReactProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
