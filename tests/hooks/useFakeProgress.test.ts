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
      globalThis.setTimeout(() => callback(performance.now()), 16)) as unknown as typeof window.requestAnimationFrame;
    const cancelAnimationFrameMock = ((handle: number) =>
      globalThis.clearTimeout(handle)) as typeof window.cancelAnimationFrame;

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

  it("moves linearly to 70 percent before easing into the final cap", () => {
    const { result, rerender } = renderHook(
      ({ pending }: { pending: boolean }) =>
        useFakeProgress({
          pending,
          phase: "detect",
        }),
      {
        initialProps: { pending: false },
      },
    );

    act(() => {
      rerender({ pending: true });
      vi.advanceTimersByTime(16);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.progress).toBe(6);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.progress).toBeGreaterThan(37);
    expect(result.current.progress).toBeLessThan(39);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(69.5);
    expect(result.current.progress).toBeLessThanOrEqual(70.5);

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(result.current.progress).toBeGreaterThan(82);
    expect(result.current.progress).toBeLessThan(84);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(84);
    expect(result.current.progress).toBeLessThanOrEqual(85);
  });

  it("surges to completion after pending ends with completing true", () => {
    const { result, rerender } = renderHook(
      ({ pending, completing }: { pending: boolean; completing: boolean }) =>
        useFakeProgress({
          pending,
          completing,
          phase: "aggregate",
        }),
      {
        initialProps: { pending: false, completing: false },
      },
    );

    act(() => {
      rerender({ pending: true, completing: false });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    const progressBeforeCompletion = result.current.progress;
    expect(progressBeforeCompletion).toBeGreaterThan(74);
    expect(progressBeforeCompletion).toBeLessThanOrEqual(85);

    act(() => {
      rerender({ pending: false, completing: true });
    });

    act(() => {
      vi.advanceTimersByTime(420);
    });

    expect(result.current.progress).toBe(0);
    expect(result.current.isVisible).toBe(false);
  });

  it("advances visibly through the first half of a 300ms completion animation", () => {
    const { result, rerender } = renderHook(
      ({ pending, completing }: { pending: boolean; completing: boolean }) =>
        useFakeProgress({
          pending,
          completing,
          phase: "aggregate",
          completionDurationMs: 300,
        }),
      {
        initialProps: { pending: false, completing: false },
      },
    );

    act(() => {
      rerender({ pending: true, completing: false });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(84);
    expect(result.current.progress).toBeLessThanOrEqual(85);

    act(() => {
      rerender({ pending: false, completing: true });
    });

    act(() => {
      vi.advanceTimersByTime(166);
    });

    expect(result.current.progress).toBeGreaterThan(96);
    expect(result.current.progress).toBeLessThan(100);
  });

  it("does not finish a 300ms completion animation at 220ms", () => {
    const { result, rerender } = renderHook(
      ({ pending, completing }: { pending: boolean; completing: boolean }) =>
        useFakeProgress({
          pending,
          completing,
          phase: "aggregate",
          completionDurationMs: 300,
        }),
      {
        initialProps: { pending: false, completing: false },
      },
    );

    act(() => {
      rerender({ pending: true, completing: false });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    act(() => {
      rerender({ pending: false, completing: true });
    });

    act(() => {
      vi.advanceTimersByTime(236);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.progress).toBeGreaterThan(97);
    expect(result.current.progress).toBeLessThan(100);
  });

  it("does not jump forward when detect transitions into aggregate preparation", () => {
    const { result, rerender } = renderHook(
      ({ pending, phase }: { pending: boolean; phase: "detect" | "aggregate" }) =>
        useFakeProgress({
          pending,
          phase,
        }),
      {
        initialProps: { pending: false, phase: "detect" as "detect" | "aggregate" },
      },
    );

    act(() => {
      rerender({ pending: true, phase: "detect" });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    const progressBeforePhaseChange = result.current.progress;
    expect(progressBeforePhaseChange).toBeGreaterThanOrEqual(69.5);
    expect(progressBeforePhaseChange).toBeLessThanOrEqual(70.5);

    act(() => {
      rerender({ pending: true, phase: "aggregate" });
      vi.advanceTimersByTime(200);
    });

    expect(result.current.progress - progressBeforePhaseChange).toBeLessThan(4);
    expect(result.current.progress).toBeLessThan(74);
  });

  it("does not reset when pending briefly toggles off and on mid-curve", () => {
    const { result, rerender } = renderHook(
      ({ pending }: { pending: boolean }) =>
        useFakeProgress({
          pending,
          phase: "detect",
        }),
      {
        initialProps: { pending: false },
      },
    );

    act(() => {
      rerender({ pending: true });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    const progressBeforeBlip = result.current.progress;
    expect(progressBeforeBlip).toBeGreaterThan(37);
    expect(progressBeforeBlip).toBeLessThan(39);

    act(() => {
      rerender({ pending: false });
      rerender({ pending: true });
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.progress).toBeGreaterThan(progressBeforeBlip + 9);
    expect(result.current.progress).toBeLessThan(progressBeforeBlip + 13);
  });

  it("completes from 85 to 100 percent when completing is true", () => {
    const { result, rerender } = renderHook(
      ({ pending, completing }: { pending: boolean; completing: boolean }) =>
        useFakeProgress({
          pending,
          completing,
          phase: "aggregate",
          completionDurationMs: 280,
        }),
      {
        initialProps: { pending: false, completing: false },
      },
    );

    act(() => {
      rerender({ pending: true, completing: false });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(84);
    expect(result.current.progress).toBeLessThanOrEqual(85);

    const progressAtCompletionStart = result.current.progress;

    act(() => {
      rerender({ pending: false, completing: true });
    });

    act(() => {
      vi.advanceTimersByTime(32);
    });

    expect(result.current.progress).toBeGreaterThan(progressAtCompletionStart);
  });

  it("hides immediately when pending ends without a completion phase", () => {
    const { result, rerender } = renderHook(
      ({ pending, completing }: { pending: boolean; completing: boolean }) =>
        useFakeProgress({
          pending,
          completing,
          phase: "detect",
        }),
      {
        initialProps: { pending: false, completing: false },
      },
    );

    act(() => {
      rerender({ pending: true, completing: false });
      vi.advanceTimersByTime(16);
    });

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(result.current.progress).toBeGreaterThanOrEqual(69.5);
    expect(result.current.progress).toBeLessThanOrEqual(70.5);

    act(() => {
      rerender({ pending: false, completing: false });
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.progress).toBe(0);
  });
});
