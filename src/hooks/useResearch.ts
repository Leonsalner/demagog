"use client";

import { useCallback, useRef, useState } from "react";

import type { ResearchWorkspaceResponse } from "@/types";

type ResearchRequest =
  | {
      endpoint: "/api/research/statement";
      body: { statement_id: number };
    }
  | {
      endpoint: "/api/research/detect";
      body: { statement_ids: number[] };
    };

async function fetchResearch(
  request: ResearchRequest,
  signal?: AbortSignal,
): Promise<ResearchWorkspaceResponse> {
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
    signal,
  });

  if (!response.ok) {
    throw new Error("Nepodarilo sa načítať prieskum.");
  }

  return (await response.json()) as ResearchWorkspaceResponse;
}

export function useResearch() {
  const [data, setData] = useState<ResearchWorkspaceResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<ResearchRequest | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const open = useCallback(async (request: ResearchRequest) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLastRequest(request);
    setIsOpen(true);
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const nextData = await fetchResearch(request, controller.signal);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setData(nextData);
    } catch (nextError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Nepodarilo sa načítať prieskum.");
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const openStatementResearch = useCallback(
    async (statementId: number) => {
      await open({
        endpoint: "/api/research/statement",
        body: { statement_id: statementId },
      });
    },
    [open],
  );

  const openAggregateResearch = useCallback(
    async (statementIds: number[]) => {
      await open({
        endpoint: "/api/research/detect",
        body: { statement_ids: statementIds },
      });
    },
    [open],
  );

  const retry = useCallback(async () => {
    if (!lastRequest) {
      return;
    }

    await open(lastRequest);
  }, [lastRequest, open]);

  const close = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsOpen(false);
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    isOpen,
    loading,
    error,
    openStatementResearch,
    openAggregateResearch,
    retry,
    close,
  };
}
