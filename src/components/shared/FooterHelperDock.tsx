"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import ViewportPortal from "./ViewportPortal";

type FooterHelperDockSlot = "feedback" | "guide" | "toast";

interface FooterHelperDockProps {
  children: ReactNode;
  className?: string;
  slot: FooterHelperDockSlot;
}

export default function FooterHelperDock({
  children,
  className,
  slot,
}: FooterHelperDockProps) {
  return (
    <ViewportPortal>
      <div
        data-slot={slot}
        className={cn("footer-helper-dock pointer-events-none z-50", className)}
      >
        {children}
      </div>
    </ViewportPortal>
  );
}
