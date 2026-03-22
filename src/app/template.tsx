"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const isAddRoute = pathname === "/add";
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  const addEnterOffset = isCompactViewport ? 18 : 28;
  const addExitOffset = isCompactViewport ? -12 : -18;
  const addInitialScale = isCompactViewport ? 0.992 : 0.982;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12, scale: 0.996 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{ opacity: 0, y: -8, scale: 0.994 }}
        transition={{
          duration: isAddRoute ? (isCompactViewport ? 0.28 : 0.36) : 0.22,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="will-change-[opacity,transform]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
