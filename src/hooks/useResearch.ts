"use client";

import { useCallback, useState } from "react";

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
): Promise<ResearchWorkspaceResponse> {
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
  });

  if (!response.ok) {
    throw new Error("Nepodarilo sa načítať prieskum.");
  }

  return (await response.json()) as ResearchWorkspaceResponse;
}

export function useResearch() {
  const [data, setData] = useState<ResearchWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<ResearchRequest | null>(null);

  const open = useCallback(async (request: ResearchRequest) => {
    setLastRequest(request);
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const nextData = await fetchResearch(request);
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nepodarilo sa načítať prieskum.");
    } finally {
      setLoading(false);
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
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    isOpen: loading || Boolean(error) || Boolean(data),
    openStatementResearch,
    openAggregateResearch,
    retry,
    close,
  };
}
