"use client";

import { act, renderHook } from "@testing-library/react";

import useFakeProgress from "@/hooks/useFakeProgress";

describe("useFakeProgress", () => {
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame | undefined;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame | undefined;
  let originalGlobalRequestAnimationFrame: typeof globalThis.requestAnimationFrame | undefined;
  let originalGlobalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame | undefined;

  beforeAll(() => {
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    originalGlobalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalGlobalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    const requestAnimationFrameMock = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)) as typeof window.requestAnimationFrame;
    const cancelAnimationFrameMock = ((handle: number) =>
      window.clearTimeout(handle)) as typeof window.cancelAnimationFrame;

    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = cancelAnimationFrameMock;
    globalThis.requestAnimationFrame = requestAnimationFrameMock;
    globalThis.cancelAnimationFrame = cancelAnimationFrameMock;
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    if (originalRequestAnimationFrame) {
      window.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete (window as Partial<typeof window>).requestAnimationFrame;
    }

    if (originalCancelAnimationFrame) {
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      delete (window as Partial<typeof window>).cancelAnimationFrame;
    }

    if (originalGlobalRequestAnimationFrame) {
      globalThis.requestAnimationFrame = originalGlobalRequestAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    }

    if (originalGlobalCancelAnimationFrame) {
      globalThis.cancelAnimationFrame = originalGlobalCancelAnimationFrame;
    } else {
      delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
    }
  });

  it("moves quickly at first and stays capped while still active", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useFakeProgress({
          active,
          phase: "detect",
        }),
      {
        initialProps: { active: false },
      },
    );

    act(() => {
      rerender({ active: true });
      vi.advanceTimersByTime(16);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.progress).toBe(6);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.progress).toBeGreaterThan(45);
    expect(result.current.progress).toBeLessThan(60);

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(68);
    expect(result.current.progress).toBeLessThan(76);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(84);
    expect(result.current.progress).toBeLessThanOrEqual(85);
  });

  it("surges to completion after the active phase ends", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useFakeProgress({
          active,
          phase: "aggregate",
        }),
      {
        initialProps: { active: false },
      },
    );

    act(() => {
      rerender({ active: true });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    const progressBeforeCompletion = result.current.progress;
    expect(progressBeforeCompletion).toBeGreaterThan(65);
    expect(progressBeforeCompletion).toBeLessThanOrEqual(85);

    act(() => {
      rerender({ active: false });
    });

    act(() => {
      vi.advanceTimersByTime(420);
    });

    expect(result.current.progress).toBe(0);
    expect(result.current.isVisible).toBe(false);
  });

  it("does not jump forward when detect transitions into aggregate preparation", () => {
    const { result, rerender } = renderHook(
      ({ active, phase }: { active: boolean; phase: "detect" | "aggregate" }) =>
        useFakeProgress({
          active,
          phase,
        }),
      {
        initialProps: { active: false, phase: "detect" as const },
      },
    );

    act(() => {
      rerender({ active: true, phase: "detect" });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    const progressBeforePhaseChange = result.current.progress;
    expect(progressBeforePhaseChange).toBeGreaterThanOrEqual(64);
    expect(progressBeforePhaseChange).toBeLessThan(74);

    act(() => {
      rerender({ active: true, phase: "aggregate" });
      vi.advanceTimersByTime(200);
    });

    expect(result.current.progress - progressBeforePhaseChange).toBeLessThan(4);
    expect(result.current.progress).toBeLessThan(78);
  });
});
