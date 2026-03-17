import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Navbar from "@/components/shared/Navbar";
import "./globals.css";

const themeInitScript = `
  (() => {
    const storedTheme = window.localStorage.getItem("demagog-theme");
    const theme = storedTheme === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
  })();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="h-14 w-16 rounded-md border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 sm:h-16 sm:w-20" />
        <div className="hidden h-11 w-full max-w-md rounded-full border border-slate-200 bg-slate-100/80 dark:border-slate-700/70 dark:bg-slate-800/70 lg:block" />
        <div className="h-9 w-9 rounded-full border border-slate-300/90 bg-white/90 dark:border-slate-700 dark:bg-slate-900/85" />
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
    <html lang="sk" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground font-sans antialiased`}
      >
        <div className="noise-overlay min-h-screen">
          <Suspense fallback={<NavbarFallback />}>
            <Navbar />
          </Suspense>
          <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
