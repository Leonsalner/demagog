"use client";

import { useEffect, useRef, useState } from "react";

type FakeProgressPhase = "detect" | "aggregate" | "statement-research";

interface UseFakeProgressOptions {
  active: boolean;
  phase: FakeProgressPhase;
  completionDurationMs?: number;
}

interface FakeProgressState {
  isVisible: boolean;
  progress: number;
}

const DEFAULT_START_PROGRESS = 6;

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number) {
  return value ** 3;
}

function interpolate(start: number, end: number, rawProgress: number, easing = easeOutCubic) {
  const clamped = Math.min(1, Math.max(0, rawProgress));
  return start + (end - start) * easing(clamped);
}

function getPhaseProgress(phase: FakeProgressPhase, elapsedMs: number) {
  const cappedElapsed = Math.max(0, elapsedMs);
  const profile =
    phase === "aggregate"
      ? {
          rampOne: 450,
          rampTwo: 900,
          rampThree: 1500,
          rampFour: 2100,
        }
      : phase === "statement-research"
        ? {
            rampOne: 520,
            rampTwo: 1050,
            rampThree: 1800,
            rampFour: 2500,
          }
        : {
            rampOne: 600,
            rampTwo: 1200,
            rampThree: 2200,
            rampFour: 3000,
          };

  if (cappedElapsed <= profile.rampOne) {
    return interpolate(DEFAULT_START_PROGRESS, 35, cappedElapsed / profile.rampOne);
  }

  if (cappedElapsed <= profile.rampTwo) {
    return interpolate(35, 60, (cappedElapsed - profile.rampOne) / (profile.rampTwo - profile.rampOne));
  }

  if (cappedElapsed <= profile.rampThree) {
    return interpolate(60, 75, (cappedElapsed - profile.rampTwo) / (profile.rampThree - profile.rampTwo));
  }

  if (cappedElapsed <= profile.rampFour) {
    return interpolate(75, 84, (cappedElapsed - profile.rampThree) / (profile.rampFour - profile.rampThree));
  }

  const tailElapsed = cappedElapsed - profile.rampFour;
  return Math.min(85, 84 + (1 - Math.exp(-tailElapsed / 1600)));
}

export default function useFakeProgress({
  active,
  phase,
  completionDurationMs = 260,
}: UseFakeProgressOptions): FakeProgressState {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef<number | null>(null);
  const previousActiveRef = useRef(active);
  const completingFromRef = useRef(0);
  const completionStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const wasActive = previousActiveRef.current;
    previousActiveRef.current = active;

    if (active && !wasActive) {
      setIsVisible(true);
      setProgress((currentProgress) =>
        currentProgress > DEFAULT_START_PROGRESS ? currentProgress : DEFAULT_START_PROGRESS,
      );
      phaseStartedAtRef.current = null;
      completionStartedAtRef.current = null;
      completingFromRef.current = 0;
    }

    if (!active && wasActive) {
      completionStartedAtRef.current = null;
      completingFromRef.current = progress;
    }
  }, [active, progress]);

  useEffect(() => {
    if (!isVisible && !active) {
      return;
    }

    function step(timestamp: number) {
      if (active) {
        if (phaseStartedAtRef.current === null) {
          phaseStartedAtRef.current = timestamp;
        }

        const elapsed = timestamp - phaseStartedAtRef.current;
        const nextProgress = getPhaseProgress(phase, elapsed);
        setProgress((currentProgress) => {
          if (currentProgress >= 85) {
            return currentProgress;
          }

          return Math.max(currentProgress, nextProgress);
        });
      } else {
        if (completionStartedAtRef.current === null) {
          completionStartedAtRef.current = timestamp;
          completingFromRef.current = Math.max(completingFromRef.current, progress);
        }

        const completionElapsed = timestamp - completionStartedAtRef.current;
        const completionProgress = Math.min(1, completionElapsed / completionDurationMs);
        const nextProgress = interpolate(
          completingFromRef.current,
          100,
          completionProgress,
          easeInCubic,
        );

        setProgress(nextProgress);

        if (completionProgress >= 1) {
          setIsVisible(false);
          setProgress(0);
          phaseStartedAtRef.current = null;
          completionStartedAtRef.current = null;
          completingFromRef.current = 0;
          animationFrameRef.current = null;
          return;
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    }

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [active, completionDurationMs, isVisible, phase, progress]);

  return {
    isVisible,
    progress,
  };
}
