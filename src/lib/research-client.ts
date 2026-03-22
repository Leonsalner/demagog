"use client";

import type { ResearchWorkspaceResponse } from "@/types";

export type ResearchRequest =
  | {
      mode: "statement";
      endpoint: "/api/research/statement";
      body: { statement_id: number };
    }
  | {
      mode: "aggregate";
      endpoint: "/api/research/detect";
      body: { statement_ids: number[] };
    };

export interface OpenResearchOptions {
  revealWhenReady?: boolean;
}

export function createStatementResearchRequest(statementId: number): ResearchRequest {
  return {
    mode: "statement",
    endpoint: "/api/research/statement",
    body: { statement_id: statementId },
  };
}

export function createAggregateResearchRequest(statementIds: number[]): ResearchRequest {
  return {
    mode: "aggregate",
    endpoint: "/api/research/detect",
    body: { statement_ids: statementIds },
  };
}

export async function fetchResearch(
  request: ResearchRequest,
  signal?: AbortSignal,
): Promise<ResearchWorkspaceResponse> {
  const timeoutSignal = AbortSignal.timeout(30_000);
  const effectiveSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
    signal: effectiveSignal,
  });

  if (!response.ok) {
    throw new Error("Nepodarilo sa načítať prieskum.");
  }

  return (await response.json()) as ResearchWorkspaceResponse;
}
