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
const LINEAR_PROGRESS_TARGET = 70;
const MAX_PENDING_PROGRESS = 85;
const LINEAR_DURATION_MS = 2400;
const SLOWDOWN_TAU_MS = 800;

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
  void phase;

  const cappedElapsed = Math.max(0, elapsedMs);
  if (cappedElapsed <= LINEAR_DURATION_MS) {
    return interpolate(
      DEFAULT_START_PROGRESS,
      LINEAR_PROGRESS_TARGET,
      cappedElapsed / LINEAR_DURATION_MS,
      (value) => value,
    );
  }

  const slowdownElapsed = cappedElapsed - LINEAR_DURATION_MS;
  const remainingRange = MAX_PENDING_PROGRESS - LINEAR_PROGRESS_TARGET;
  return Math.min(
    MAX_PENDING_PROGRESS,
    MAX_PENDING_PROGRESS - remainingRange * Math.exp(-slowdownElapsed / SLOWDOWN_TAU_MS),
  );
}

export default function useFakeProgress({
  active,
  phase,
  completionDurationMs = 220,
}: UseFakeProgressOptions): FakeProgressState {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef<number | null>(null);
  const previousActiveRef = useRef(active);
  const completingFromRef = useRef(0);
  const completionStartedAtRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

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
      completingFromRef.current = progressRef.current;
    }
  }, [active]);

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
          if (currentProgress >= MAX_PENDING_PROGRESS) {
            return currentProgress;
          }

          const nextValue = Math.max(currentProgress, nextProgress);
          progressRef.current = nextValue;
          return nextValue;
        });
      } else {
        if (completionStartedAtRef.current === null) {
          completionStartedAtRef.current = timestamp;
          completingFromRef.current = Math.max(completingFromRef.current, progressRef.current);
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
        progressRef.current = nextProgress;

        if (completionProgress >= 1) {
          setIsVisible(false);
          setProgress(0);
          progressRef.current = 0;
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
  }, [active, completionDurationMs, isVisible, phase]);

  return {
    isVisible,
    progress,
  };
}
