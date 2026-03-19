"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ViewportPortalProps {
  children: ReactNode;
}

export default function ViewportPortal({ children }: ViewportPortalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
