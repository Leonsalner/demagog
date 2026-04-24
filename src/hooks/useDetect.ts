"use client";

import { useCallback, useRef, useState } from "react";

import { mockStatements } from "@/lib/mock-data";
import { DetectMode, DetectResponse, DetectionMatch, Statement } from "@/types";
import type { DetectHistoryEntry } from "@/types/history";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_DETECT_MOCK === "true";
const DETECT_SLOW_NOTICE_MS = 8000;
const DETECT_VERY_SLOW_NOTICE_MS = 16000;
const DETECT_HARD_TIMEOUT_MS = 25000;
const DETECT_TIMEOUT_ERROR = "Overenie sa nepodarilo dokončiť. Skúste analýzu spustiť znova.";

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

export type DetectUiState =
  | "idle"
  | "detecting"
  | "complete";

export type DetectSlowStage = "normal" | "slow" | "very_slow";

export function useDetect() {
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uiState, setUiState] = useState<DetectUiState>("idle");
  const [slowStage, setSlowStage] = useState<DetectSlowStage>("normal");

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const slowNoticeTimeoutRef = useRef<number | null>(null);
  const verySlowNoticeTimeoutRef = useRef<number | null>(null);
  const hardTimeoutRef = useRef<number | null>(null);

  const clearDetectTimers = useCallback(() => {
    if (slowNoticeTimeoutRef.current !== null) {
      window.clearTimeout(slowNoticeTimeoutRef.current);
      slowNoticeTimeoutRef.current = null;
    }
    if (verySlowNoticeTimeoutRef.current !== null) {
      window.clearTimeout(verySlowNoticeTimeoutRef.current);
      verySlowNoticeTimeoutRef.current = null;
    }
    if (hardTimeoutRef.current !== null) {
      window.clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
  }, []);

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
      abortControllerRef.current = null;
    }
    clearDetectTimers();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let didHardTimeout = false;

    setLoading(true);
    setError(null);
    setResult(null);
    setUiState("detecting");
    setSlowStage("normal");

    try {
      if (USE_MOCK) {
        await wait(1200);
        if (requestIdRef.current !== requestId) {
          return;
        }
        setResult(createMockResponse(statement, 10));
        setUiState("complete");
        setLoading(false);
        setSlowStage("normal");
        return;
      }

      slowNoticeTimeoutRef.current = window.setTimeout(() => {
        if (requestIdRef.current === requestId) {
          setSlowStage("slow");
        }
      }, DETECT_SLOW_NOTICE_MS);

      verySlowNoticeTimeoutRef.current = window.setTimeout(() => {
        if (requestIdRef.current === requestId) {
          setSlowStage("very_slow");
        }
      }, DETECT_VERY_SLOW_NOTICE_MS);

      hardTimeoutRef.current = window.setTimeout(() => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        didHardTimeout = true;
        controller.abort();
        setResult(null);
        setError(DETECT_TIMEOUT_ERROR);
        setUiState("idle");
        setLoading(false);
        setSlowStage("normal");
        clearDetectTimers();
      }, DETECT_HARD_TIMEOUT_MS);

      const data = await runDetectRequest(statement, mode, controller.signal);
      if (requestIdRef.current !== requestId) {
        return;
      }

      clearDetectTimers();
      setResult(data);
      setUiState("complete");
      setSlowStage("normal");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (requestIdRef.current === requestId && !didHardTimeout) {
          setError(null);
        }
        return;
      }
      if (requestIdRef.current !== requestId) {
        return;
      }
      clearDetectTimers();
      setResult(null);
      setError(error instanceof Error ? error.message : "Detekcia zlyhala.");
      setUiState("idle");
      setSlowStage("normal");
    } finally {
      if (requestIdRef.current === requestId && !didHardTimeout) {
        clearDetectTimers();
        setLoading(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [clearDetectTimers, runDetectRequest]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearDetectTimers();
    setResult(null);
    setError(null);
    setLoading(false);
    setUiState("idle");
    setSlowStage("normal");
  }, [clearDetectTimers]);

  const restore = useCallback((entry: DetectHistoryEntry) => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearDetectTimers();

    setLoading(false);
    setError(null);
    setResult(entry.response);
    setUiState("complete");
    setSlowStage("normal");
  }, [clearDetectTimers]);

  return {
    result,
    loading,
    error,
    uiState,
    slowStage,
    detect,
    restore,
    reset,
  };
}
