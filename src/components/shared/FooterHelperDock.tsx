"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import ViewportPortal from "./ViewportPortal";

type FooterHelperDockSlot = "feedback" | "guide" | "toast";
type FooterHelperDockSide = "left" | "right";

interface FooterHelperDockProps {
  children: ReactNode;
  className?: string;
  side?: FooterHelperDockSide;
  slot: FooterHelperDockSlot;
  testId?: string;
}

export default function FooterHelperDock({
  children,
  className,
  side = "left",
  slot,
  testId,
}: FooterHelperDockProps) {
  return (
    <ViewportPortal>
      <div
        data-slot={slot}
        data-side={side}
        data-testid={testId ?? `footer-helper-dock-${slot}`}
        className={cn("footer-helper-dock pointer-events-none z-50", className)}
      >
        {children}
      </div>
    </ViewportPortal>
  );
}
