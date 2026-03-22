import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import {
  FeedbackContextProvider,
} from "@/components/feedback/FeedbackContext";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import HomeOnboarding from "@/components/home/HomeOnboarding";
import {
  FooterHelperVisibilityProvider,
} from "@/components/shared/FooterHelperVisibility";
import Navbar from "@/components/shared/Navbar";
import { APP_NAVBAR_ID } from "@/lib/layout";
import { getThemeInitScript } from "@/lib/theme";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Demagog Fact-Check Tool",
  description: "Vyhľadávanie a kontrola výrokov overených Demagog.sk.",
  icons: {
    icon: [{ url: "/demagog-logo.png", type: "image/png" }],
    shortcut: [{ url: "/demagog-logo.png", type: "image/png" }],
    apple: [{ url: "/demagog-logo.png", type: "image/png" }],
  },
};

function NavbarFallback() {
  return (
    <header
      id={APP_NAVBAR_ID}
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90"
    >
      <div className="mx-auto flex w-full max-w-[86rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="h-14 w-16 rounded-md border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 sm:h-16 sm:w-20" />
        <div className="hidden h-11 w-full max-w-md rounded-full border border-slate-200 bg-slate-100/80 dark:border-slate-700/70 dark:bg-slate-800/70 lg:block" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border border-slate-300/90 bg-white/90 dark:border-slate-700 dark:bg-slate-900/85" />
          <div className="h-9 w-9 rounded-full border border-slate-300/90 bg-white/90 dark:border-slate-700 dark:bg-slate-900/85" />
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground font-sans antialiased`}>
        <FooterHelperVisibilityProvider>
          <FeedbackContextProvider>
            <div className="noise-overlay min-h-screen">
              <Suspense fallback={<NavbarFallback />}>
                <Navbar />
              </Suspense>
              <main className="mx-auto w-full max-w-[86rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                {children}
              </main>
              <Suspense fallback={null}>
                <HomeOnboarding />
              </Suspense>
              <Suspense fallback={null}>
                <FeedbackWidget />
              </Suspense>
            </div>
          </FeedbackContextProvider>
        </FooterHelperVisibilityProvider>
      </body>
    </html>
  );
}
