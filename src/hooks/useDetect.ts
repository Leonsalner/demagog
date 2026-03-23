"use client";

import { useCallback, useRef, useState } from "react";

import { mockStatements } from "@/lib/mock-data";
import { DetectMode, DetectResponse, DetectionMatch, Statement } from "@/types";
import type { DetectHistoryEntry } from "@/types/history";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_DETECT_MOCK === "true";
const DETECT_TIMEOUT_MS = 11000;
const DETECT_RETRY_TIMEOUT_MS = 8000;

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

function buildTimeoutFallbackResponse(statement: string): DetectResponse {
  return {
    input_statement: statement,
    matches: [],
    overall_status: "NEW_CLAIM",
    query_time_ms: DETECT_TIMEOUT_MS,
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

export function useDetect() {
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryUpgradeNotice, setRetryUpgradeNotice] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryAbortControllerRef = useRef<AbortController | null>(null);

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

  const detect = useCallback(async (statement: string, mode: DetectMode = "fast") => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryAbortControllerRef.current) {
      retryAbortControllerRef.current.abort();
      retryAbortControllerRef.current = null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let didTimeout = false;

    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, DETECT_TIMEOUT_MS);

    setLoading(true);
    setError(null);
    setResult(null);
    setRetryUpgradeNotice(null);

    try {
      if (USE_MOCK) {
        await wait(1200);
        if (requestIdRef.current !== requestId) {
          return;
        }
        setResult(createMockResponse(statement, 10));
        return;
      }

      const data = await runDetectRequest(statement, mode, controller.signal);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setResult(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (requestIdRef.current === requestId) {
          if (didTimeout) {
            setResult(buildTimeoutFallbackResponse(statement));
            setError(null);

            const retryController = new AbortController();
            retryAbortControllerRef.current = retryController;
            const retryTimeoutId = window.setTimeout(() => {
              retryController.abort();
            }, DETECT_RETRY_TIMEOUT_MS);

            void runDetectRequest(statement, mode, retryController.signal)
              .then((retryResult) => {
                if (requestIdRef.current !== requestId || retryController.signal.aborted) {
                  return;
                }

                if (retryResult.overall_status !== "NEW_CLAIM") {
                  setResult(retryResult);
                  setRetryUpgradeNotice(
                    "Dodatočné overenie našlo zhody. Zobrazené sú aktualizované výsledky.",
                  );
                }
              })
              .catch(() => {
                // Keep the silent NEW_CLAIM fallback if the background retry also fails.
              })
              .finally(() => {
                window.clearTimeout(retryTimeoutId);
                if (retryAbortControllerRef.current === retryController) {
                  retryAbortControllerRef.current = null;
                }
              });
          } else {
            setError(null);
          }
        }
        return;
      }
      if (requestIdRef.current !== requestId) {
        return;
      }
      setResult(null);
      setError(error instanceof Error ? error.message : "Detekcia zlyhala.");
    } finally {
      clearTimeout(timeoutId);
      if (requestIdRef.current === requestId) {
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
    if (retryAbortControllerRef.current) {
      retryAbortControllerRef.current.abort();
      retryAbortControllerRef.current = null;
    }
    setResult(null);
    setError(null);
    setLoading(false);
    setRetryUpgradeNotice(null);
  }, []);

  const restore = useCallback((entry: DetectHistoryEntry) => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (retryAbortControllerRef.current) {
      retryAbortControllerRef.current.abort();
      retryAbortControllerRef.current = null;
    }

    setLoading(false);
    setError(null);
    setResult(entry.response);
    setRetryUpgradeNotice(null);
  }, []);

  return { result, loading, error, retryUpgradeNotice, detect, restore, reset };
}
