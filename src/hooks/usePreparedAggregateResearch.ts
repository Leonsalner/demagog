"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createAggregateResearchRequest,
  fetchResearch,
  type ResearchRequest,
} from "@/lib/research-client";
import type { ResearchWorkspaceResponse } from "@/types";

export type PreparedAggregateResearchStatus = "idle" | "preparing" | "ready" | "error";

export function usePreparedAggregateResearch() {
  const [status, setStatus] = useState<PreparedAggregateResearchStatus>("idle");
  const [data, setData] = useState<ResearchWorkspaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statementIds, setStatementIds] = useState<number[]>([]);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<ResearchRequest | null>(null);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    lastRequestRef.current = null;
    setStatus("idle");
    setData(null);
    setError(null);
    setStatementIds([]);
  }, []);

  const prepare = useCallback(async (nextStatementIds: number[]) => {
    const normalizedStatementIds = Array.from(new Set(nextStatementIds));

    if (normalizedStatementIds.length === 0) {
      reset();
      return;
    }

    const request = createAggregateResearchRequest(normalizedStatementIds);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastRequestRef.current = request;
    setStatementIds(normalizedStatementIds);
    setStatus("preparing");
    setData(null);
    setError(null);

    try {
      const nextData = await fetchResearch(request, controller.signal);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setData(nextData);
      setStatus("ready");
    } catch (nextError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Nepodarilo sa načítať prieskum.");
      setStatus("error");
      setData(null);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [reset]);

  const retry = useCallback(async () => {
    const lastRequest = lastRequestRef.current;
    if (!lastRequest || lastRequest.mode !== "aggregate") {
      return;
    }

    await prepare(lastRequest.body.statement_ids);
  }, [prepare]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  return {
    status,
    data,
    error,
    statementIds,
    prepare,
    retry,
    reset,
  };
}
