"use client";

import dynamic from "next/dynamic";

const AnimatedThemeToggle = dynamic(
  () =>
    import("@/components/ui/animated-theme-toggle").then(
      (module) => module.AnimatedThemeToggle,
    ),
  { ssr: false },
);

export default function ThemeToggle() {
  return <AnimatedThemeToggle />;
}
