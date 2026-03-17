"use client";

import { useCallback, useState } from "react";

import { mockStatements } from "@/lib/mock-data";
import { DetectMode, DetectResponse, DetectionMatch, Statement } from "@/types";

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
  explanation: string,
): DetectionMatch {
  return {
    statement,
    similarity,
    classification,
    explanation,
  };
}

function createMockResponse(input: string, topK: number): DetectResponse {
  const normalized = input.toLowerCase();
  const statementsById = new Map(mockStatements.map((statement) => [statement.id, statement]));

  const duplicateMatches = [
    buildMatch(
      statementsById.get(14)!,
      0.92,
      "DUPLICATE",
      "Výrok používa takmer rovnaký údaj aj geografické vymedzenie. Pravdepodobne ide o parafrázu už overeného tvrdenia.",
    ),
    buildMatch(
      statementsById.get(15)!,
      0.87,
      "DUPLICATE",
      "Zmysel výroku je zhodný, mení sa len formulácia počtu pediatrov. Existujúce overenie je priamo použiteľné.",
    ),
  ];

  const relatedMatches = [
    buildMatch(
      statementsById.get(11)!,
      0.65,
      "RELATED",
      "Výrok sa týka rovnakého zdravotníckeho problému, ale opisuje ho všeobecnejšie a bez totožnej formulácie.",
    ),
    buildMatch(
      statementsById.get(12)!,
      0.58,
      "RELATED",
      "Tvrdenie pracuje s podobnou témou čakacích lehôt a plánovaných opatrení, no nejde o priamu duplicitu.",
    ),
    buildMatch(
      statementsById.get(13)!,
      0.51,
      "RELATED",
      "Nárok sa tematicky približuje k zahraničnopolitickým výrokom o Ukrajine, ale obsahovo zostáva širší.",
    ),
  ];

  const unrelatedMatches = [
    buildMatch(
      statementsById.get(1)!,
      0.31,
      "UNRELATED",
      "Výrok rieši odlišnú ekonomickú tému bez spoločného skutkového jadra.",
    ),
    buildMatch(
      statementsById.get(7)!,
      0.26,
      "UNRELATED",
      "Zhoda je len v niekoľkých všeobecných slovách, nie v obsahu výroku.",
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
  const [resultMode, setResultMode] = useState<DetectMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (statement: string, mode: DetectMode = "fast") => {
    setLoading(true);
    setError(null);
    setResult(null);
    setResultMode(mode);

    try {
      if (USE_MOCK) {
        await wait(1200);
        setResult(createMockResponse(statement, 10));
        return;
      }

      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement, top_k: 10, mode }),
      });

      if (!response.ok) {
        throw new Error("Detekcia zlyhala.");
      }

      const data: DetectResponse = await response.json();
      setResult(data);
    } catch (error) {
      setResult(null);
      setResultMode(null);
      setError(error instanceof Error ? error.message : "Detekcia zlyhala.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setResultMode(null);
    setError(null);
  }, []);

  return { result, resultMode, loading, error, detect, reset };
}
