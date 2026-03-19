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
}

export default function FooterHelperDock({
  children,
  className,
  side = "left",
  slot,
}: FooterHelperDockProps) {
  return (
    <ViewportPortal>
      <div
        data-slot={slot}
        data-side={side}
        className={cn("footer-helper-dock pointer-events-none z-50", className)}
      >
        {children}
      </div>
    </ViewportPortal>
  );
}
