"use client";

import { useCallback, useRef, useState } from "react";

import {
  createAggregateResearchRequest,
  createStatementResearchRequest,
  fetchResearch,
  type OpenResearchOptions,
  type ResearchRequest,
} from "@/lib/research-client";
import type { ResearchWorkspaceMode, ResearchWorkspaceResponse } from "@/types";

export function useResearch() {
  const [data, setData] = useState<ResearchWorkspaceResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ResearchWorkspaceMode | null>(null);
  const [lastRequest, setLastRequest] = useState<ResearchRequest | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const open = useCallback(async (request: ResearchRequest, options?: OpenResearchOptions) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const revealWhenReady = options?.revealWhenReady ?? true;

    setLastRequest(request);
    setActiveMode(request.mode);
    setIsOpen(revealWhenReady);
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const nextData = await fetchResearch(request, controller.signal);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setData(nextData);
      if (!revealWhenReady) {
        setIsOpen(true);
      }
    } catch (nextError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Nepodarilo sa načítať prieskum.");
      if (!revealWhenReady) {
        setIsOpen(true);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const openStatementResearch = useCallback(
    async (statementId: number, options?: OpenResearchOptions) => {
      await open(createStatementResearchRequest(statementId), options);
    },
    [open],
  );

  const openAggregateResearch = useCallback(
    async (statementIds: number[], options?: OpenResearchOptions) => {
      await open(createAggregateResearchRequest(statementIds), options);
    },
    [open],
  );

  const openPreparedResearch = useCallback(
    (request: ResearchRequest, preparedData: ResearchWorkspaceResponse) => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setLastRequest(request);
      setActiveMode(preparedData.mode);
      setData(preparedData);
      setError(null);
      setLoading(false);
      setIsOpen(true);
    },
    [],
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
    setActiveMode(null);
  }, []);

  return {
    activeMode,
    data,
    isOpen,
    isPendingReveal: loading && !isOpen,
    loading,
    error,
    openStatementResearch,
    openAggregateResearch,
    openPreparedResearch,
    retry,
    close,
  };
}
