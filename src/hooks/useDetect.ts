"use client";

import { useCallback, useRef, useState } from "react";

import { mockStatements } from "@/lib/mock-data";
import { DetectMode, DetectResponse, DetectionMatch, Statement } from "@/types";
import type { DetectHistoryEntry } from "@/types/history";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_DETECT_MOCK === "true";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const detect = useCallback(async (statement: string, mode: DetectMode = "fast") => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 25000);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (USE_MOCK) {
        await wait(1200);
        if (requestIdRef.current !== requestId) {
          return;
        }
        setResult(createMockResponse(statement, 10));
        return;
      }

      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement, top_k: 10, mode }),
        signal: controller.signal,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!response.ok) {
        let message = "Detekcia zlyhala.";
        try {
          const errorBody = await response.json();
          if (
            errorBody &&
            typeof errorBody === "object" &&
            "error" in errorBody &&
            typeof errorBody.error === "string"
          ) {
            message = errorBody.error;
          }
        } catch {
          // ignore malformed error payloads and use the default message
        }
        throw new Error(message);
      }

      const data: DetectResponse = await response.json();
      setResult(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (requestIdRef.current === requestId) {
          setError("Detekcia trvala príliš dlho. Skúste to prosím znova.");
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
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  const restore = useCallback((entry: DetectHistoryEntry) => {
    requestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setLoading(false);
    setError(null);
    setResult(entry.response);
  }, []);

  return { result, loading, error, detect, restore, reset };
}
