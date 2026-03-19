"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const FOOTER_HELPERS_SEEN_STORAGE_KEY = "demagog-footer-helpers-seen-v1";
const MOBILE_BREAKPOINT_QUERY = "(max-width: 639px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const DESKTOP_FIRST_VISIT_DURATION_MS = 30_000;
const DESKTOP_RETURNING_VISIT_DURATION_MS = 5_000;
const MOBILE_FIRST_VISIT_DURATION_MS = 15_000;
const MOBILE_RETURNING_VISIT_DURATION_MS = 3_000;

export type FooterHelperTarget = "feedback" | "guide";

interface FooterHelperVisibilityValue {
  isFirstVisit: boolean;
  isMobile: boolean;
  prefersReducedMotion: boolean;
  requestExpansionWindow: (target: FooterHelperTarget, durationMs: number) => void;
  setExpansionHold: (target: FooterHelperTarget, isActive: boolean) => void;
  shouldForceExpand: (target: FooterHelperTarget) => boolean;
}

const FooterHelperVisibilityContext = createContext<FooterHelperVisibilityValue | null>(null);

function readSeenState() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(FOOTER_HELPERS_SEEN_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function persistSeenState() {
  try {
    window.localStorage.setItem(FOOTER_HELPERS_SEEN_STORAGE_KEY, "seen");
  } catch {
    // Ignore persistence failures and keep the helpers usable.
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

export function FooterHelperVisibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [isFirstVisit] = useState(() => !readSeenState());
  const introDuration = isMobile
    ? isFirstVisit
      ? MOBILE_FIRST_VISIT_DURATION_MS
      : MOBILE_RETURNING_VISIT_DURATION_MS
    : isFirstVisit
      ? DESKTOP_FIRST_VISIT_DURATION_MS
      : DESKTOP_RETURNING_VISIT_DURATION_MS;
  const [baseForceExpanded, setBaseForceExpanded] = useState(() => introDuration > 0);
  const [expansionHolds, setExpansionHolds] = useState<Record<FooterHelperTarget, boolean>>({
    feedback: false,
    guide: false,
  });
  const timedHoldTimeoutsRef = useRef<Partial<Record<FooterHelperTarget, number>>>({});

  useEffect(() => {
    persistSeenState();

    const timeout = window.setTimeout(() => {
      setBaseForceExpanded(false);
    }, introDuration);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [introDuration]);

  useEffect(
    () => () => {
      Object.values(timedHoldTimeoutsRef.current).forEach((timeoutId) => {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      });
    },
    [],
  );

  const setExpansionHold = useCallback(
    (target: FooterHelperTarget, isActive: boolean) => {
      setExpansionHolds((currentHolds) =>
        currentHolds[target] === isActive
          ? currentHolds
          : {
              ...currentHolds,
              [target]: isActive,
            },
      );
    },
    [],
  );

  const shouldForceExpand = useCallback(
    (target: FooterHelperTarget) => baseForceExpanded || expansionHolds[target],
    [baseForceExpanded, expansionHolds],
  );

  const requestExpansionWindow = useCallback(
    (target: FooterHelperTarget, durationMs: number) => {
      setExpansionHolds((currentHolds) =>
        currentHolds[target]
          ? currentHolds
          : {
              ...currentHolds,
              [target]: true,
            },
      );

      const existingTimeout = timedHoldTimeoutsRef.current[target];
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
      }

      timedHoldTimeoutsRef.current[target] = window.setTimeout(() => {
        setExpansionHolds((currentHolds) =>
          currentHolds[target]
            ? {
                ...currentHolds,
                [target]: false,
              }
            : currentHolds,
        );
        delete timedHoldTimeoutsRef.current[target];
      }, durationMs);
    },
    [],
  );

  const value = useMemo(
    () => ({
      isFirstVisit,
      isMobile,
      prefersReducedMotion,
      requestExpansionWindow,
      setExpansionHold,
      shouldForceExpand,
    }),
    [
      isFirstVisit,
      isMobile,
      prefersReducedMotion,
      requestExpansionWindow,
      setExpansionHold,
      shouldForceExpand,
    ],
  );

  return (
    <FooterHelperVisibilityContext.Provider value={value}>
      {children}
    </FooterHelperVisibilityContext.Provider>
  );
}

export function useFooterHelperVisibility() {
  const context = useContext(FooterHelperVisibilityContext);

  if (!context) {
    throw new Error(
      "useFooterHelperVisibility must be used within FooterHelperVisibilityProvider",
    );
  }

  return context;
}

export function useFooterHelperExpansionHold(
  target: FooterHelperTarget,
  isActive: boolean,
) {
  const { setExpansionHold } = useFooterHelperVisibility();

  useEffect(() => {
    setExpansionHold(target, isActive);

    return () => {
      setExpansionHold(target, false);
    };
  }, [isActive, setExpansionHold, target]);
}
