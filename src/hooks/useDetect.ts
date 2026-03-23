"use client";

import { useCallback, useRef, useState } from "react";

import { mockStatements } from "@/lib/mock-data";
import { DetectMode, DetectResponse, DetectionMatch, Statement } from "@/types";
import type { DetectHistoryEntry } from "@/types/history";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_DETECT_MOCK === "true";
const DETECT_VISIBLE_TIMEOUT_MS = 8000;
const DETECT_HIDDEN_TIMEOUT_MS = 10000;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function extractDetectErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = await response.json();
    if (
      errorBody &&
      typeof errorBody === "object" &&
      "error" in errorBody &&
      typeof errorBody.error === "string"
    ) {
      return errorBody.error;
    }
  } catch {
    // Ignore malformed or empty error payloads.
  }

  return "Detekcia zlyhala.";
}

function buildTimeoutFallbackResponse(
  statement: string,
  queryTimeMs: number = DETECT_VISIBLE_TIMEOUT_MS,
): DetectResponse {
  return {
    input_statement: statement,
    matches: [],
    overall_status: "NEW_CLAIM",
    query_time_ms: queryTimeMs,
  };
}

function buildMatch(
  statement: Statement,
  similarity: number,
  classification: DetectionMatch["classification"],
): DetectionMatch {
  return {
    statement,
    similarity,
    classification,
  };
}

function createMockResponse(input: string, topK: number): DetectResponse {
  const normalized = input.toLowerCase();
  const statementsById = new Map(mockStatements.map((statement) => [statement.id, statement]));

  const getStatementById = (id: number): Statement => {
    const statement = statementsById.get(id);
    if (!statement) {
      throw new Error(`Mock statement ${id} not found - check mock-data.ts`);
    }
    return statement;
  };

  const duplicateMatches = [
    buildMatch(
      getStatementById(14),
      0.92,
      "DUPLICATE",
    ),
    buildMatch(
      getStatementById(15),
      0.87,
      "DUPLICATE",
    ),
  ];

  const relatedMatches = [
    buildMatch(
      getStatementById(11),
      0.65,
      "RELATED",
    ),
    buildMatch(
      getStatementById(12),
      0.58,
      "RELATED",
    ),
    buildMatch(
      getStatementById(13),
      0.51,
      "RELATED",
    ),
  ];

  const unrelatedMatches = [
    buildMatch(
      getStatementById(1),
      0.31,
      "UNRELATED",
    ),
    buildMatch(
      getStatementById(7),
      0.26,
      "UNRELATED",
    ),
  ];

  if (normalized.includes("mars")) {
    return {
      input_statement: input,
      matches: [],
      overall_status: "NEW_CLAIM",
      query_time_ms: 1180,
    };
  }

  if (
    normalized.includes("ukrajin") ||
    normalized.includes("hranic") ||
    normalized.includes("európska komisia")
  ) {
    return {
      input_statement: input,
      matches: [...relatedMatches, ...unrelatedMatches].slice(0, topK),
      overall_status: "RELATED_ONLY",
      query_time_ms: 1430,
    };
  }

  return {
    input_statement: input,
    matches: [...duplicateMatches, ...relatedMatches, ...unrelatedMatches].slice(0, topK),
    overall_status: "DUPLICATE_FOUND",
    query_time_ms: 1360,
  };
}

export type DetectLateMatchNotice =
  | {
      status: "DUPLICATE_FOUND" | "RELATED_ONLY";
      result: DetectResponse;
    }
  | null;

export function useDetect() {
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lateMatchNotice, setLateMatchNotice] = useState<DetectLateMatchNotice>(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hiddenAbortControllerRef = useRef<AbortController | null>(null);
  const visibleTimeoutRef = useRef<number | null>(null);

  const runDetectRequest = useCallback(
    async (
      statement: string,
      mode: DetectMode,
      signal: AbortSignal,
    ): Promise<DetectResponse> => {
      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement, top_k: 10, mode }),
        signal,
      });

      if (!response.ok) {
        throw new Error(await extractDetectErrorMessage(response));
      }

      return response.json();
    },
    [],
  );

  const dismissLateMatchNotice = useCallback(() => {
    setLateMatchNotice(null);
  }, []);

  const applyLateMatchResult = useCallback(() => {
    if (lateMatchNotice) {
      setResult(lateMatchNotice.result);
      setLateMatchNotice(null);
    }
  }, [lateMatchNotice]);

  const detect = useCallback(async (statement: string, mode: DetectMode = "fast") => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (hiddenAbortControllerRef.current) {
      hiddenAbortControllerRef.current.abort();
      hiddenAbortControllerRef.current = null;
    }
    if (visibleTimeoutRef.current !== null) {
      window.clearTimeout(visibleTimeoutRef.current);
      visibleTimeoutRef.current = null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let didVisibleFallback = false;

    setLoading(true);
    setError(null);
    setResult(null);
    setLateMatchNotice(null);

    const finalizeVisibleTimeoutFallback = () => {
      if (didVisibleFallback || requestIdRef.current !== requestId) {
        return;
      }

      didVisibleFallback = true;
      controller.abort();
      setResult(buildTimeoutFallbackResponse(statement, DETECT_VISIBLE_TIMEOUT_MS));
      setError(null);
      setLoading(false);

      startHiddenBackgroundDetect(statement, mode, requestId);
    };

    const startHiddenBackgroundDetect = (
      bgStatement: string,
      bgMode: DetectMode,
      bgRequestId: number,
    ) => {
      if (USE_MOCK) {
        return;
      }

      const hiddenController = new AbortController();
      hiddenAbortControllerRef.current = hiddenController;
      const hiddenTimeoutId = window.setTimeout(() => {
        hiddenController.abort();
      }, DETECT_HIDDEN_TIMEOUT_MS);

      void runDetectRequest(bgStatement, bgMode, hiddenController.signal)
        .then((hiddenResult) => {
          if (requestIdRef.current !== bgRequestId || hiddenController.signal.aborted) {
            return;
          }

          if (hiddenResult.overall_status !== "NEW_CLAIM") {
            setLateMatchNotice({
              status: hiddenResult.overall_status,
              result: hiddenResult,
            });
          }
        })
        .catch(() => {
          // Silent fail - late matches not available
        })
        .finally(() => {
          window.clearTimeout(hiddenTimeoutId);
          if (hiddenAbortControllerRef.current === hiddenController) {
            hiddenAbortControllerRef.current = null;
          }
        });
    };

    visibleTimeoutRef.current = window.setTimeout(() => {
      finalizeVisibleTimeoutFallback();
    }, DETECT_VISIBLE_TIMEOUT_MS);

    try {
      if (USE_MOCK) {
        await wait(1200);
        if (requestIdRef.current !== requestId || didVisibleFallback) {
          return;
        }
        setResult(createMockResponse(statement, 10));
        setLoading(false);
        return;
      }

      const visibleRequestPromise = runDetectRequest(statement, mode, controller.signal)
        .then((data) => {
          if (requestIdRef.current !== requestId || didVisibleFallback) {
            return "stale" as const;
          }

          if (visibleTimeoutRef.current !== null) {
            window.clearTimeout(visibleTimeoutRef.current);
            visibleTimeoutRef.current = null;
          }
          setResult(data);
          return "resolved" as const;
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            if (requestIdRef.current === requestId && !didVisibleFallback) {
              setError(null);
            }
            return "aborted" as const;
          }

          if (requestIdRef.current === requestId && !didVisibleFallback) {
            setResult(null);
            setError(error instanceof Error ? error.message : "Detekcia zlyhala.");
          }
          return "errored" as const;
        });

      const visibleTimeoutPromise = new Promise<"timeout">((resolve) => {
        visibleTimeoutRef.current = window.setTimeout(() => {
          finalizeVisibleTimeoutFallback();
          resolve("timeout");
        }, DETECT_VISIBLE_TIMEOUT_MS);
      });

      await Promise.race([visibleRequestPromise, visibleTimeoutPromise]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (requestIdRef.current === requestId && !didVisibleFallback) {
          setError(null);
        }
        return;
      }
      if (requestIdRef.current !== requestId || didVisibleFallback) {
        return;
      }
      setResult(null);
      setError(error instanceof Error ? error.message : "Detekcia zlyhala.");
    } finally {
      if (visibleTimeoutRef.current !== null) {
        window.clearTimeout(visibleTimeoutRef.current);
        visibleTimeoutRef.current = null;
      }
      if (requestIdRef.current === requestId && !didVisibleFallback) {
        setLoading(false);
      }
    }
  }, [runDetectRequest]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (hiddenAbortControllerRef.current) {
      hiddenAbortControllerRef.current.abort();
      hiddenAbortControllerRef.current = null;
    }
    if (visibleTimeoutRef.current !== null) {
      window.clearTimeout(visibleTimeoutRef.current);
      visibleTimeoutRef.current = null;
    }
    setResult(null);
    setError(null);
    setLoading(false);
    setLateMatchNotice(null);
  }, []);

  const restore = useCallback((entry: DetectHistoryEntry) => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (hiddenAbortControllerRef.current) {
      hiddenAbortControllerRef.current.abort();
      hiddenAbortControllerRef.current = null;
    }
    if (visibleTimeoutRef.current !== null) {
      window.clearTimeout(visibleTimeoutRef.current);
      visibleTimeoutRef.current = null;
    }

    setLoading(false);
    setError(null);
    setResult(entry.response);
    setLateMatchNotice(null);
  }, []);

  return {
    result,
    loading,
    error,
    lateMatchNotice,
    dismissLateMatchNotice,
    applyLateMatchResult,
    detect,
    restore,
    reset,
  };
}
